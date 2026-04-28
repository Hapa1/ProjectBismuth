/**
 * Pathfinding for the Monument Valley scene.
 *
 * After all three WFC passes complete we build a connectivity graph over the
 * grid. Each walkable surface is a node `(x, y, level)` where level 0 = ground
 * floor and level 1 = roof of a cube/wall block. Stairs and ramps create
 * edges that span levels; portals (arches) create edges along their open
 * axis at level 0.
 *
 * Endpoints are chosen automatically: prefer two stair/portal cells in
 * opposite halves of the grid (farthest-first); otherwise fall back to the
 * two reachable nodes with the maximum BFS distance.
 *
 * Pathfinding is A* with Manhattan + 0.5×|Δlevel| heuristic.
 */

import type { TileVariant } from './tiles';

export type Level = 0 | 1;

export interface PathNode {
  x: number;
  y: number;
  level: Level;
}

interface CollapsedScene {
  width: number;
  depth: number;
  catalog: readonly TileVariant[];
  ground: number[]; // variant index per cell, length width*depth
  mid: number[];
  top: number[];
}

function key(x: number, y: number, level: Level): string {
  return `${x},${y},${level}`;
}

function midHasRoof(scene: CollapsedScene, x: number, y: number): boolean {
  const v = scene.catalog[scene.mid[x + y * scene.width]];
  return v?.base.hasRoof === true;
}

function midIsEmpty(scene: CollapsedScene, x: number, y: number): boolean {
  const v = scene.catalog[scene.mid[x + y * scene.width]];
  return v?.baseId === 'empty-mid';
}

function midIsPortal(scene: CollapsedScene, x: number, y: number): boolean {
  const v = scene.catalog[scene.mid[x + y * scene.width]];
  return v?.base.portal === true;
}

function midIsStair(scene: CollapsedScene, x: number, y: number): boolean {
  const v = scene.catalog[scene.mid[x + y * scene.width]];
  return v?.base.stairs != null;
}

function groundIsWalkable(scene: CollapsedScene, x: number, y: number): boolean {
  const v = scene.catalog[scene.ground[x + y * scene.width]];
  return v?.base.walkable === true;
}

/** Returns the cell's open-axis directions for a portal at rotation r. */
function portalOpenDirs(scene: CollapsedScene, x: number, y: number): number[] {
  const v = scene.catalog[scene.mid[x + y * scene.width]];
  if (!v || v.base.portal !== true) return [];
  const dirs: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (v.sockets[i] === 'open') dirs.push(i);
  }
  return dirs;
}

/** Returns the rotated "low direction" of a stair tile at this cell. */
function stairLowDir(scene: CollapsedScene, x: number, y: number): number | null {
  const v = scene.catalog[scene.mid[x + y * scene.width]];
  if (!v || !v.base.stairs) return null;
  return (v.base.stairs.lowDir + v.rotation) % 4;
}

/** Direction vector for [N, E, S, W]. */
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

interface Graph {
  nodes: Map<string, PathNode>;
  edges: Map<string, string[]>;
}

function level0Walkable(scene: CollapsedScene, x: number, y: number): boolean {
  if (!groundIsWalkable(scene, x, y)) return false;
  // Ground walkable only if mid above is empty, a portal, or a stair (you
  // walk across the stair's low side at ground level).
  return (
    midIsEmpty(scene, x, y) ||
    midIsPortal(scene, x, y) ||
    midIsStair(scene, x, y)
  );
}

function level1Walkable(scene: CollapsedScene, x: number, y: number): boolean {
  return midHasRoof(scene, x, y);
}

