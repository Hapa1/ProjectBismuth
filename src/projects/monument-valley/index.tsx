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
  stepsPerFrame: 1,
  paused: false,
  autoRestart: true,
};

type Phase =
  | 'loading'
  | 'collapsing-ground'
  | 'collapsing-mid'
  | 'collapsing-top'
  | 'collapsing-stack'
  | 'collapsing-crown'
  | 'walking'
  | 'failed';

/** Number of extra cube-stack layers placed above the `top` cube layer.
 *  Total cube storeys = 2 (mid + top) + EXTRA_STACK_LAYERS. */
const EXTRA_STACK_LAYERS = 2;

interface StackPass {
  wfc: Wfc2D | null;
  collapsed: number[] | null;
}

interface SceneState {
  signature: string;
  catalog: readonly TileVariant[];
  layerIdx: LayerIndices;
  ground: Wfc2D;
  mid: Wfc2D | null;
  top: Wfc2D | null;
  /** Additional stacked-cube passes above the `top` layer. Each reuses the
   *  top-layer variant set so the same shade-coupling rules apply. */
  extraStacks: StackPass[];
  /** Index of the extra-stack pass currently being collapsed. */
  stackIdx: number;
  crown: Wfc2D | null;
  collapsedGround: number[] | null;
  collapsedMid: number[] | null;
  collapsedTop: number[] | null;
  collapsedCrown: number[] | null;
  /** Rows (y indices) where pillars/columns are heavily biased to appear. */
  pillarRows: ReadonlySet<number>;
  phase: Phase;
  tileW: number;
  tileH: number;
  layerHeight: number;
  originX: number;
  originY: number;
  doneTime: number;
}

interface SpriteMeta {
  /** Cropped sprite (transparent rows/cols removed). */
  image: P5Image;
  /** Top-left x of the cropped bbox within the source sheet cell (inside TRIM_PX inset). */
  bboxX: number;
  /** Top-left y of the cropped bbox within the source sheet cell. */
  bboxY: number;
}

interface SpriteCache {
  /** Per-source-index metadata. Index null when the source sheet cell is unused. */
  meta: (SpriteMeta | null)[];
  /** Source sheet cell width (after TRIM_PX inset) — same for every sprite. */
  cellW: number;
  /** Source sheet cell height (after TRIM_PX inset). */
  cellH: number;
  /** Canonical floor-diamond width in source-cell pixels (from floor-plain index 0). */
  diamondW: number;
  /** Canonical floor-diamond center X in source-cell pixels. */
  diamondCx: number;
  /** Canonical floor-diamond center Y in source-cell pixels (widest row of floor sprite). */
  diamondCy: number;
}

