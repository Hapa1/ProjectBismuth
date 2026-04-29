import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import { CollapsiblePanel } from '../../lib/controls';
import styles from './IsoBlocks.module.css';
import { Wfc3D } from './wfc3d';
import { BLOCKS, type BlockId } from './tiles';

interface Controls {
  gridSize: number;
  height: number;
  stepsPerFrame: number;
  autoRestart: boolean;
  paused: boolean;
}

const DEFAULT_CONTROLS: Controls = {
  gridSize: 14,
  height: 6,
  stepsPerFrame: 18,
  autoRestart: true,
  paused: false,
};

interface RenderOrderEntry {
  index: number;
  x: number;
  y: number;
  z: number;
}

interface SketchState {
  wfc: Wfc3D;
  tileW: number;
  tileH: number;
  zHeight: number;
  originX: number;
  originY: number;
  order: RenderOrderEntry[];
  signature: string;
}

/** Iridescent cosine palette (Iñigo Quilez form). Returns 0..1 RGB. */
function cosinePalette(t: number): [number, number, number] {
  const TAU = Math.PI * 2;
  return [
    Math.max(0, Math.min(1, 0.55 + 0.45 * Math.cos(TAU * (1.0 * t + 0.0)))),
    Math.max(0, Math.min(1, 0.5 + 0.45 * Math.cos(TAU * (1.0 * t + 0.33)))),
    Math.max(0, Math.min(1, 0.6 + 0.45 * Math.cos(TAU * (1.0 * t + 0.67)))),
  ];
}

interface BlockColors {
  top: string;
  right: string;
  left: string;
}

function shadeForBlock(
  id: BlockId,
  x: number,
  y: number,
  z: number,
  time: number,
): BlockColors {
  switch (id) {
    case 'stone':
      return { top: '#4a4d56', right: '#393b43', left: '#292b32' };
    case 'dirt':
      return { top: '#6b5439', right: '#534026', left: '#3c2d18' };
    case 'crystal': {
      const t = (x * 0.13 + y * 0.17 + z * 0.21) + time * 0.08;
      const [r, g, b] = cosinePalette(t * 0.4 + 0.55);
      const top = `rgb(${(r * 200) | 0}, ${(g * 160) | 0}, ${(b * 230) | 0})`;
      const right = `rgb(${(r * 140) | 0}, ${(g * 110) | 0}, ${(b * 180) | 0})`;
      const left = `rgb(${(r * 90) | 0}, ${(g * 70) | 0}, ${(b * 130) | 0})`;
      return { top, right, left };
    }
    case 'bismuth': {
      const t = (x * 0.25 + y * 0.31 + z * 0.4) * 0.5 + time * 0.18;
      const [r, g, b] = cosinePalette(t);
      const top = `rgb(${(r * 255) | 0}, ${(g * 240) | 0}, ${(b * 255) | 0})`;
      const right = `rgb(${(r * 180) | 0}, ${(g * 170) | 0}, ${(b * 200) | 0})`;
      const left = `rgb(${(r * 110) | 0}, ${(g * 100) | 0}, ${(b * 140) | 0})`;
      return { top, right, left };
    }
    default:
      return { top: '#222', right: '#1a1a1a', left: '#111' };
  }
}

function buildState(controls: Controls, width: number, height: number): SketchState {
  const W = controls.gridSize;
  const D = controls.gridSize;
  const H = controls.height;
  const wfc = new Wfc3D({ width: W, depth: D, height: H });

  // Fit the iso footprint to the canvas.
  const isoW = W + D; // diamonds wide
  const isoH = (W + D) / 2 + H * 1.0; // approx vertical units
  const fitW = (width * 0.9) / isoW;
  const fitH = (height * 0.9) / isoH;
  const tileW = Math.max(8, Math.floor(Math.min(fitW * 2, fitH * 2)));
  const tileH = Math.floor(tileW * 0.5);
  const zHeight = Math.floor(tileH * 1.05);

  const originX = Math.floor(width / 2);
  const originY = Math.floor(
    height / 2 - ((W + D) * tileH) / 4 + (H * zHeight) / 2,
  );

  // Painter's-order list: ascending by (z, x+y), so deeper/higher cells render after.
  const order: RenderOrderEntry[] = [];
  for (let z = 0; z < H; z++) {
    for (let y = 0; y < D; y++) {
      for (let x = 0; x < W; x++) {
        order.push({ index: wfc.idx(x, y, z), x, y, z });
      }
    }
  }
  order.sort((a, b) => {
    if (a.z !== b.z) return a.z - b.z;
    return a.x + a.y - (b.x + b.y);
  });

  return {
    wfc,
    tileW,
    tileH,
    zHeight,
    originX,
    originY,
    order,
    signature: `${W}x${D}x${H}:${width}x${height}`,
  };
}