/** Build the connectivity graph for a fully collapsed scene. */
export function buildGraph(scene: CollapsedScene): Graph {
  const nodes = new Map<string, PathNode>();
  const edges = new Map<string, string[]>();

  const addNode = (x: number, y: number, level: Level) => {
    const k = key(x, y, level);
    if (!nodes.has(k)) {
      nodes.set(k, { x, y, level });
      edges.set(k, []);
    }
    return k;
  };

  const link = (a: string, b: string) => {
    const ea = edges.get(a);
    const eb = edges.get(b);
    if (ea && !ea.includes(b)) ea.push(b);
    if (eb && !eb.includes(a)) eb.push(a);
  };

  // Pass 1: declare nodes.
  for (let y = 0; y < scene.depth; y++) {
    for (let x = 0; x < scene.width; x++) {
      if (level0Walkable(scene, x, y)) addNode(x, y, 0);
      if (level1Walkable(scene, x, y)) addNode(x, y, 1);
    }
  }

  // Pass 2: same-level edges.
  for (let y = 0; y < scene.depth; y++) {
    for (let x = 0; x < scene.width; x++) {
      for (let d = 0; d < 4; d++) {
        const nx = x + DIRS[d][0];
        const ny = y + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= scene.width || ny >= scene.depth) continue;

        // Level 0: connect if both walkable. Portal cells only along their open axis.
        if (level0Walkable(scene, x, y) && level0Walkable(scene, nx, ny)) {
          let allowed = true;
          if (midIsPortal(scene, x, y)) {
            const open = portalOpenDirs(scene, x, y);
            if (!open.includes(d)) allowed = false;
          }
          if (midIsPortal(scene, nx, ny)) {
            const open = portalOpenDirs(scene, nx, ny);
            const opp = (d + 2) % 4;
            if (!open.includes(opp)) allowed = false;
          }
          if (allowed) {
            link(key(x, y, 0), key(nx, ny, 0));
          }
        }

        // Level 1: roofs adjacent (no obstruction check — walking on rooftops).
        if (level1Walkable(scene, x, y) && level1Walkable(scene, nx, ny)) {
          link(key(x, y, 1), key(nx, ny, 1));
        }
      }
    }
  }

  // Pass 3: stair edges. Stair at (x,y) with lowDir = d → low side connects to
  // level 0 of neighbour in direction d; high side connects to level 1 of
  // neighbour in opposite direction.
  for (let y = 0; y < scene.depth; y++) {
    for (let x = 0; x < scene.width; x++) {
      if (!midIsStair(scene, x, y)) continue;
      const lowDir = stairLowDir(scene, x, y);
      if (lowDir === null) continue;
      const highDir = (lowDir + 2) % 4;
      const lowX = x + DIRS[lowDir][0];
      const lowY = y + DIRS[lowDir][1];
      const highX = x + DIRS[highDir][0];
      const highY = y + DIRS[highDir][1];

      // The stair tile itself sits at ground level — add an internal pseudo-node
      // by linking the two neighbours directly through the stair cell.
      const stairKey0 = addNode(x, y, 0);

      if (
        lowX >= 0 &&
        lowY >= 0 &&
        lowX < scene.width &&
        lowY < scene.depth &&
        level0Walkable(scene, lowX, lowY)
      ) {
        link(stairKey0, key(lowX, lowY, 0));
      }
      if (
        highX >= 0 &&
        highY >= 0 &&
        highX < scene.width &&
        highY < scene.depth &&
        level1Walkable(scene, highX, highY)
      ) {
        link(stairKey0, key(highX, highY, 1));
      }
    }
  }

  return { nodes, edges };
}

/** BFS from a start node, returning a distance map. */
function bfsDistances(graph: Graph, startKey: string): Map<string, number> {
  const dist = new Map<string, number>();
  if (!graph.nodes.has(startKey)) return dist;
  dist.set(startKey, 0);
  const queue: string[] = [startKey];
  while (queue.length) {
    const cur = queue.shift() as string;
    const d = dist.get(cur) as number;
    for (const next of graph.edges.get(cur) ?? []) {
      if (dist.has(next)) continue;
      dist.set(next, d + 1);
      queue.push(next);
    }
  }
  return dist;
}

