import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import { CollapsiblePanel } from '../../lib/controls';
import styles from './WFC.module.css';

type TilesetName = 'pipes' | 'circuit' | 'terrain';

type TerrainBiomeCode = 'D' | 'W' | 'S' | 'G' | 'F' | 'R' | 'N';

interface TileDef {
  sockets: [string, string, string, string];
  weight: number;
  drawId: string;
  biomeIndices?: [number, number, number, number];
  biomeAverage?: number;
}

interface Tileset {
  name: TilesetName;
  label: string;
  tiles: TileDef[];
  drawTile: (p: P5, tile: TileDef, size: number) => void;
  drawBackground: (p: P5, w: number, h: number) => void;
}

interface Controls {
  tileset: TilesetName;
  gridSize: number;
  stepsPerFrame: number;
  autoRestart: boolean;
  showEntropy: boolean;
  paused: boolean;
}

const DEFAULT_CONTROLS: Controls = {
  tileset: 'terrain',
  gridSize: 24,
  stepsPerFrame: 12,
  autoRestart: true,
  showEntropy: false,
  paused: false,
};

interface TerrainBiome {
  code: TerrainBiomeCode;
  color: string;
  pureWeight: number;
}

interface TerrainBiasField {
  targets: number[];
  edgeExposure: number[];
}

function buildPipeTiles(): TileDef[] {
  const patterns: Array<[string, string, string, string]> = [
    ['0', '0', '0', '0'],
    ['0', '1', '0', '1'],
    ['1', '0', '1', '0'],
    ['1', '1', '0', '0'],
    ['0', '1', '1', '0'],
    ['0', '0', '1', '1'],
    ['1', '0', '0', '1'],
    ['1', '1', '1', '0'],
    ['0', '1', '1', '1'],
    ['1', '0', '1', '1'],
    ['1', '1', '0', '1'],
    ['1', '1', '1', '1'],
  ];
  return patterns.map((sockets) => {
    const count = sockets.filter((s) => s === '1').length;
    let weight = 1;
    if (count === 0) weight = 2;
    if (count === 4) weight = 0.5;
    if (count === 3) weight = 0.7;
    return { sockets, weight, drawId: sockets.join('') };
  });
}

const PIPE_TILESET: Tileset = {
  name: 'pipes',
  label: 'Pipes',
  tiles: buildPipeTiles(),
  drawTile: (p, tile, size) => {
    p.noStroke();
    p.fill('#0e1116');
    p.rect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const ends: Array<{ x: number; y: number }> = [];
    if (tile.sockets[0] === '1') ends.push({ x: cx, y: 0 });
    if (tile.sockets[1] === '1') ends.push({ x: size, y: cy });
    if (tile.sockets[2] === '1') ends.push({ x: cx, y: size });
    if (tile.sockets[3] === '1') ends.push({ x: 0, y: cy });
    if (ends.length === 0) return;
    p.stroke('#dbe4ee');
    p.strokeWeight(size * 0.22);
    p.strokeCap(p.PROJECT);
    for (const e of ends) p.line(e.x, e.y, cx, cy);
  },
  drawBackground: (p, w, h) => {
    p.noStroke();
    p.fill('#0a0c10');
    p.rect(0, 0, w, h);
  },
};

const CIRCUIT_TILESET: Tileset = {
  name: 'circuit',
  label: 'Circuit',
  tiles: buildPipeTiles(),
  drawTile: (p, tile, size) => {
    p.noStroke();
    p.fill('#04120a');
    p.rect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const ends: Array<{ x: number; y: number }> = [];
    if (tile.sockets[0] === '1') ends.push({ x: cx, y: 0 });
    if (tile.sockets[1] === '1') ends.push({ x: size, y: cy });
    if (tile.sockets[2] === '1') ends.push({ x: cx, y: size });
    if (tile.sockets[3] === '1') ends.push({ x: 0, y: cy });

    if (ends.length > 0) {
      p.stroke('#1a4d2e');
      p.strokeWeight(size * 0.22);
      p.strokeCap(p.PROJECT);
      for (const e of ends) p.line(e.x, e.y, cx, cy);
      p.stroke('#4ade80');
      p.strokeWeight(size * 0.06);
      for (const e of ends) p.line(e.x, e.y, cx, cy);
    }

    if (ends.length >= 2) {
      p.noStroke();
      p.fill('#86efac');
      p.circle(cx, cy, size * 0.18);
      p.fill('#04120a');
      p.circle(cx, cy, size * 0.08);
    }
  },
  drawBackground: (p, w, h) => {
    p.noStroke();
    p.fill('#03100a');
    p.rect(0, 0, w, h);
  },
};

