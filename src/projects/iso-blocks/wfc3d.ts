/**
 * 3D Wave Function Collapse engine for voxel grids.
 *
 * Cells are indexed by (x, y, z) where +Z is up. Adjacency uses 6-connectivity
 * with horizontal compatibility delegated to `sideCompat` and vertical
 * compatibility delegated to `vertCompat` from `./tiles`.
 *
 * Bottom layer (z=0) is pre-seeded to ground blocks; top layer (z=H-1) is
 * pre-seeded to air. Both eliminate the most common contradiction sources.
 */

import {
  ALL_INDICES,
  AIR_INDEX,
  BLOCKS,
  GROUND_INDICES,
  sideCompat,
  vertCompat,
} from './tiles';

export interface VoxelCell {
  options: number[];
  collapsed: boolean;
  /** Performance.now() at moment of full collapse. -1 if not yet collapsed. */
  collapsedAt: number;
}

export interface Wfc3DOptions {
  width: number;
  depth: number;
  height: number;
}

const NEIGHBORS: ReadonlyArray<readonly [number, number, number, 'h' | 'v', 'self-top' | 'self-bottom' | null]> = [
  [+1, 0, 0, 'h', null], // +X
  [-1, 0, 0, 'h', null], // -X
  [0, +1, 0, 'h', null], // +Y
  [0, -1, 0, 'h', null], // -Y
  [0, 0, +1, 'v', 'self-top'], // +Z (neighbor is above)
  [0, 0, -1, 'v', 'self-bottom'], // -Z (neighbor is below)
];

export class Wfc3D {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly cells: VoxelCell[];
  failed = false;
  done = false;

  constructor(opts: Wfc3DOptions) {
    this.width = opts.width;
    this.depth = opts.depth;
    this.height = opts.height;
    this.cells = Array.from({ length: this.width * this.depth * this.height }, () => ({
      options: ALL_INDICES.slice(),
      collapsed: false,
      collapsedAt: -1,
    }));

    // Seed: bottom layer = ground only; top layer = air only.
    for (let y = 0; y < this.depth; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[this.idx(x, y, 0)].options = GROUND_INDICES.slice();
        this.cells[this.idx(x, y, this.height - 1)].options = [AIR_INDEX];
        this.cells[this.idx(x, y, this.height - 1)].collapsed = true;
      }
    }
  }

  idx(x: number, y: number, z: number): number {
    return x + y * this.width + z * this.width * this.depth;
  }

  inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= 0 && x < this.width && y >= 0 && y < this.depth && z >= 0 && z < this.height
    );
  }

  /** Returns true if work was performed. Sets `done` / `failed` as side effects. */
  step(): boolean {
    if (this.failed || this.done) return false;

    // Min-entropy cell selection (with tiny noise to break ties).
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

    // Weighted choice.
    const cell = this.cells[best];
    let totalW = 0;
    for (const idx of cell.options) totalW += BLOCKS[idx].weight;
    let r = Math.random() * totalW;
    let chosen = cell.options[0];
    for (const idx of cell.options) {
      r -= BLOCKS[idx].weight;
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

  private propagate(start: number): void {
    const stack: number[] = [start];
    while (stack.length) {
      const i = stack.pop() as number;
      const cz = Math.floor(i / (this.width * this.depth));
      const rem = i - cz * this.width * this.depth;
      const cy = Math.floor(rem / this.width);
      const cx = rem - cy * this.width;
      const selfOpts = this.cells[i].options;

      for (const [dx, dy, dz, axis, selfFace] of NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        const nz = cz + dz;
        if (!this.inBounds(nx, ny, nz)) continue;
        const ni = this.idx(nx, ny, nz);
        const ncell = this.cells[ni];
        if (ncell.options.length <= 1) continue;

        const before = ncell.options.length;
        const filtered: number[] = [];
        for (const nIdx of ncell.options) {
          let ok = false;
          for (const sIdx of selfOpts) {
            if (axis === 'h') {
              if (sideCompat(BLOCKS[sIdx].side, BLOCKS[nIdx].side)) {
                ok = true;
                break;
              }
            } else if (selfFace === 'self-top') {
              // neighbor is above; self.top must match neighbor.bottom
              if (vertCompat(BLOCKS[sIdx].top, BLOCKS[nIdx].bottom)) {
                ok = true;
                break;
              }
            } else {
              // neighbor is below; self.bottom must match neighbor.top
              if (vertCompat(BLOCKS[nIdx].top, BLOCKS[sIdx].bottom)) {
                ok = true;
                break;
              }
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
