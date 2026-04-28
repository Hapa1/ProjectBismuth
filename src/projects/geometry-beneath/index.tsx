import { useCallback, useEffect, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './GeometryBeneath.module.css';

type Mode = 'branching' | 'spiral' | 'tiling';

interface BranchingControls {
  depth: number;
  angleDeg: number;
  ratio: number;
  branches: number;
  jitter: number;
  seed: number;
}

interface SpiralControls {
  count: number;
  angleDeg: number;
  scale: number;
  dotSize: number;
}

interface TilingControls {
  cellSize: number;
  jitter: number;
  edgeAlpha: number;
  fillBrightness: number;
  seed: number;
}

interface Controls {
  mode: Mode;
  iridescent: boolean;
  branching: BranchingControls;
  spiral: SpiralControls;
  tiling: TilingControls;
}

const DEFAULTS: Controls = {
  mode: 'branching',
  iridescent: true,
  branching: {
    depth: 8,
    angleDeg: 24,
    ratio: 0.72,
    branches: 2,
    jitter: 0.15,
    seed: 1,
  },
  spiral: {
    count: 800,
    angleDeg: 137.5,
    scale: 6,
    dotSize: 3,
  },
  tiling: {
    cellSize: 36,
    jitter: 0.08,
    edgeAlpha: 0.85,
    fillBrightness: 14,
    seed: 1,
  },
};

const TAGLINES: Record<Mode, string> = {
  branching: 'Repetition across scale — a small branch looks like the whole tree.',
  spiral: 'Growth and proportion — slide the angle to see why nature settled on 137.5°.',
  tiling: 'Symmetry and tiling — honeycombs, dried mud, and cells use the same packing.',
};

const SEGMENT_CAP = 60_000;

// ---------------------------------------------------------------------------
// Iridescent color — smooth cosine-palette gradient (violet ↔ teal ↔ blush)
// ---------------------------------------------------------------------------

function iridescentColor(
  px: number,
  py: number,
  w: number,
  h: number,
): [number, number, number] {
  // Normalised position with gentle spatial variation
  const nx = px / w;
  const ny = py / h;
  const t =
    nx * 0.55 +
    ny * 0.45 +
    Math.sin(nx * 3.1) * 0.08 +
    Math.sin(ny * 2.7) * 0.06;

  // Cosine palette: color(t) = a + b * cos(2π(c*t + d))
  // Tuned for a narrow violet → teal → warm-blush band
  const TAU = Math.PI * 2;
  const r = 0.62 + 0.28 * Math.cos(TAU * (0.72 * t + 0.00));
  const g = 0.54 + 0.22 * Math.cos(TAU * (0.72 * t + 0.35));
  const b = 0.78 + 0.18 * Math.cos(TAU * (0.72 * t + 0.58));

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ];
}