const TERRAIN_BIOMES: readonly TerrainBiome[] = [
  { code: 'D', color: '#0f2740', pureWeight: 4.6 },
  { code: 'W', color: '#1d5686', pureWeight: 4.2 },
  { code: 'S', color: '#d8ba74', pureWeight: 3.7 },
  { code: 'G', color: '#4f8d45', pureWeight: 4.4 },
  { code: 'F', color: '#2f5f38', pureWeight: 3.3 },
  { code: 'R', color: '#6a6762', pureWeight: 3.1 },
  { code: 'N', color: '#eef4fa', pureWeight: 2.4 },
] as const;

const TERRAIN_COLORS: Record<TerrainBiomeCode, string> = Object.fromEntries(
  TERRAIN_BIOMES.map((biome) => [biome.code, biome.color]),
) as Record<TerrainBiomeCode, string>;

const TERRAIN_BIOME_INDEX = Object.fromEntries(
  TERRAIN_BIOMES.map((biome, index) => [biome.code, index]),
) as Record<TerrainBiomeCode, number>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hash2D(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbm2D(x: number, y: number, seed: number, octaves = 4) {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let normalizer = 0;

  for (let octave = 0; octave < octaves; octave++) {
    total += valueNoise2D(x * frequency, y * frequency, seed + octave * 17.13) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / normalizer;
}

function buildTerrainTiles(): TileDef[] {
  const tiles: TileDef[] = [];
  const seen = new Set<string>();

  const pushTile = (corners: [TerrainBiomeCode, TerrainBiomeCode, TerrainBiomeCode, TerrainBiomeCode]) => {
    const key = corners.join('');
    if (seen.has(key)) return;
    seen.add(key);

    const sockets: [string, string, string, string] = [
      corners[0] + corners[1],
      corners[1] + corners[3],
      corners[2] + corners[3],
      corners[0] + corners[2],
    ];
    const biomeIndices = corners.map((code) => TERRAIN_BIOME_INDEX[code]) as [
      number,
      number,
      number,
      number,
    ];
    const uniqueCount = new Set(corners).size;
    const transitionCount =
      Number(corners[0] !== corners[1]) +
      Number(corners[1] !== corners[3]) +
      Number(corners[3] !== corners[2]) +
      Number(corners[2] !== corners[0]);

    let weight = 1;
    if (uniqueCount === 1) {
      weight = TERRAIN_BIOMES[biomeIndices[0]].pureWeight;
    } else if (transitionCount === 2) {
      weight = 1.55;
    } else if (transitionCount === 4) {
      weight = 0.45;
    } else {
      weight = 0.9;
    }

    tiles.push({
      sockets,
      weight,
      drawId: key,
      biomeIndices,
      biomeAverage: biomeIndices.reduce((sum, value) => sum + value, 0) / biomeIndices.length,
    });
  };

  for (const biome of TERRAIN_BIOMES) {
    pushTile([biome.code, biome.code, biome.code, biome.code]);
  }

  for (let i = 0; i < TERRAIN_BIOMES.length - 1; i++) {
    const a = TERRAIN_BIOMES[i].code;
    const b = TERRAIN_BIOMES[i + 1].code;
    for (let mask = 1; mask < 15; mask++) {
      pushTile([
        mask & 1 ? b : a,
        mask & 2 ? b : a,
        mask & 4 ? b : a,
        mask & 8 ? b : a,
      ]);
    }
  }

  return tiles;
}

function buildTerrainBiasField(rows: number, cols: number): TerrainBiasField {
  const targets: number[] = [];
  const edgeExposure: number[] = [];
  const elevationSeed = Math.random() * 1000;
  const detailSeed = Math.random() * 1000 + 1000;
  const moistureSeed = Math.random() * 1000 + 2000;
  const maxIndex = TERRAIN_BIOMES.length - 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = cols <= 1 ? 0.5 : c / (cols - 1);
      const v = rows <= 1 ? 0.5 : r / (rows - 1);
      const nx = u * 2 - 1;
      const ny = v * 2 - 1;
      const distance = Math.sqrt(nx * nx + ny * ny);
      const edgeDistance = Math.min(u, v, 1 - u, 1 - v);
      const edge = 1 - clamp(edgeDistance * 3.5, 0, 1);
      const island = clamp(1 - Math.pow(distance, 1.25), 0, 1);
      const broadNoise = fbm2D(u * 2.2 + 3.7, v * 2.2 + 9.1, elevationSeed);
      const detailNoise = fbm2D(u * 5.4 + 17.2, v * 5.4 + 13.6, detailSeed);
      const moisture = fbm2D(u * 3.1 + 7.8, v * 3.1 + 4.4, moistureSeed);

      const elevation = clamp(
        island * 0.72 +
          (broadNoise - 0.5) * 0.34 +
          (detailNoise - 0.5) * 0.18 -
          edge * 0.24,
        0,
        1,
      );

      let target = elevation * maxIndex;
      if (elevation > 0.36 && elevation < 0.78) {
        target += (moisture - 0.44) * 1.4;
      }
      if (elevation > 0.84) {
        target += smoothstep(0.84, 1, elevation) * 0.45;
      }
      if (edge > 0.72) {
        target -= smoothstep(0.72, 1, edge) * 1.1;
      }

      targets.push(clamp(target, 0, maxIndex));
      edgeExposure.push(edge);
    }
  }

  return { targets, edgeExposure };
}

