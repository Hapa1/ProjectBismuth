import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type P5 from 'p5';
import type { Image as P5Image } from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './MonumentValley.module.css';
import {
  BASE_TILES,
  buildLayerIndices,
  buildVariantCatalog,
  type LayerIndices,
  type TileVariant,
} from './tiles';
import { Wfc2D } from './wfc';

const TILESET_URL = '/images/Gemini_Generated_Image_g5aq3kg5aq3kg5aq.png';
const SHEET_COLS = 6;
const SHEET_ROWS = 4;
const TRIM_PX = 2;

interface Controls {
  gridSize: number;
  stepsPerFrame: number;
  paused: boolean;
  autoRestart: boolean;
}

const DEFAULT_CONTROLS: Controls = {
  gridSize: 12,
  stepsPerFrame: 24,
  paused: false,
  autoRestart: true,
};

type Phase = 'loading' | 'collapsing-ground' | 'collapsing-mid' | 'collapsing-top' | 'walking' | 'failed';

interface SceneState {
  signature: string;
  catalog: readonly TileVariant[];
  layerIdx: LayerIndices;
  ground: Wfc2D;
  mid: Wfc2D | null;
  top: Wfc2D | null;
  collapsedGround: number[] | null;
  collapsedMid: number[] | null;
  collapsedTop: number[] | null;
  phase: Phase;
  tileW: number;
  tileH: number;
  layerHeight: number;
  originX: number;
  originY: number;
  doneTime: number;
}

interface SpriteCache {
  /** Sprite sliced from the source sheet, indexed by sourceIndex 0..23. */
  source: P5Image[];
  cellW: number;
  cellH: number;
}

function buildCellBias(
  width: number,
  depth: number,
  variants: readonly TileVariant[],
  layerIndices: readonly number[],
  emptyIndex: number,
): ReadonlyArray<ReadonlyMap<number, number>> {
  // Edge cells favour empty + plain floors. Center favours feature tiles.
  const bias: Map<number, number>[] = [];
  for (let y = 0; y < depth; y++) {
    for (let x = 0; x < width; x++) {
      const m = new Map<number, number>();
      const edgeDist = Math.min(x, y, width - 1 - x, depth - 1 - y);
      const isEdge = edgeDist <= 1;
      for (const idx of layerIndices) {
        const v = variants[idx];
        if (idx === emptyIndex) {
          m.set(idx, isEdge ? 2.5 : 1.0);
        } else if (v.baseId === 'floor-plain') {
          m.set(idx, isEdge ? 2.0 : 1.0);
        } else if (v.baseId === 'dais-stepped') {
          m.set(idx, isEdge ? 0.2 : 1.4);
        } else if (
          v.baseId === 'temple-balcony' ||
          v.baseId === 'tower-crenel' ||
          v.baseId === 'balcony-curve' ||
          v.baseId === 'balcony-square' ||
          v.baseId === 'cantilever'
        ) {
          m.set(idx, isEdge ? 0.4 : 1.5);
        }
      }
      bias.push(m);
    }
  }
  return bias;
}

function fitGeometry(width: number, height: number, gridSize: number) {
  const isoW = gridSize * 2;
  const isoH = gridSize + 3; // plus head room for layers
  const fitW = (width * 0.92) / isoW;
  const fitH = (height * 0.92) / isoH;
  const tileW = Math.max(16, Math.floor(Math.min(fitW * 2, fitH * 2)));
  const tileH = Math.floor(tileW * 0.5);
  // Mid layer is rendered at level=0 (sprites already encode cube body);
  // top layer lifts by one cube-height worth.
  const layerHeight = Math.floor(tileH * 1.0);
  const originX = Math.floor(width / 2);
  const originY = Math.floor(
    height / 2 - (gridSize * tileH) / 2 + layerHeight,
  );
  return { tileW, tileH, layerHeight, originX, originY };
}

function snapshotCollapsed(wfc: Wfc2D): number[] {
  const out: number[] = new Array(wfc.cells.length);
  for (let i = 0; i < wfc.cells.length; i++) {
    out[i] = wfc.cells[i].options[0] ?? -1;
  }
  return out;
}

