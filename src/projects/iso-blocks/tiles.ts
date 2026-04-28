/**
 * Procedural isometric block definitions for the iso-blocks WFC project.
 *
 * Each block is a unit cube with three visible faces (top / left / right) and
 * six face tags used by the 3D WFC adjacency rules. Sprite art (e.g. Kenney's
 * isometric-blocks pack) can be swapped in later by adding a `src: string`
 * field and rendering an image in place of `drawIsoCube`.
 */

export type BlockId = 'air' | 'stone' | 'dirt' | 'crystal' | 'bismuth';

export interface BlockDef {
  id: BlockId;
  /** Render weight — higher = more common. */
  weight: number;
  /** Face tag matched on the +Z (top) neighbor's -Z face. */
  top: string;
  /** Face tag matched on the -Z (bottom) neighbor's +Z face. */
  bottom: string;
  /** Face tag for all four horizontal neighbors. */
  side: string;
  /** True if this block should be rendered (air is invisible). */
  visible: boolean;
}

/**
 * Face tag '*' is a wildcard that matches any other tag. Air uses wildcards
 * so it can sit next to (and on top of) any solid; bismuth's top tag of
 * 'air-only' is matched only by air's wildcard bottom, which keeps bismuth
 * properly capped by sky.
 */
export const BLOCKS: BlockDef[] = [
  {
    id: 'air',
    weight: 6,
    top: '*',
    bottom: '*',
    side: '*',
    visible: false,
  },
  {
    id: 'stone',
    weight: 3,
    top: 'solid',
    bottom: 'solid',
    side: 'stone',
    visible: true,
  },
  {
    id: 'dirt',
    weight: 2,
    top: 'solid',
    bottom: 'solid',
    side: 'dirt',
    visible: true,
  },
  {
    id: 'crystal',
    weight: 0.6,
    top: 'crystal-cap',
    bottom: 'solid',
    side: 'crystal',
    visible: true,
  },
  {
    id: 'bismuth',
    weight: 0.25,
    top: 'air-only',
    bottom: 'crystal-cap',
    side: 'bismuth',
    visible: true,
  },
];

/**
 * Cross-type horizontal compatibility. Two blocks are valid horizontal
 * neighbors if their `side` tags are equal OR appear together here. Air's
 * `side === 'air'` is matched against every other side via a wildcard so the
 * sky can sit next to any solid.
 */
const SIDE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['stone', 'dirt'],
  ['stone', 'crystal'],
];

const SIDE_LOOKUP: ReadonlySet<string> = new Set(
  SIDE_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
);

export function sideCompat(a: string, b: string): boolean {
  if (a === '*' || b === '*') return true;
  if (a === b) return true;
  return SIDE_LOOKUP.has(`${a}|${b}`);
}

/** Vertical neighbors: exact match, or wildcard on either side. */
export function vertCompat(lowerTop: string, upperBottom: string): boolean {
  if (lowerTop === '*' || upperBottom === '*') return true;
  return lowerTop === upperBottom;
}

export const BLOCK_INDEX: Record<BlockId, number> = BLOCKS.reduce(
  (acc, block, i) => {
    acc[block.id] = i;
    return acc;
  },
  {} as Record<BlockId, number>,
);

export const ALL_INDICES: number[] = BLOCKS.map((_, i) => i);
export const AIR_INDEX = BLOCK_INDEX.air;
export const GROUND_INDICES: number[] = [BLOCK_INDEX.stone, BLOCK_INDEX.dirt];