function drawIsoCube(
  p: P5,
  sx: number,
  sy: number,
  tileW: number,
  tileH: number,
  zHeight: number,
  colors: BlockColors,
  alpha: number,
) {
  const tw = tileW / 2;
  const th = tileH / 2;
  const a = Math.max(0, Math.min(1, alpha)) * 255;

  p.noStroke();

  // Right face (parallelogram, mid shade).
  const rc = p.color(colors.right);
  rc.setAlpha(a);
  p.fill(rc);
  p.beginShape();
  p.vertex(sx, sy + th);
  p.vertex(sx + tw, sy);
  p.vertex(sx + tw, sy + zHeight);
  p.vertex(sx, sy + th + zHeight);
  p.endShape(p.CLOSE);

  // Left face.
  const lc = p.color(colors.left);
  lc.setAlpha(a);
  p.fill(lc);
  p.beginShape();
  p.vertex(sx, sy + th);
  p.vertex(sx - tw, sy);
  p.vertex(sx - tw, sy + zHeight);
  p.vertex(sx, sy + th + zHeight);
  p.endShape(p.CLOSE);

  // Top face (diamond).
  const tc = p.color(colors.top);
  tc.setAlpha(a);
  p.fill(tc);
  p.beginShape();
  p.vertex(sx, sy - th);
  p.vertex(sx + tw, sy);
  p.vertex(sx, sy + th);
  p.vertex(sx - tw, sy);
  p.endShape(p.CLOSE);
}

