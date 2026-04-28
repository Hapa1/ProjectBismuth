import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './WFC.module.css';

type TilesetName = 'pipes' | 'circuit' | 'terrain';

interface TileDef {
  sockets: [string, string, string, string];
  weight: number;
  drawId: string;
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
  tileset: 'pipes',
  gridSize: 24,
  stepsPerFrame: 12,
  autoRestart: true,
  showEntropy: false,
  paused: false,
};

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

function buildTerrainTiles(): TileDef[] {
  const tiles: TileDef[] = [];
  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [
    ['W', 'S'],
    ['S', 'G'],
  ];
  for (const [a, b] of pairs) {
    for (let mask = 0; mask < 16; mask++) {
      const q: [string, string, string, string] = [
        mask & 1 ? b : a,
        mask & 2 ? b : a,
        mask & 4 ? b : a,
        mask & 8 ? b : a,
      ];
      const key = q.join('');
      if (seen.has(key)) continue;
      seen.add(key);
      const sockets: [string, string, string, string] = [
        q[0] + q[1],
        q[1] + q[3],
        q[2] + q[3],
        q[0] + q[2],
      ];
      const isPure = q[0] === q[1] && q[1] === q[2] && q[2] === q[3];
      tiles.push({ sockets, weight: isPure ? 4 : 1, drawId: key });
    }
  }
  return tiles;
}

const TERRAIN_COLORS: Record<string, string> = {
  W: '#1e497a',
  S: '#d8b66a',
  G: '#3a7d3a',
};

const TERRAIN_TILESET: Tileset = {
  name: 'terrain',
  label: 'Terrain',
  tiles: buildTerrainTiles(),
  drawTile: (p, tile, size) => {
    const q = tile.drawId.split('');
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
  failed = false;
  done = false;

  constructor(rows: number, cols: number, tiles: TileDef[]) {
    this.rows = rows;
    this.cols = cols;
    this.tiles = tiles;
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
    let totalW = 0;
    for (const idx of cell.options) totalW += this.tiles[idx].weight;
    let r = Math.random() * totalW;
    let chosen = cell.options[0];
    for (const idx of cell.options) {
      r -= this.tiles[idx].weight;
      if (r <= 0) {
        chosen = idx;
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
  return {
    wfc: new WFC(grid, grid, tileset.tiles),
    tileset,
    cellSize,
    offsetX,
    offsetY,
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
        p.fill(v, v, v + 8);
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

      <aside className={styles.panel} aria-label="Wave Function Collapse controls">
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
            <option value="pipes">Pipes</option>
            <option value="circuit">Circuit</option>
            <option value="terrain">Terrain (biomes)</option>
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
      </aside>
    </div>
  );
}

export default WFCProject;