export interface Endpoints {
  start: PathNode;
  end: PathNode;
}

/**
 * Pick two endpoints: prefer cells that are stairs / portals (architectural
 * highlights) and that are reachable from each other; otherwise use two
 * arbitrary reachable nodes maximising BFS distance.
 */
export function pickEndpoints(
  scene: CollapsedScene,
  graph: Graph,
): Endpoints | null {
  const allKeys = Array.from(graph.nodes.keys());
  if (allKeys.length < 2) return null;

  // Build a list of "interesting" candidate keys: stair cells (level 0), and
  // portal cells (level 0).
  const interesting: string[] = [];
  for (const k of allKeys) {
    const node = graph.nodes.get(k);
    if (!node || node.level !== 0) continue;
    if (
      midIsStair(scene, node.x, node.y) ||
      midIsPortal(scene, node.x, node.y)
    ) {
      interesting.push(k);
    }
  }

  // Farthest-first across interesting candidates.
  const tryPair = (candidates: string[]): Endpoints | null => {
    if (candidates.length < 2) return null;
    let bestPair: [string, string] | null = null;
    let bestDist = -1;
    // O(n) cap: pick first as anchor, find farthest, then re-pick.
    const anchor = candidates[0];
    const distA = bfsDistances(graph, anchor);
    let far1 = anchor;
    let far1D = 0;
    for (const k of candidates) {
      const d = distA.get(k);
      if (d !== undefined && d > far1D) {
        far1D = d;
        far1 = k;
      }
    }
    const distF = bfsDistances(graph, far1);
    for (const k of candidates) {
      const d = distF.get(k);
      if (d !== undefined && d > bestDist) {
        bestDist = d;
        bestPair = [far1, k];
      }
    }
    if (!bestPair || bestDist <= 0) return null;
    const a = graph.nodes.get(bestPair[0]);
    const b = graph.nodes.get(bestPair[1]);
    if (!a || !b) return null;
    return { start: a, end: b };
  };

  const fromInteresting = tryPair(interesting);
  if (fromInteresting) return fromInteresting;

  // Fall back: pick any two reachable nodes with max distance.
  return tryPair(allKeys);
}

/** A* path from start to end. Returns node sequence including endpoints, or null. */
export function findPath(
  graph: Graph,
  start: PathNode,
  end: PathNode,
): PathNode[] | null {
  const startK = key(start.x, start.y, start.level);
  const endK = key(end.x, end.y, end.level);
  if (!graph.nodes.has(startK) || !graph.nodes.has(endK)) return null;

  const heuristic = (k: string): number => {
    const n = graph.nodes.get(k);
    if (!n) return Infinity;
    return Math.abs(n.x - end.x) + Math.abs(n.y - end.y) + 0.5 * Math.abs(n.level - end.level);
  };

  const open = new Set<string>([startK]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(startK, 0);
  const fScore = new Map<string, number>();
  fScore.set(startK, heuristic(startK));

  while (open.size) {
    // Pick lowest fScore from open set.
    let cur = '';
    let curF = Infinity;
    for (const k of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < curF) {
        curF = f;
        cur = k;
      }
    }
    if (cur === endK) {
      const path: PathNode[] = [];
      let c = cur;
      while (c) {
        const node = graph.nodes.get(c);
        if (node) path.push(node);
        const prev = cameFrom.get(c);
        if (!prev) break;
        c = prev;
      }
      path.reverse();
      return path;
    }

    open.delete(cur);
    const curG = gScore.get(cur) ?? Infinity;
    for (const next of graph.edges.get(cur) ?? []) {
      const tentativeG = curG + 1;
      const prevG = gScore.get(next) ?? Infinity;
      if (tentativeG < prevG) {
        cameFrom.set(next, cur);
        gScore.set(next, tentativeG);
        fScore.set(next, tentativeG + heuristic(next));
        open.add(next);
      }
    }
  }

  return null;
}