function renderSketch(
  p: P5,
  state: SketchState,
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
) {
  // Background gradient.
  p.noStroke();
  p.fill('#06070a');
  p.rect(0, 0, width, height);

  const { wfc, tileW, tileH, zHeight, originX, originY, order } = state;
  const now = performance.now();

  for (const { index, x, y, z } of order) {
    const cell = wfc.cells[index];
    if (!cell.collapsed && cell.options.length > 1) continue;
    const blockIdx = cell.options[0];
    if (blockIdx === undefined) continue;
    const block = BLOCKS[blockIdx];
    if (!block.visible) continue;

    const sx = originX + (x - y) * (tileW / 2);
    const sy = originY + (x + y) * (tileH / 2) - z * zHeight;

    // Skip cells fully off-screen.
    if (sx < -tileW || sx > width + tileW) continue;
    if (sy < -zHeight * 2 || sy > height + zHeight * 2) continue;

    const fadeMs = reducedMotion ? 0 : 220;
    const elapsed = cell.collapsedAt < 0 ? fadeMs : now - cell.collapsedAt;
    const alpha = fadeMs <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / fadeMs));

    const colors = shadeForBlock(block.id, x, y, z, time);
    drawIsoCube(p, sx, sy, tileW, tileH, zHeight, colors, alpha);
  }
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
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

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleControl({ label, checked, onChange }: ToggleProps) {
  return (
    <label className={styles.toggleRow}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.checkbox}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function IsoBlocksProject({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const controlsRef = useRef<Controls>(controls);
  const stateRef = useRef<SketchState | null>(null);
  const sizeRef = useRef({ width, height });
  const generationRef = useRef(0);
  const [status, setStatus] = useState<'running' | 'done' | 'failed'>('running');
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const restart = useCallback(() => {
    generationRef.current += 1;
    setStatus('running');
  }, []);

  useEffect(() => {
    restart();
  }, [controls.gridSize, controls.height, restart]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const host = hostRef.current;
      if (!host || sketchRef.current) return;
      const p5Module = await import('p5');
      if (cancelled || !hostRef.current) return;
      const P5Constructor = p5Module.default;

      let lastGen = -1;
      let lastReportedStatus: 'running' | 'done' | 'failed' = 'running';
      let startTime = performance.now();

      const sketch = (p: P5) => {
        p.setup = () => {
          const { width: w, height: h } = sizeRef.current;
          p.createCanvas(w, h);
          p.pixelDensity(Math.min(window.devicePixelRatio, 2));
        };

        p.draw = () => {
          const { width: w, height: h } = sizeRef.current;
          const ctrl = controlsRef.current;
          const wantSig = `${ctrl.gridSize}x${ctrl.gridSize}x${ctrl.height}:${w}x${h}`;

          if (
            !stateRef.current ||
            stateRef.current.signature !== wantSig ||
            lastGen !== generationRef.current
          ) {
            stateRef.current = buildState(ctrl, w, h);
            lastGen = generationRef.current;
            startTime = performance.now();
            if (lastReportedStatus !== 'running') {
              lastReportedStatus = 'running';
              setStatus('running');
            }
          }

          const state = stateRef.current;
          if (!ctrl.paused) {
            for (let i = 0; i < ctrl.stepsPerFrame; i++) {
              if (!state.wfc.step()) break;
              if (state.wfc.failed) {
                if (ctrl.autoRestart) generationRef.current += 1;
                break;
              }
              if (state.wfc.done) break;
            }
          }

          const time = (performance.now() - startTime) / 1000;
          renderSketch(p, state, w, h, time, reducedMotionRef.current);

          let next: 'running' | 'done' | 'failed' = 'running';
          if (state.wfc.failed) next = 'failed';
          else if (state.wfc.done) next = 'done';
          if (next !== lastReportedStatus) {
            lastReportedStatus = next;
            setStatus(next);
          }
        };
      };

      sketchRef.current = new P5Constructor(sketch, host);
    }

    void start();

    return () => {
      cancelled = true;
      sketchRef.current?.remove();
      sketchRef.current = null;
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = sketchRef.current;
    if (!instance) return;
    instance.resizeCanvas(width, height);
  }, [width, height]);

  const cellCount = useMemo(
    () => controls.gridSize * controls.gridSize * controls.height,
    [controls.gridSize, controls.height],
  );

  return (
    <div className={styles.root}>
      <div ref={hostRef} className={styles.canvasHost} />

      <CollapsiblePanel className={styles.panel} ariaLabel="Isometric WFC controls">
        <h3 className={styles.panelTitle}>Iso Blocks · WFC</h3>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Voxel Grid</p>
          <SliderControl
            label="Footprint"
            min={6}
            max={22}
            step={1}
            value={controls.gridSize}
            onChange={(value) => setControls((prev) => ({ ...prev, gridSize: value }))}
            format={(v) => `${v}×${v}`}
          />
          <SliderControl
            label="Height"
            min={3}
            max={10}
            step={1}
            value={controls.height}
            onChange={(value) => setControls((prev) => ({ ...prev, height: value }))}
          />
          <SliderControl
            label="Steps / Frame"
            min={1}
            max={80}
            step={1}
            value={controls.stepsPerFrame}
            onChange={(value) => setControls((prev) => ({ ...prev, stepsPerFrame: value }))}
          />
          <div className={styles.statusRow} style={{ marginTop: '0.4rem' }}>
            <span className={styles.statusBadge}>{cellCount} cells</span>
            <span className={styles.statusBadge} data-state={status}>
              {status}
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Behavior</p>
          <ToggleControl
            label="Pause"
            checked={controls.paused}
            onChange={(checked) => setControls((prev) => ({ ...prev, paused: checked }))}
          />
          <ToggleControl
            label="Auto-restart on contradiction"
            checked={controls.autoRestart}
            onChange={(checked) => setControls((prev) => ({ ...prev, autoRestart: checked }))}
          />
        </section>

        <section className={styles.section}>
          <div className={styles.buttonRow}>
            <button className={styles.button} type="button" onClick={restart}>
              Restart
            </button>
            <button
              className={styles.button}
              type="button"
              onClick={() => setControls((prev) => ({ ...prev, paused: !prev.paused }))}
            >
              {controls.paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </section>
      </CollapsiblePanel>
    </div>
  );
}

export default IsoBlocksProject;
