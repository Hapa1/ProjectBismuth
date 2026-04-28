/**
 * 2D WFC engine for one layer of a Monument Valley scene.
 *
 * Cells form a `width × depth` grid. Each cell starts with the full set of
 * variant indices allowed for the active layer, plus optional per-cell biases
 * (edge cells favour the `empty` variant, etc.). Collapse uses min-entropy
 * selection with weighted random and AC-3 propagation across 4-neighbours.
 *
 * On contradiction the engine records `failed = true`; the caller decides
 * whether to retry the layer or restart everything.
 */

import { sideCompat, type TileVariant } from './tiles';

export interface WfcCell {
  options: number[];
  collapsed: boolean;
  collapsedAt: number;
}

export interface WfcOptions {
  width: number;
  depth: number;
  catalog: readonly TileVariant[];
  /** Indices allowed in each cell at start (defines the layer). */
  layerIndices: readonly number[];
  /** Optional per-cell weight multipliers. Indexed `[x + y*width][variantIndex]`. */
  cellBias?: ReadonlyArray<ReadonlyMap<number, number>>;
}

/** Direction vectors for [N, E, S, W]. */
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Index of the opposing socket on a neighbour for direction d: N↔S, E↔W. */
const OPPOSITE: ReadonlyArray<number> = [2, 3, 0, 1];

export class Wfc2D {
  readonly width: number;
  readonly depth: number;
  readonly catalog: readonly TileVariant[];
  readonly cells: WfcCell[];
  readonly cellBias: ReadonlyArray<ReadonlyMap<number, number>> | undefined;
  failed = false;
  done = false;

  constructor(opts: WfcOptions) {
    this.width = opts.width;
    this.depth = opts.depth;
    this.catalog = opts.catalog;
    this.cellBias = opts.cellBias;
    this.cells = Array.from({ length: this.width * this.depth }, () => ({
      options: opts.layerIndices.slice(),
      collapsed: false,
      collapsedAt: -1,
    }));
  }

  idx(x: number, y: number): number {
    return x + y * this.width;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.depth;
  }

  /**
   * Force-collapse a cell to a specific variant index (used to seed e.g. the
   * border of the grid). Skips propagation if the cell is already collapsed.
   */
  forceCollapse(x: number, y: number, variantIndex: number): void {
    const i = this.idx(x, y);
    const cell = this.cells[i];
    if (cell.collapsed) return;
    if (!cell.options.includes(variantIndex)) {
      this.failed = true;
      return;
    }
    cell.options = [variantIndex];
    cell.collapsed = true;
    cell.collapsedAt = performance.now();
    this.propagate(i);
  }

  /** Returns true if work was performed. Mutates `done`/`failed`. */
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

    // Weighted choice with optional per-cell bias.
    const cell = this.cells[best];
    const bias = this.cellBias?.[best];
    let totalW = 0;
    for (const idx of cell.options) {
      const w = this.catalog[idx].weight * (bias?.get(idx) ?? 1);
      totalW += Math.max(0, w);
    }
    if (totalW <= 0) {
      this.failed = true;
      return false;
    }
    let r = Math.random() * totalW;
    let chosen = cell.options[0];
    for (const idx of cell.options) {
      const w = this.catalog[idx].weight * (bias?.get(idx) ?? 1);
      r -= Math.max(0, w);
      if (r <= 0) {
        chosen = idx;
        break;
      }
    }
    cell.options = [chosen];
    cell.collapsed = true;
    cell.collapsedAt = performance.now();

    this.propagate(best);
    return true;
  }

  /** Run until done/failed or cap reached. */
  runToCompletion(maxSteps = 100000): void {
    for (let i = 0; i < maxSteps; i++) {
      if (!this.step()) return;
    }
  }

  /** Returns the collapsed variant index, or -1 if not collapsed. */
  resultAt(x: number, y: number): number {
    const c = this.cells[this.idx(x, y)];
    if (!c.collapsed) return -1;
    return c.options[0];
  }

  private propagate(start: number): void {
    const stack: number[] = [start];
    while (stack.length) {
      const i = stack.pop() as number;
      const cy = Math.floor(i / this.width);
      const cx = i - cy * this.width;
      const selfOpts = this.cells[i].options;

      for (let d = 0; d < 4; d++) {
        const dir = DIRS[d];
        const nx = cx + dir[0];
        const ny = cy + dir[1];
        if (!this.inBounds(nx, ny)) continue;
        const ni = this.idx(nx, ny);
        const ncell = this.cells[ni];
        if (ncell.options.length <= 1) continue;

        const opp = OPPOSITE[d];
        const before = ncell.options.length;
        const filtered: number[] = [];
        for (const nIdx of ncell.options) {
          const nSocket = this.catalog[nIdx].sockets[opp];
          let ok = false;
          for (const sIdx of selfOpts) {
            const sSocket = this.catalog[sIdx].sockets[d];
            if (sideCompat(sSocket, nSocket)) {
              ok = true;
              break;
            }
          }
          if (ok) filtered.push(nIdx);
        }

        if (filtered.length !== before) {
          ncell.options = filtered;
          if (filtered.length === 0) {
            this.failed = true;
            return;
          }
          if (filtered.length === 1 && !ncell.collapsed) {
            ncell.collapsed = true;
            ncell.collapsedAt = performance.now();
          }
          stack.push(ni);
        }
      }
    }
  }
}