function buildSpriteCache(_p: P5, image: P5Image): SpriteCache {
  const cellW = Math.floor(image.width / SHEET_COLS);
  const cellH = Math.floor(image.height / SHEET_ROWS);
  const source: P5Image[] = [];
  for (let row = 0; row < SHEET_ROWS; row++) {
    for (let col = 0; col < SHEET_COLS; col++) {
      const sub = image.get(
        col * cellW + TRIM_PX,
        row * cellH + TRIM_PX,
        cellW - TRIM_PX * 2,
        cellH - TRIM_PX * 2,
      );
      keyOutBackground(sub);
      source.push(sub);
    }
  }
  return { source, cellW: cellW - TRIM_PX * 2, cellH: cellH - TRIM_PX * 2 };
}/**
 * The source sheet has a cream background per cell. Remove it via a flood-fill
 * seeded from the four corners — only the contiguous outer region is keyed
 * out, so cream-coloured interior pixels (cube tops, ornaments) are preserved.
 */
function keyOutBackground(img: P5Image): void {
  img.loadPixels();
  const px = img.pixels;
  if (!px || px.length === 0) return;
  const w = img.width;
  const h = img.height;

  // Corner-sample average → reference colour.
  const sample = (x: number, y: number): [number, number, number] => {
    const i = (y * w + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };
  const corners = [sample(1, 1), sample(w - 2, 1), sample(1, h - 2), sample(w - 2, h - 2)];
  let br = 0;
  let bg = 0;
  let bb = 0;
  for (const c of corners) {
    br += c[0];
    bg += c[1];
    bb += c[2];
  }
  br /= 4;
  bg /= 4;
  bb /= 4;

  const tolHard = 24; // within → definitely background
  const tolSoft = 44; // within → soft edge

  const matches = (i: number): number => {
    const dr = px[i] - br;
    const dg = px[i + 1] - bg;
    const db = px[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= tolHard) return 1;
    if (dist <= tolSoft) return (tolSoft - dist) / (tolSoft - tolHard);
    return 0;
  };

  // BFS flood fill from each corner over pixels matching the background.
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const seeds: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  for (const [sx, sy] of seeds) {
    const idx = sy * w + sx;
    if (!visited[idx] && matches(idx * 4) > 0) {
      stack.push(idx);
      visited[idx] = 1;
    }
  }
  while (stack.length) {
    const idx = stack.pop() as number;
    const px4 = idx * 4;
    const m = matches(px4);
    if (m >= 1) {
      px[px4 + 3] = 0;
    } else {
      px[px4 + 3] = Math.round(px[px4 + 3] * (1 - m));
    }
    const x = idx % w;
    const y = (idx - x) / w;
    const neighbours = [
      x > 0 ? idx - 1 : -1,
      x < w - 1 ? idx + 1 : -1,
      y > 0 ? idx - w : -1,
      y < h - 1 ? idx + w : -1,
    ];
    for (const ni of neighbours) {
      if (ni < 0 || visited[ni]) continue;
      if (matches(ni * 4) > 0) {
        visited[ni] = 1;
        stack.push(ni);
      }
    }
  }

  img.updatePixels();
}

function getVariantSprite(
  cache: SpriteCache,
  variant: TileVariant,
): P5Image | null {
  const base = variant.base;
  if (variant.rotation === 2 && base.pairedSourceIndex !== undefined) {
    return cache.source[base.pairedSourceIndex];
  }
  if (base.sourceIndex == null) return null;
  return cache.source[base.sourceIndex];
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

function MonumentValleyProject({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const controlsRef = useRef<Controls>(controls);
  const sceneRef = useRef<SceneState | null>(null);
  const sizeRef = useRef({ width, height });
  const generationRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const spritesRef = useRef<SpriteCache | null>(null);
  const imageRef = useRef<P5Image | null>(null);
  const catalogRef = useRef<readonly TileVariant[] | null>(null);
  const layerIdxRef = useRef<LayerIndices | null>(null);

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
  }, []);

  useEffect(() => {
    restart();
  }, [controls.gridSize, restart]);

  // Build the variant catalog once.
  useEffect(() => {
    const catalog = buildVariantCatalog();
    catalogRef.current = catalog;
    layerIdxRef.current = buildLayerIndices(catalog);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let lastGen = -1;

    async function start() {
      const host = hostRef.current;
      if (!host || sketchRef.current) return;
      const p5Module = await import('p5');
      if (cancelled || !hostRef.current) return;
      const P5Constructor = p5Module.default;

      const sketch = (p: P5) => {
        p.preload = () => {
          const img = p.loadImage(TILESET_URL);
          imageRef.current = img;
        };

        p.setup = () => {
          const { width: w, height: h } = sizeRef.current;
          p.createCanvas(w, h);
          p.pixelDensity(Math.min(window.devicePixelRatio, 2));
          p.imageMode(p.CENTER);
          if (imageRef.current) {
            spritesRef.current = buildSpriteCache(p, imageRef.current);
          }
        };

        p.draw = () => {
          const { width: w, height: h } = sizeRef.current;
          const ctrl = controlsRef.current;
          const catalog = catalogRef.current;
          const layerIdx = layerIdxRef.current;

          drawBackground(p, w, h);

          if (!catalog || !layerIdx || !spritesRef.current) {
            drawHint(p, w, h, 'loading tileset…');
            return;
          }

          const wantSig = `${ctrl.gridSize}:${w}x${h}`;
          if (
            !sceneRef.current ||
            sceneRef.current.signature !== wantSig ||
            lastGen !== generationRef.current
          ) {
            sceneRef.current = createScene(ctrl, w, h, catalog, layerIdx);
            lastGen = generationRef.current;
          }

          const scene = sceneRef.current;
          if (!ctrl.paused) {
            advanceScene(scene, ctrl, catalog, layerIdx, reducedMotionRef.current);
          }

          renderScene(p, scene, spritesRef.current, catalog);

          // Auto-restart on failure or after path round-trips complete.
          if (scene.phase === 'failed') {
            if (ctrl.autoRestart && performance.now() - scene.doneTime > 600) {
              generationRef.current += 1;
            }
          } else if (scene.phase === 'walking') {
            if (ctrl.autoRestart && performance.now() - scene.doneTime > 2500) {
              generationRef.current += 1;
            }
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
      sceneRef.current = null;
      spritesRef.current = null;
      imageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = sketchRef.current;
    if (!instance) return;
    instance.resizeCanvas(width, height);
  }, [width, height]);

  const phaseLabel = useMemo(() => {
    const scene = sceneRef.current;
    return scene?.phase ?? 'idle';
  }, []);

  return (
    <div className={styles.root}>
      <div ref={hostRef} className={styles.canvasHost} />

      <aside className={styles.panel} aria-label="Monument Valley controls">
        <h3 className={styles.panelTitle}>Monument Valley · WFC</h3>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Grid</p>
          <SliderControl
            label="Footprint"
            min={6}
            max={18}
            step={1}
            value={controls.gridSize}
            onChange={(value) => setControls((prev) => ({ ...prev, gridSize: value }))}
            format={(v) => `${v}×${v}`}
          />
          <SliderControl
            label="Steps / Frame"
            min={1}
            max={60}
            step={1}
            value={controls.stepsPerFrame}
            onChange={(value) => setControls((prev) => ({ ...prev, stepsPerFrame: value }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Behavior</p>
          <ToggleControl
            label="Pause"
            checked={controls.paused}
            onChange={(checked) => setControls((prev) => ({ ...prev, paused: checked }))}
          />
          <ToggleControl
            label="Auto-restart"
            checked={controls.autoRestart}
            onChange={(checked) => setControls((prev) => ({ ...prev, autoRestart: checked }))}
          />
        </section>

        <section className={styles.section}>
          <div className={styles.buttonRow}>
            <button className={styles.button} type="button" onClick={restart}>
              Regenerate
            </button>
            <button
              className={styles.button}
              type="button"
              onClick={() => setControls((prev) => ({ ...prev, paused: !prev.paused }))}
            >
              {controls.paused ? 'Resume' : 'Pause'}
            </button>
          </div>
          <div className={styles.statusRow} style={{ marginTop: '0.4rem' }}>
            <span className={styles.statusBadge}>{BASE_TILES.length} bases</span>
            <span className={styles.statusBadge} data-state={phaseLabel}>
              {phaseLabel}
            </span>
          </div>
        </section>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene lifecycle
// ─────────────────────────────────────────────────────────────────────────────

function createScene(
  ctrl: Controls,
  width: number,
  height: number,
  catalog: readonly TileVariant[],
  layerIdx: LayerIndices,
): SceneState {
  const W = ctrl.gridSize;
  const groundBias = buildCellBias(W, W, catalog, layerIdx.ground, layerIdx.emptyGround);
  const ground = new Wfc2D({
    width: W,
    depth: W,
    catalog,
    layerIndices: layerIdx.ground,
    cellBias: groundBias,
  });

  const geom = fitGeometry(width, height, W);

  return {
    signature: `${W}:${width}x${height}`,
    catalog,
    layerIdx,
    ground,
    mid: null,
    top: null,
    collapsedGround: null,
    collapsedMid: null,
    collapsedTop: null,
    phase: 'collapsing-ground',
    tileW: geom.tileW,
    tileH: geom.tileH,
    layerHeight: geom.layerHeight,
    originX: geom.originX,
    originY: geom.originY,
    doneTime: 0,
  };
}

function advanceScene(
  scene: SceneState,
  ctrl: Controls,
  catalog: readonly TileVariant[],
  layerIdx: LayerIndices,
  reducedMotion: boolean,
): void {
  const stepsPerFrame = reducedMotion ? 100000 : ctrl.stepsPerFrame;

  if (scene.phase === 'collapsing-ground') {
    runWfc(scene.ground, stepsPerFrame);
    if (scene.ground.failed) {
      scene.phase = 'failed';
      scene.doneTime = performance.now();
      return;
    }
    if (scene.ground.done) {
      scene.collapsedGround = snapshotCollapsed(scene.ground);
      const W = scene.ground.width;
      const midBias = buildCellBias(W, W, catalog, layerIdx.mid, layerIdx.emptyMid);
      scene.mid = new Wfc2D({
        width: W,
        depth: W,
        catalog,
        layerIndices: layerIdx.mid,
        cellBias: midBias,
      });
      // Force-empty mid above non-walkable ground (no architecture sits on void).
      for (let y = 0; y < W; y++) {
        for (let x = 0; x < W; x++) {
          const gIdx = scene.collapsedGround[x + y * W];
          const gv = catalog[gIdx];
          if (gv.base.walkable !== true) {
            scene.mid.forceCollapse(x, y, layerIdx.emptyMid);
          }
        }
      }
      scene.phase = 'collapsing-mid';
    }
    return;
  }

  if (scene.phase === 'collapsing-mid' && scene.mid) {
    runWfc(scene.mid, stepsPerFrame);
    if (scene.mid.failed) {
      scene.phase = 'failed';
      scene.doneTime = performance.now();
      return;
    }
    if (scene.mid.done) {
      scene.collapsedMid = snapshotCollapsed(scene.mid);
      const W = scene.mid.width;
      const topBias = buildCellBias(W, W, catalog, layerIdx.top, layerIdx.emptyTop);
      scene.top = new Wfc2D({
        width: W,
        depth: W,
        catalog,
        layerIndices: layerIdx.top,
        cellBias: topBias,
      });
      // Force-empty top above mid cells without a roof.
      for (let y = 0; y < W; y++) {
        for (let x = 0; x < W; x++) {
          const mIdx = scene.collapsedMid[x + y * W];
          const mv = catalog[mIdx];
          if (mv.base.hasRoof !== true) {
            scene.top.forceCollapse(x, y, layerIdx.emptyTop);
          }
        }
      }
      scene.phase = 'collapsing-top';
    }
    return;
  }

  if (scene.phase === 'collapsing-top' && scene.top) {
    runWfc(scene.top, stepsPerFrame);
    if (scene.top.failed) {
      // Top failure is forgivable — fall back to all-empty top.
      scene.collapsedTop = new Array(scene.top.cells.length).fill(layerIdx.emptyTop);
    } else if (scene.top.done) {
      scene.collapsedTop = snapshotCollapsed(scene.top);
    } else {
      return;
    }
    if (scene.collapsedGround && scene.collapsedMid && scene.collapsedTop) {
      scene.phase = 'walking';
      scene.doneTime = performance.now();
    }
  }
}

function runWfc(wfc: Wfc2D, steps: number): void {
  for (let i = 0; i < steps; i++) {
    if (!wfc.step()) return;
    if (wfc.failed || wfc.done) return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

function drawBackground(p: P5, w: number, h: number): void {
  // Vertical gradient #f5efe6 → #e8dccd
  for (let y = 0; y < h; y += 2) {
    const t = y / h;
    const r = Math.round(245 * (1 - t) + 232 * t);
    const g = Math.round(239 * (1 - t) + 220 * t);
    const b = Math.round(230 * (1 - t) + 205 * t);
    p.stroke(r, g, b);
    p.line(0, y, w, y);
  }
  p.noStroke();
}

function drawHint(p: P5, w: number, h: number, text: string): void {
  p.fill(80);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(14);
  p.text(text, w / 2, h / 2);
}

interface RenderOrderEntry {
  x: number;
  y: number;
}

function buildRenderOrder(W: number): RenderOrderEntry[] {
  const order: RenderOrderEntry[] = [];
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      order.push({ x, y });
    }
  }
  return order;
}

function worldToScreen(
  scene: SceneState,
  x: number,
  y: number,
  level: number,
): { sx: number; sy: number } {
  const sx = scene.originX + (x - y) * (scene.tileW / 2);
  // Mid sprites (level 1) already include the cube body in their artwork, so
  // they share the floor's anchor. Only top items (level 2) lift by one cube.
  const lift = level >= 2 ? scene.layerHeight : 0;
  const sy = scene.originY + (x + y) * (scene.tileH / 2) - lift;
  return { sx, sy };
}

function renderScene(
  p: P5,
  scene: SceneState,
  cache: SpriteCache,
  catalog: readonly TileVariant[],
): void {
  const W = scene.ground.width;
  const order = buildRenderOrder(W);
  // Sprite art has padding around the diamond; overscale slightly so adjacent
  // floor diamonds touch instead of leaving visible cream gaps.
  const drawScale = (scene.tileW / cache.cellW) * 1.18;

  p.imageMode(p.CENTER);
  p.noTint();

  for (const { x, y } of order) {
    drawCellLayer(p, scene, cache, catalog, x, y, 0, drawScale);
    drawCellLayer(p, scene, cache, catalog, x, y, 1, drawScale);
    drawCellLayer(p, scene, cache, catalog, x, y, 2, drawScale);
  }
}


function drawCellLayer(
  p: P5,
  scene: SceneState,
  cache: SpriteCache,
  catalog: readonly TileVariant[],
  x: number,
  y: number,
  layerIdx: 0 | 1 | 2,
  drawScale: number,
): void {
  const W = scene.ground.width;
  const i = x + y * W;
  let variantIndex = -1;
  if (layerIdx === 0 && scene.collapsedGround) {
    variantIndex = scene.collapsedGround[i];
  } else if (layerIdx === 0) {
    const c = scene.ground.cells[i];
    if (c.collapsed) variantIndex = c.options[0];
  } else if (layerIdx === 1 && scene.collapsedMid) {
    variantIndex = scene.collapsedMid[i];
  } else if (layerIdx === 1 && scene.mid) {
    const c = scene.mid.cells[i];
    if (c.collapsed) variantIndex = c.options[0];
  } else if (layerIdx === 2 && scene.collapsedTop) {
    variantIndex = scene.collapsedTop[i];
  } else if (layerIdx === 2 && scene.top) {
    const c = scene.top.cells[i];
    if (c.collapsed) variantIndex = c.options[0];
  }
  if (variantIndex < 0) return;
  const v = catalog[variantIndex];
  const sprite = getVariantSprite(cache, v);
  if (!sprite) return;

  const { sx, sy } = worldToScreen(scene, x, y, layerIdx);
  const drawW = cache.cellW * drawScale;
  const drawH = cache.cellH * drawScale;
  // Sprites have art roughly centered horizontally; vertical anchor pushes the
  // cube's diamond top into our (sx, sy) position so layers stack visually.
  const anchorY = sy - drawH * 0.18;

  p.image(sprite, sx, anchorY, drawW, drawH);
}

export default MonumentValleyProject;