function terrainWeightForCell(
  field: TerrainBiasField,
  cols: number,
  row: number,
  col: number,
  tile: TileDef,
) {
  if (tile.biomeAverage === undefined || tile.biomeIndices === undefined) {
    return 1;
  }

  const index = row * cols + col;
  const target = field.targets[index];
  const edge = field.edgeExposure[index];
  const meanDelta = Math.abs(tile.biomeAverage - target);
  const span = Math.max(...tile.biomeIndices) - Math.min(...tile.biomeIndices);
  const lowest = Math.min(...tile.biomeIndices);
  let weight = Math.exp(-(meanDelta * meanDelta) / 1.35);

  if (span > 1) {
    weight *= 0.35;
  }

  if (edge > 0.7) {
    const waterAffinity = 1 - lowest / (TERRAIN_BIOMES.length - 1);
    weight *= 0.55 + waterAffinity * 0.9;
  }

  return Math.max(0.08, weight);
}

const TERRAIN_TILESET: Tileset = {
  name: 'terrain',
  label: 'Biomes',
  tiles: buildTerrainTiles(),
  drawTile: (p, tile, size) => {
    const q = tile.drawId.split('') as TerrainBiomeCode[];
    const half = size / 2;
    p.noStroke();
    p.fill(TERRAIN_COLORS[q[0]]);
    p.rect(0, 0, half, half);
    p.fill(TERRAIN_COLORS[q[1]]);
    p.rect(half, 0, half, half);
    p.fill(TERRAIN_COLORS[q[2]]);
    p.rect(0, half, half, half);
    p.fill(TERRAIN_COLORS[q[3]]);
    p.rect(half, half, half, half);

    p.stroke('#0a0f14');
    p.strokeWeight(Math.max(1, size * 0.04));
    if (q[0] !== q[1]) p.line(half, 0, half, half);
    if (q[0] !== q[2]) p.line(0, half, half, half);
    if (q[1] !== q[3]) p.line(half, half, size, half);
    if (q[2] !== q[3]) p.line(half, half, half, size);

    p.noStroke();
    const uniqueBiomes = new Set(q);
    if (uniqueBiomes.size === 1) {
      switch (q[0]) {
        case 'D':
        case 'W':
          p.fill(255, 255, 255, q[0] === 'D' ? 18 : 28);
          p.rect(0, size * 0.18, size, size * 0.08);
          p.rect(0, size * 0.58, size, size * 0.06);
          break;
        case 'F':
          p.fill(0, 0, 0, 26);
          p.circle(size * 0.35, size * 0.35, size * 0.16);
          p.circle(size * 0.7, size * 0.58, size * 0.14);
          break;
        case 'R':
          p.fill(255, 255, 255, 18);
          p.rect(size * 0.18, size * 0.22, size * 0.54, size * 0.06);
          p.rect(size * 0.32, size * 0.54, size * 0.4, size * 0.05);
          break;
        case 'N':
          p.fill(255, 255, 255, 32);
          p.rect(size * 0.16, size * 0.18, size * 0.68, size * 0.12);
          break;
      }
    }
  },
  drawBackground: (p, w, h) => {
    p.noStroke();
    p.fill('#0d1218');
    p.rect(0, 0, w, h);
  },
};

const TILESETS: Record<TilesetName, Tileset> = {
  pipes: PIPE_TILESET,
  circuit: CIRCUIT_TILESET,
  terrain: TERRAIN_TILESET,
};

interface Cell {
  options: number[];
  collapsed: boolean;
}