function mulberry32(a: number): () => number {
  let t = a >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

interface BranchStats {
  segments: number;
  capped: boolean;
}

function drawBranching(
  p: P5,
  width: number,
  height: number,
  c: BranchingControls,
  iridescent: boolean,
): BranchStats {
  p.background(8, 9, 12);
  const stats: BranchStats = { segments: 0, capped: false };
  const rand = mulberry32(c.seed);
  const halfAngle = (c.angleDeg * Math.PI) / 180;
  const initialLength = Math.min(width, height) * 0.32;
  const ctx = (p.drawingContext as CanvasRenderingContext2D);

  // Collect segments first, then draw in two passes (halo + core) for glow.
  const segments: Array<{
    x1: number; y1: number; x2: number; y2: number;
    sw: number; r: number; g: number; b: number;
  }> = [];

  function recur(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
  ) {
    if (stats.capped) return;
    if (depth <= 0 || length < 0.6) return;
    if (stats.segments >= SEGMENT_CAP) {
      stats.capped = true;
      return;
    }
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const sw = Math.max(0.4, depth * 0.55);
    let sr: number, sg: number, sb: number;
    if (iridescent) {
      const mx = (x + x2) * 0.5;
      const my = (y + y2) * 0.5;
      [sr, sg, sb] = iridescentColor(mx, my, width, height);
    } else {
      sr = 232; sg = 234; sb = 240;
    }
    segments.push({ x1: x, y1: y, x2, y2, sw, r: sr, g: sg, b: sb });
    stats.segments++;

    const n = c.branches;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const base = -halfAngle + t * 2 * halfAngle;
      const jitter = (rand() - 0.5) * 2 * c.jitter * halfAngle;
      recur(x2, y2, angle + base + jitter, length * c.ratio, depth - 1);
    }
  }

  const startX = width / 2;
  const startY = height - height * 0.06;
  recur(startX, startY, -Math.PI / 2, initialLength, c.depth);

  if (iridescent) {
    // Pass 1: wide soft halo with canvas shadowBlur
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const seg of segments) {
      const color = `rgba(${seg.r | 0},${seg.g | 0},${seg.b | 0},0.25)`;
      ctx.shadowColor = `rgb(${seg.r | 0},${seg.g | 0},${seg.b | 0})`;
      ctx.shadowBlur = 18 + seg.sw * 4;
      ctx.strokeStyle = color;
      ctx.lineWidth = seg.sw * 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();

    // Pass 2: bright narrow core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0;
    for (const seg of segments) {
      ctx.strokeStyle = `rgba(${seg.r | 0},${seg.g | 0},${seg.b | 0},0.9)`;
      ctx.lineWidth = seg.sw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    for (const seg of segments) {
      p.stroke(seg.r, seg.g, seg.b, 235);
      p.strokeWeight(seg.sw);
      p.line(seg.x1, seg.y1, seg.x2, seg.y2);
    }
  }

  return stats;
}

function drawSpiral(p: P5, width: number, height: number, c: SpiralControls, iridescent: boolean) {
  p.background(8, 9, 12);
  const cx = width / 2;
  const cy = height / 2;
  const radians = (c.angleDeg * Math.PI) / 180;
  const maxR = Math.min(width, height) * 0.46;
  let maxNeeded = 0;
  for (let i = 0; i < c.count; i++) {
    const r = c.scale * Math.sqrt(i);
    if (r > maxNeeded) maxNeeded = r;
  }
  const fit = maxNeeded > maxR ? maxR / maxNeeded : 1;

  if (iridescent) {
    const ctx = (p.drawingContext as CanvasRenderingContext2D);

    // Pass 1: soft halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < c.count; i++) {
      const r = c.scale * Math.sqrt(i) * fit;
      const a = i * radians;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const [cr, cg, cb] = iridescentColor(x, y, width, height);
      const color = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 + c.dotSize * 2;
      ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, c.dotSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Pass 2: bright core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0;
    for (let i = 0; i < c.count; i++) {
      const r = c.scale * Math.sqrt(i) * fit;
      const a = i * radians;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const [cr, cg, cb] = iridescentColor(x, y, width, height);
      ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},0.95)`;
      ctx.beginPath();
      ctx.arc(x, y, c.dotSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    p.noStroke();
    for (let i = 0; i < c.count; i++) {
      const r = c.scale * Math.sqrt(i) * fit;
      const a = i * radians;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      p.fill(232, 234, 240, 235);
      p.circle(x, y, c.dotSize);
    }
  }
}

function drawTiling(p: P5, width: number, height: number, c: TilingControls, iridescent: boolean) {
  const fillVal = Math.max(0, Math.min(60, c.fillBrightness));
  p.background(8, 9, 12);

  const r = Math.max(8, c.cellSize);
  const w = Math.sqrt(3) * r;
  const h = 1.5 * r;

  const rand = mulberry32(c.seed);
  const jitterCache = new Map<string, number>();
  function jitterFor(key: string): number {
    let v = jitterCache.get(key);
    if (v === undefined) {
      v = rand();
      jitterCache.set(key, v);
    }
    return v;
  }

  const cols = Math.ceil(width / w) + 2;
  const rows = Math.ceil(height / h) + 2;

  // Collect hex data so we can draw glow in two passes
  const hexes: Array<{
    cx: number; cy: number;
    verts: Array<[number, number]>;
    er: number; eg: number; eb: number;
  }> = [];

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * w + (row % 2 === 0 ? 0 : w / 2);
      const cy = row * h;
      const verts: Array<[number, number]> = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 2;
        const j1 = jitterFor(`${col},${row},${k},x`) - 0.5;
        const j2 = jitterFor(`${col},${row},${k},y`) - 0.5;
        const dx = j1 * c.jitter * r;
        const dy = j2 * c.jitter * r;
        verts.push([cx + Math.cos(a) * r + dx, cy + Math.sin(a) * r + dy]);
      }

      let er: number, eg: number, eb: number;
      if (iridescent) {
        [er, eg, eb] = iridescentColor(cx, cy, width, height);
      } else {
        er = 167; eg = 139; eb = 250;
      }
      hexes.push({ cx, cy, verts, er, eg, eb });
    }
  }

  // Draw fills
  p.noStroke();
  for (const hex of hexes) {
    p.fill(fillVal, fillVal, fillVal + 4);
    p.beginShape();
    for (const [vx, vy] of hex.verts) p.vertex(vx, vy);
    p.endShape(p.CLOSE);
  }

  if (iridescent) {
    const ctx = (p.drawingContext as CanvasRenderingContext2D);
    const alpha = Math.round(c.edgeAlpha * 255);

    // Pass 1: wide soft glow edges
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const hex of hexes) {
      const color = `rgb(${hex.er | 0},${hex.eg | 0},${hex.eb | 0})`;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = `rgba(${hex.er | 0},${hex.eg | 0},${hex.eb | 0},${(alpha / 255 * 0.35).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < hex.verts.length; k++) {
        const [vx, vy] = hex.verts[k];
        if (k === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // Pass 2: bright narrow core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0;
    for (const hex of hexes) {
      ctx.strokeStyle = `rgba(${hex.er | 0},${hex.eg | 0},${hex.eb | 0},${(alpha / 255 * 0.85).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < hex.verts.length; k++) {
        const [vx, vy] = hex.verts[k];
        if (k === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  } else {
    p.noFill();
    p.stroke(167, 139, 250, Math.round(c.edgeAlpha * 255));
    p.strokeWeight(1);
    for (const hex of hexes) {
      p.beginShape();
      for (const [vx, vy] of hex.verts) p.vertex(vx, vy);
      p.endShape(p.CLOSE);
    }
  }
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function SliderControl({ label, min, max, step, value, onChange, format }: SliderProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {format ? format(value) : value.toFixed(step < 1 ? 2 : 0)}
      </span>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function GeometryBeneath({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const controlsRef = useRef<Controls>(controls);
  const sizeRef = useRef({ width, height });
  const [branchStats, setBranchStats] = useState<BranchStats>({ segments: 0, capped: false });
  const lastReportedRef = useRef<BranchStats>({ segments: 0, capped: false });

  useEffect(() => {
    controlsRef.current = controls;
    sketchRef.current?.redraw();
  }, [controls]);

  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const host = hostRef.current;
      if (!host || sketchRef.current) return;
      const p5Module = await import('p5');
      if (cancelled || !hostRef.current) return;
      const P5Constructor = p5Module.default;

      const sketch = (p: P5) => {
        p.setup = () => {
          const { width: w, height: h } = sizeRef.current;
          p.createCanvas(w, h);
          p.pixelDensity(Math.min(window.devicePixelRatio, 2));
          p.noLoop();
        };

        p.draw = () => {
          const { width: w, height: h } = sizeRef.current;
          const c = controlsRef.current;
          if (c.mode === 'branching') {
            const stats = drawBranching(p, w, h, c.branching, c.iridescent);
            const last = lastReportedRef.current;
            if (stats.segments !== last.segments || stats.capped !== last.capped) {
              lastReportedRef.current = stats;
              setBranchStats(stats);
            }
          } else if (c.mode === 'spiral') {
            drawSpiral(p, w, h, c.spiral, c.iridescent);
          } else {
            drawTiling(p, w, h, c.tiling, c.iridescent);
          }
        };
      };

      sketchRef.current = new P5Constructor(sketch, host);
      // Initial draw after p5 setup completes
      requestAnimationFrame(() => sketchRef.current?.redraw());
    }

    void start();

    return () => {
      cancelled = true;
      sketchRef.current?.remove();
      sketchRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = sketchRef.current;
    if (!instance) return;
    instance.resizeCanvas(width, height);
    instance.redraw();
  }, [width, height]);

  const setMode = useCallback((mode: Mode) => {
    setControls((prev) => ({ ...prev, mode }));
  }, []);

  const randomize = useCallback(() => {
    setControls((prev) => {
      const next = { ...prev };
      const seed = Math.floor(Math.random() * 0xffffffff);
      if (prev.mode === 'branching') {
        next.branching = { ...prev.branching, seed };
      } else if (prev.mode === 'tiling') {
        next.tiling = { ...prev.tiling, seed };
      } else {
        next.spiral = {
          ...prev.spiral,
          angleDeg: 130 + Math.random() * 15,
        };
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setControls((prev) => ({ ...DEFAULTS, mode: prev.mode }));
  }, []);

  return (
    <div className={styles.root}>
      <div ref={hostRef} className={styles.canvasHost} />

      <aside className={styles.panel} aria-label="Geometry Beneath Everything controls">
        <h3 className={styles.panelTitle}>The Geometry Beneath Everything</h3>
        <p className={styles.tagline}>{TAGLINES[controls.mode]}</p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Pillar</p>
          <select
            className={styles.select}
            value={controls.mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            aria-label="Pillar"
          >
            <option value="branching">1 — Repetition (branching)</option>
            <option value="spiral">2 — Growth (spiral)</option>
            <option value="tiling">3 — Tiling (honeycomb)</option>
          </select>
        </section>

        <section className={styles.section}>
          <label className={styles.toggleRow}>
            <span className={styles.label}>Iridescent</span>
            <input
              type="checkbox"
              className={styles.toggle}
              checked={controls.iridescent}
              onChange={(e) =>
                setControls((prev) => ({ ...prev, iridescent: e.target.checked }))
              }
            />
          </label>
        </section>

        {controls.mode === 'branching' && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Branching</p>
            <SliderControl
              label="Depth"
              min={1}
              max={10}
              step={1}
              value={controls.branching.depth}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, depth: v } }))
              }
            />
            <SliderControl
              label="Branch angle"
              min={10}
              max={60}
              step={1}
              value={controls.branching.angleDeg}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, angleDeg: v } }))
              }
              format={(v) => `${v.toFixed(0)}°`}
            />
            <SliderControl
              label="Length ratio"
              min={0.5}
              max={0.85}
              step={0.01}
              value={controls.branching.ratio}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, ratio: v } }))
              }
            />
            <SliderControl
              label="Branches / node"
              min={2}
              max={4}
              step={1}
              value={controls.branching.branches}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, branches: v } }))
              }
            />
            <SliderControl
              label="Jitter"
              min={0}
              max={0.5}
              step={0.01}
              value={controls.branching.jitter}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, jitter: v } }))
              }
            />
            <p className={styles.note}>
              Segments: {branchStats.segments.toLocaleString()}
              {branchStats.capped ? ` (capped at ${SEGMENT_CAP.toLocaleString()})` : ''}
            </p>
          </section>
        )}

        {controls.mode === 'spiral' && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Spiral</p>
            <SliderControl
              label="Seed count"
              min={50}
              max={2000}
              step={10}
              value={controls.spiral.count}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, count: v } }))
              }
            />
            <SliderControl
              label="Angle"
              min={130}
              max={145}
              step={0.1}
              value={controls.spiral.angleDeg}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, angleDeg: v } }))
              }
              format={(v) => `${v.toFixed(1)}°`}
            />
            <SliderControl
              label="Scale"
              min={1}
              max={14}
              step={0.1}
              value={controls.spiral.scale}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, scale: v } }))
              }
            />
            <SliderControl
              label="Dot size"
              min={1}
              max={8}
              step={0.5}
              value={controls.spiral.dotSize}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, dotSize: v } }))
              }
            />
            <p className={styles.note}>
              The golden angle is 137.5°. Slide off and back to see the packing collapse and recover.
            </p>
          </section>
        )}

        {controls.mode === 'tiling' && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Tiling</p>
            <SliderControl
              label="Cell size"
              min={12}
              max={80}
              step={1}
              value={controls.tiling.cellSize}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, cellSize: v } }))
              }
              format={(v) => `${v.toFixed(0)} px`}
            />
            <SliderControl
              label="Jitter"
              min={0}
              max={0.4}
              step={0.01}
              value={controls.tiling.jitter}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, jitter: v } }))
              }
            />
            <SliderControl
              label="Edge highlight"
              min={0}
              max={1}
              step={0.05}
              value={controls.tiling.edgeAlpha}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, edgeAlpha: v } }))
              }
            />
            <SliderControl
              label="Fill brightness"
              min={0}
              max={60}
              step={1}
              value={controls.tiling.fillBrightness}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, fillBrightness: v } }))
              }
            />
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.buttonRow}>
            <button className={styles.button} type="button" onClick={randomize}>
              Randomize
            </button>
            <button className={styles.button} type="button" onClick={reset}>
              Reset
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

export default GeometryBeneath;