function buildCellBias(
  width: number,
  depth: number,
  variants: readonly TileVariant[],
  layerIndices: readonly number[],
  emptyIndex: number,
  pillarRows: ReadonlySet<number> = new Set<number>(),
): ReadonlyArray<ReadonlyMap<number, number>> {
  // Edge cells favour empty + plain floors. Center favours feature tiles.
  const bias: Map<number, number>[] = [];
  for (let y = 0; y < depth; y++) {
    for (let x = 0; x < width; x++) {
      const m = new Map<number, number>();
      const edgeDist = Math.min(x, y, width - 1 - x, depth - 1 - y);
      const isEdge = edgeDist <= 1;
      const isPillarRow = pillarRows.has(y) && !isEdge;
      for (const idx of layerIndices) {
        const v = variants[idx];
        if (idx === emptyIndex) {
          // Pillar rows: down-weight empty so columns dominate the row.
          m.set(idx, isPillarRow ? 0.25 : isEdge ? 2.5 : 1.0);
        } else if (v.baseId === 'floor-plain') {
          m.set(idx, isEdge ? 2.0 : 1.0);
        } else if (v.baseId === 'dais-stepped') {
          m.set(idx, isEdge ? 0.2 : 1.4);
        } else if (v.baseId === 'column') {
          // Columns are the headline feature on a pillar row, otherwise rare.
          m.set(idx, isPillarRow ? 12 : 0.08);
        } else if (
          v.baseId === 'temple-balcony' ||
          v.baseId === 'crown-tower'
        ) {
          // Suppress big features in pillar rows so the colonnade stays clean.
          m.set(idx, isPillarRow ? 0.05 : isEdge ? 0.4 : 1.5);
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
  const innerW = cellW - TRIM_PX * 2;
  const innerH = cellH - TRIM_PX * 2;
  const meta: (SpriteMeta | null)[] = [];
  for (let row = 0; row < SHEET_ROWS; row++) {
    for (let col = 0; col < SHEET_COLS; col++) {
      const sub = image.get(
        col * cellW + TRIM_PX,
        row * cellH + TRIM_PX,
        innerW,
        innerH,
      );
      keyOutBackground(sub);
      meta.push(measureSprite(sub));
    }
  }
  // Canonical diamond geometry from floor-plain (sourceIndex 0): a tile with
  // nothing on top of it, so its widest opaque row IS the floor diamond.
  const floorMeta = meta[0];
  let diamondW = innerW;
  let diamondCx = innerW / 2;
  let diamondCy = innerH / 2;
  if (floorMeta) {
    const m = measureDiamond(floorMeta);
    diamondW = m.w;
    // Convert cropped-coords back into source-cell coords by adding bbox offset.
    diamondCx = floorMeta.bboxX + m.cx;
    diamondCy = floorMeta.bboxY + m.cy;
  }
  return { meta, cellW: innerW, cellH: innerH, diamondW, diamondCx, diamondCy };
}

/** Measures the widest opaque row in the bottom 60% of a cropped sprite. Used
 *  ONLY for the canonical floor sprite to get diamond geometry. */
function measureDiamond(m: SpriteMeta): { w: number; cx: number; cy: number } {
  const img = m.image;
  img.loadPixels();
  const px = img.pixels;
  const w = img.width;
  const h = img.height;
  const startY = Math.max(0, Math.floor(h * 0.4));
  let bestRow = h - 1;
  let bestSpan = 0;
  let bestL = 0;
  let bestR = w - 1;
  for (let y = startY; y < h; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 16) {
        if (l < 0) l = x;
        r = x;
      }
    }
    if (l < 0) continue;
    const span = r - l + 1;
    if (span >= bestSpan) {
      bestSpan = span;
      bestRow = y;
      bestL = l;
      bestR = r;
    }
  }
  return { w: bestSpan, cx: (bestL + bestR) / 2, cy: bestRow };
}

/**
 * Crop the sprite to its opaque bounding box. Records bbox top-left so the
 * sprite can be replaced at its original cell-relative position downstream.
 * Returns null if the sprite is fully transparent.
 */
function measureSprite(img: P5Image): SpriteMeta | null {
  img.loadPixels();
  const px = img.pixels;
  if (!px || px.length === 0) return null;
  const w = img.width;
  const h = img.height;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = px[(y * w + x) * 4 + 3];
      if (a > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  return {
    image: img.get(minX, minY, bw, bh),
    bboxX: minX,
    bboxY: minY,
  };
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
): SpriteMeta | null {
  const base = variant.base;
  if (variant.rotation === 2 && base.pairedSourceIndex !== undefined) {
    return cache.meta[base.pairedSourceIndex];
  }
  if (base.sourceIndex == null) return null;
  return cache.meta[base.sourceIndex];
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
            sceneRef.current = createScene(ctrl, w, h, catalog, layerIdx, spritesRef.current);
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
  cache: SpriteCache,
): SceneState {
  const W = ctrl.gridSize;
  // Pick pillar rows (interior only). For small grids: 1 row; for large: 2.
  // Rows are spaced apart so colonnades don't merge into a slab.
  const pillarRows = new Set<number>();
  const interiorMin = 2;
  const interiorMax = W - 3;
  if (interiorMax >= interiorMin) {
    const first = interiorMin + Math.floor(Math.random() * (interiorMax - interiorMin + 1));
    pillarRows.add(first);
    if (W >= 12) {
      // Place a second row at least 3 cells away.
      for (let attempts = 0; attempts < 8; attempts++) {
        const r = interiorMin + Math.floor(Math.random() * (interiorMax - interiorMin + 1));
        if (Math.abs(r - first) >= 3) {
          pillarRows.add(r);
          break;
        }
      }
    }
  }
  const groundBias = buildCellBias(W, W, catalog, layerIdx.ground, layerIdx.emptyGround);
  const ground = new Wfc2D({
    width: W,
    depth: W,
    catalog,
    layerIndices: layerIdx.ground,
    cellBias: groundBias,
  });

  const geom = fitGeometry(width, height, W);
  // Override layerHeight using the cube's actual body height. The cube sprite
  // (sourceIndex 1) bbox top is the cube's roof apex; cache.diamondCy is the
  // cube's base diamond center. Distance × world-scale = the gap-free lift
  // between stacked storeys.
  const cubeMeta = cache.meta[1];
  let layerHeight = geom.layerHeight;
  if (cubeMeta) {
    const worldScale = geom.tileW / cache.diamondW;
    // Sprites are anchored to their BASE diamond center. To stack flush, the
    // next storey's base diamond must land on the current storey's TOP
    // diamond center. The cube sprite's bbox top is the apex of the top
    // diamond, so subtract half a diamond height (= diamondW / 4 for a 2:1
    // isometric diamond) to reach the top diamond's center.
    const cubeBodyPx = cache.diamondCy - cubeMeta.bboxY - cache.diamondW / 4;
    if (cubeBodyPx > 0) layerHeight = Math.round(cubeBodyPx * worldScale);
  }

  return {
    signature: `${W}:${width}x${height}`,
    catalog,
    layerIdx,
    ground,
    mid: null,
    top: null,
    extraStacks: Array.from({ length: EXTRA_STACK_LAYERS }, () => ({ wfc: null, collapsed: null })),
    stackIdx: 0,
    crown: null,
    collapsedGround: null,
    collapsedMid: null,
    collapsedTop: null,
    collapsedCrown: null,
    pillarRows,
    phase: 'collapsing-ground',
    tileW: geom.tileW,
    tileH: geom.tileH,
    layerHeight,
    originX: geom.originX,
    originY: geom.originY,
    doneTime: 0,
  };
}

function makeStackWfc(
  W: number,
  catalog: readonly TileVariant[],
  layerIdx: LayerIndices,
  prev: readonly number[],
): Wfc2D {
  // Shade-coupled bias for any stacked-cube pass (the original "top" pass and
  // every additional storey above it). A stack-cube tile may sit on a `prev`
  // cell only if their shades match; over a non-block prev cell, only
  // `empty-top` is permitted.
  const baseBias = buildCellBias(W, W, catalog, layerIdx.top, layerIdx.emptyTop);
  const STACK_IDS = new Set<string>(['top-cube-coral', 'top-cube-lavender']);
  const stackBias: Map<number, number>[] = [];
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const m = new Map(baseBias[x + y * W]);
      const prevVariant = catalog[prev[x + y * W]];
      const prevShade = prevVariant.base.shade ?? 'neutral';
      const prevIsBlock = prevVariant.base.isBlock === true;
      for (const idx of layerIdx.top) {
        if (idx === layerIdx.emptyTop) {
          // Down-weight empty over a real block so a stack wins the roll.
          if (prevIsBlock) m.set(idx, 0.4);
          continue;
        }
        const v = catalog[idx];
        const shade = v.base.shade ?? 'neutral';
        if (shade !== 'neutral' && prevShade !== 'neutral' && shade !== prevShade) {
          m.set(idx, 0);
          continue;
        }
        if (STACK_IDS.has(v.baseId)) {
          m.set(idx, prevIsBlock ? 6 : 0);
        }
      }
      stackBias.push(m);
    }
  }
  const wfc = new Wfc2D({
    width: W,
    depth: W,
    catalog,
    layerIndices: layerIdx.top,
    cellBias: stackBias,
  });
  // Force-empty over any prev cell that is not a true block.
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const v = catalog[prev[x + y * W]];
      if (v.base.isBlock !== true) {
        wfc.forceCollapse(x, y, layerIdx.emptyTop);
      }
    }
  }
  return wfc;
}