class WFC {
  cells: Cell[];
  rows: number;
  cols: number;
  tiles: TileDef[];
  tileWeightAt?: (row: number, col: number, tile: TileDef) => number;
  failed = false;
  done = false;

  constructor(
    rows: number,
    cols: number,
    tiles: TileDef[],
    options?: {
      tileWeightAt?: (row: number, col: number, tile: TileDef) => number;
    },
  ) {
    this.rows = rows;
    this.cols = cols;
    this.tiles = tiles;
    this.tileWeightAt = options?.tileWeightAt;
    const all = tiles.map((_, i) => i);
    this.cells = Array.from({ length: rows * cols }, () => ({
      options: all.slice(),
      collapsed: false,
    }));
  }

  step(): boolean {
    if (this.failed || this.done) return false;
    let best = -1;
    let bestE = Infinity;
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (c.collapsed) continue;
      if (c.options.length === 0) {
        this.failed = true;
        return false;
      }
      const e = c.options.length + Math.random() * 0.1;
      if (e < bestE) {
        bestE = e;
        best = i;
      }
    }
    if (best === -1) {
      this.done = true;
      return false;
    }

    const cell = this.cells[best];
    const bestRow = Math.floor(best / this.cols);
    const bestCol = best % this.cols;
    const weightedOptions = cell.options.map((idx) => ({
      idx,
      weight: Math.max(
        0.001,
        this.tiles[idx].weight * (this.tileWeightAt?.(bestRow, bestCol, this.tiles[idx]) ?? 1),
      ),
    }));
    let totalW = 0;
    for (const option of weightedOptions) totalW += option.weight;
    let r = Math.random() * totalW;
    let chosen = cell.options[0];
    for (const option of weightedOptions) {
      r -= option.weight;
      if (r <= 0) {
        chosen = option.idx;
        break;
      }
    }
    cell.options = [chosen];
    cell.collapsed = true;

    const stack: number[] = [best];
    while (stack.length) {
      const i = stack.pop() as number;
      const cr = Math.floor(i / this.cols);
      const cc = i % this.cols;
      const selfOpts = this.cells[i].options;
      const selfEdgeSockets: Array<Set<string>> = [
        new Set(),
        new Set(),
        new Set(),
        new Set(),
      ];
      for (const idx of selfOpts) {
        const t = this.tiles[idx];
        for (let e = 0; e < 4; e++) selfEdgeSockets[e].add(t.sockets[e]);
      }

      const neighbors: Array<[number, number, number, number]> = [
        [0, 2, -1, 0],
        [1, 3, 0, 1],
        [2, 0, 1, 0],
        [3, 1, 0, -1],
      ];

      for (const [se, ne, dr, dc] of neighbors) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
        const ni = nr * this.cols + nc;
        const ncell = this.cells[ni];
        if (ncell.collapsed) continue;
        const allowed = selfEdgeSockets[se];
        const before = ncell.options.length;
        const filtered: number[] = [];
        for (const idx of ncell.options) {
          if (allowed.has(this.tiles[idx].sockets[ne])) filtered.push(idx);
        }
        if (filtered.length !== before) {
          ncell.options = filtered;
          if (filtered.length === 0) {
            this.failed = true;
            return true;
          }
          if (filtered.length === 1) ncell.collapsed = true;
          stack.push(ni);
        }
      }
    }
    return true;
  }
}

interface SketchState {
  wfc: WFC;
  tileset: Tileset;
  cellSize: number;
  offsetX: number;
  offsetY: number;
  terrainBias?: TerrainBiasField;
  signature: string;
}

function buildSketchState(
  controls: Controls,
  width: number,
  height: number,
): SketchState {
  const tileset = TILESETS[controls.tileset];
  const grid = controls.gridSize;
  const cellSize = Math.max(4, Math.floor(Math.min(width, height) / grid));
  const usedW = cellSize * grid;
  const usedH = cellSize * grid;
  const offsetX = Math.floor((width - usedW) / 2);
  const offsetY = Math.floor((height - usedH) / 2);
  const terrainBias = controls.tileset === 'terrain' ? buildTerrainBiasField(grid, grid) : undefined;
  return {
    wfc: new WFC(grid, grid, tileset.tiles, {
      tileWeightAt: terrainBias
        ? (row, col, tile) => terrainWeightForCell(terrainBias, grid, row, col, tile)
        : undefined,
    }),
    tileset,
    cellSize,
    offsetX,
    offsetY,
    terrainBias,
    signature: `${controls.tileset}:${grid}:${width}x${height}`,
  };
}

function renderSketch(
  p: P5,
  state: SketchState,
  controls: Controls,
  width: number,
  height: number,
) {
  state.tileset.drawBackground(p, width, height);
  const { wfc, tileset, cellSize, offsetX, offsetY } = state;
  for (let r = 0; r < wfc.rows; r++) {
    for (let c = 0; c < wfc.cols; c++) {
      const cell = wfc.cells[r * wfc.cols + c];
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;
      p.push();
      p.translate(x, y);
      if (cell.options.length === 0) {
        p.noStroke();
        p.fill('#5b1d1d');
        p.rect(0, 0, cellSize, cellSize);
      } else if (cell.collapsed || cell.options.length === 1) {
        tileset.drawTile(p, wfc.tiles[cell.options[0]], cellSize);
      } else {
        const t = cell.options.length / wfc.tiles.length;
        const v = Math.floor(18 + t * 60);
        p.noStroke();
        if (state.terrainBias && controls.tileset === 'terrain') {
          const target = state.terrainBias.targets[r * wfc.cols + c];
          const biome = TERRAIN_BIOMES[Math.round(target)];
          p.fill(TERRAIN_COLORS[biome.code]);
        } else {
          p.fill(v, v, v + 8);
        }
        p.rect(0, 0, cellSize, cellSize);
        if (controls.showEntropy && cellSize >= 18) {
          p.fill(220);
          p.noStroke();
          p.textSize(cellSize * 0.35);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(String(cell.options.length), cellSize / 2, cellSize / 2);
        }
      }
      p.pop();
    }
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

function WFCProject({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const controlsRef = useRef<Controls>(controls);
  const stateRef = useRef<SketchState | null>(null);
  const sizeRef = useRef({ width, height });
  const generationRef = useRef(0);
  const [status, setStatus] = useState<'running' | 'done' | 'failed'>('running');

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  const restart = useCallback(() => {
    generationRef.current += 1;
    setStatus('running');
  }, []);

  useEffect(() => {
    restart();
  }, [controls.tileset, controls.gridSize, restart]);

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

      const sketch = (p: P5) => {
        p.setup = () => {
          const { width: w, height: h } = sizeRef.current;
          p.createCanvas(w, h);
          p.pixelDensity(Math.min(window.devicePixelRatio, 2));
          p.noSmooth();
        };

        p.draw = () => {
          const { width: w, height: h } = sizeRef.current;
          const ctrl = controlsRef.current;
          const wantSig = `${ctrl.tileset}:${ctrl.gridSize}:${w}x${h}`;

          if (
            !stateRef.current ||
            stateRef.current.signature !== wantSig ||
            lastGen !== generationRef.current
          ) {
            stateRef.current = buildSketchState(ctrl, w, h);
            lastGen = generationRef.current;
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

          renderSketch(p, state, ctrl, w, h);

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

  const tileCount = useMemo(() => TILESETS[controls.tileset].tiles.length, [controls.tileset]);

  return (
    <div className={styles.root}>
      <div ref={hostRef} className={styles.canvasHost} />

      <CollapsiblePanel className={styles.panel} ariaLabel="Wave Function Collapse controls">
        <h3 className={styles.panelTitle}>Wave Function Collapse</h3>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Tileset</p>
          <select
            className={styles.select}
            value={controls.tileset}
            onChange={(e) =>
              setControls((prev) => ({ ...prev, tileset: e.target.value as TilesetName }))
            }
            aria-label="Tileset preset"
          >
            <option value="terrain">Terrain (biomes)</option>
            <option value="pipes">Pipes</option>
            <option value="circuit">Circuit</option>
          </select>
          <div className={styles.statusRow} style={{ marginTop: '0.4rem' }}>
            <span className={styles.statusBadge}>{tileCount} tiles</span>
            <span className={styles.statusBadge} data-state={status}>
              {status}
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Grid</p>
          <SliderControl
            label="Grid Size"
            min={8}
            max={48}
            step={1}
            value={controls.gridSize}
            onChange={(value) => setControls((prev) => ({ ...prev, gridSize: value }))}
            format={(v) => `${v}×${v}`}
          />
          <SliderControl
            label="Steps / Frame"
            min={1}
            max={80}
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
            label="Auto-restart on contradiction"
            checked={controls.autoRestart}
            onChange={(checked) => setControls((prev) => ({ ...prev, autoRestart: checked }))}
          />
          <ToggleControl
            label="Show entropy numbers"
            checked={controls.showEntropy}
            onChange={(checked) => setControls((prev) => ({ ...prev, showEntropy: checked }))}
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

export default WFCProject;