function makeCrownWfc(
  W: number,
  catalog: readonly TileVariant[],
  layerIdx: LayerIndices,
  prev: readonly number[],
): Wfc2D {
  const crownBias: Map<number, number>[] = [];
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const m = new Map<number, number>();
      const v = catalog[prev[x + y * W]];
      const prevShade = v.base.shade ?? 'neutral';
      const onStack = v.base.isBlock === true;
      for (const idx of layerIdx.crown) {
        if (idx === layerIdx.emptyCrown) {
          m.set(idx, onStack ? 0.6 : 9);
          continue;
        }
        if (!onStack) {
          m.set(idx, 0);
          continue;
        }
        const cShade = catalog[idx].base.shade ?? 'neutral';
        if (cShade !== 'neutral' && prevShade !== 'neutral' && cShade !== prevShade) {
          m.set(idx, 0);
          continue;
        }
        m.set(idx, 4);
      }
      crownBias.push(m);
    }
  }
  const wfc = new Wfc2D({
    width: W,
    depth: W,
    catalog,
    layerIndices: layerIdx.crown,
    cellBias: crownBias,
  });
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const v = catalog[prev[x + y * W]];
      if (v.base.isBlock !== true) {
        wfc.forceCollapse(x, y, layerIdx.emptyCrown);
      }
    }
  }
  return wfc;
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
      const midBias = buildCellBias(W, W, catalog, layerIdx.mid, layerIdx.emptyMid, scene.pillarRows);
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
      // Soft-fail: snapshot what collapsed, fill the rest with empty-mid, and
      // continue. Avoids a full scene restart on a single contradiction.
      const fallback: number[] = new Array(scene.mid.cells.length);
      for (let i = 0; i < scene.mid.cells.length; i++) {
        const c = scene.mid.cells[i];
        fallback[i] = c.collapsed ? c.options[0] : layerIdx.emptyMid;
      }
      scene.collapsedMid = fallback;
      // Skip directly to top-pass via the normal done branch by marking mid done.
      // (Continue execution below.)
    }
    if (scene.mid.done || scene.collapsedMid) {
      if (!scene.collapsedMid) {
        scene.collapsedMid = snapshotCollapsed(scene.mid);
      }
      const W = scene.mid.width;
      scene.top = makeStackWfc(W, catalog, layerIdx, scene.collapsedMid);
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
      const W2 = scene.top.width;
      if (scene.extraStacks.length > 0) {
        scene.extraStacks[0].wfc = makeStackWfc(W2, catalog, layerIdx, scene.collapsedTop);
        scene.stackIdx = 0;
        scene.phase = 'collapsing-stack';
      } else {
        scene.crown = makeCrownWfc(W2, catalog, layerIdx, scene.collapsedTop);
        scene.phase = 'collapsing-crown';
      }
    }
  }

  if (scene.phase === 'collapsing-stack') {
    const pass = scene.extraStacks[scene.stackIdx];
    if (!pass.wfc) return;
    runWfc(pass.wfc, stepsPerFrame);
    if (pass.wfc.failed) {
      // Soft-fail: collapse remainder to empty-top so the scene continues.
      pass.collapsed = new Array(pass.wfc.cells.length).fill(layerIdx.emptyTop);
    } else if (pass.wfc.done) {
      pass.collapsed = snapshotCollapsed(pass.wfc);
    } else {
      return;
    }
    const W2 = pass.wfc.width;
    if (scene.stackIdx < scene.extraStacks.length - 1) {
      // Build the next stack pass on top of this one.
      scene.stackIdx += 1;
      scene.extraStacks[scene.stackIdx].wfc = makeStackWfc(W2, catalog, layerIdx, pass.collapsed);
    } else {
      // Done with all extra stacks — build crown atop the topmost collapsed.
      scene.crown = makeCrownWfc(W2, catalog, layerIdx, pass.collapsed);
      scene.phase = 'collapsing-crown';
    }
    return;
  }

  if (scene.phase === 'collapsing-crown' && scene.crown) {
    runWfc(scene.crown, stepsPerFrame);
    if (scene.crown.failed) {
      scene.collapsedCrown = new Array(scene.crown.cells.length).fill(layerIdx.emptyCrown);
    } else if (scene.crown.done) {
      scene.collapsedCrown = snapshotCollapsed(scene.crown);
    } else {
      return;
    }
    if (scene.collapsedCrown) {
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
  // Level 0 (ground) and 1 (mid) share the same diamond — bbox-cell anchoring
  // already places mid features sitting on the floor. Each layer above lifts
  // by one cube body height (= layerHeight).
  const lift = Math.max(0, level - 1) * scene.layerHeight;
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

  p.imageMode(p.CORNER);
  p.noTint();

  for (const { x, y } of order) {
    // Level numbering:
    //   0 = ground, 1 = mid, 2 = top (first stacked cube),
    //   3..(2 + extraStacks.length) = additional stacked cubes,
    //   crown = last level.
    const totalLevels = 3 + scene.extraStacks.length + 1;
    for (let level = 0; level < totalLevels; level++) {
      drawCellLayer(p, scene, cache, catalog, x, y, level);
    }
  }
}


function drawCellLayer(
  p: P5,
  scene: SceneState,
  cache: SpriteCache,
  catalog: readonly TileVariant[],
  x: number,
  y: number,
  level: number,
): void {
  const W = scene.ground.width;
  const i = x + y * W;
  let variantIndex = -1;
  const crownLevel = 3 + scene.extraStacks.length;
  if (level === 0) {
    if (scene.collapsedGround) variantIndex = scene.collapsedGround[i];
    else {
      const c = scene.ground.cells[i];
      if (c.collapsed) variantIndex = c.options[0];
    }
  } else if (level === 1) {
    if (scene.collapsedMid) variantIndex = scene.collapsedMid[i];
    else if (scene.mid) {
      const c = scene.mid.cells[i];
      if (c.collapsed) variantIndex = c.options[0];
    }
  } else if (level === 2) {
    if (scene.collapsedTop) variantIndex = scene.collapsedTop[i];
    else if (scene.top) {
      const c = scene.top.cells[i];
      if (c.collapsed) variantIndex = c.options[0];
    }
  } else if (level === crownLevel) {
    if (scene.collapsedCrown) variantIndex = scene.collapsedCrown[i];
    else if (scene.crown) {
      const c = scene.crown.cells[i];
      if (c.collapsed) variantIndex = c.options[0];
    }
  } else {
    // Extra stacked cube layer.
    const stackIdx = level - 3;
    const pass = scene.extraStacks[stackIdx];
    if (!pass) return;
    if (pass.collapsed) variantIndex = pass.collapsed[i];
    else if (pass.wfc) {
      const c = pass.wfc.cells[i];
      if (c.collapsed) variantIndex = c.options[0];
    }
  }
  if (variantIndex < 0) return;
  const v = catalog[variantIndex];
  const meta = getVariantSprite(cache, v);
  if (!meta) return;

  const { sx, sy } = worldToScreen(scene, x, y, level);
  // Single canonical scale for ALL sprites (sheet pixel → world pixel).
  const baseScale = scene.tileW / cache.diamondW;
  const renderScale = v.base.renderScale ?? 1;
  const scale = baseScale * renderScale;
  // Cell-relative diamond-center anchoring. The artist drew the diamond at a
  // consistent cell-local position across all 24 cells, so we reconstruct
  // each sprite's cell origin from its stored bbox offset and place it so
  // the canonical diamond center (measured from floor-plain) lands on
  // (sx, sy). Robust to per-sprite bbox variation (fat floor rim vs. thin
  // dais base vs. cube with no rim).
  const bw = meta.image.width;
  const bh = meta.image.height;
  const cellOriginX = sx - cache.diamondCx * scale;
  const cellOriginY = sy - cache.diamondCy * scale;
  let drawX = cellOriginX + meta.bboxX * scale;
  let drawY = cellOriginY + meta.bboxY * scale;
  const drawW = bw * scale;
  const drawH = bh * scale;
  // For renderScale != 1 (e.g. portal-arch downsize) recenter around the
  // diamond center so the sprite shrinks toward (sx, sy), not the corner.
  if (renderScale !== 1) {
    const centerX = drawX + drawW / 2;
    const centerY = drawY + drawH / 2;
    drawX += sx - centerX;
    drawY += sy - centerY;
  }

  p.image(meta.image, drawX, drawY, drawW, drawH);
}

export default MonumentValleyProject;
