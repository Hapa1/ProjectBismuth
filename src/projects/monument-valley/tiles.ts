/**
 * Monument Valley tile catalog.
 *
 * Source tileset: public/images/Gemini_Generated_Image_g5aq3kg5aq3kg5aq.png — a
 * 6×4 grid of pastel isometric sprites. Indices 0..23 = row*6 + col.
 *
 * Each base tile declares:
 *   - layer: which of the three WFC passes (ground / mid / top) it belongs to
 *   - symmetry: X = full (no rotation), I = 2-fold (0,2), L = 4-fold (0..3)
 *   - sockets [N,E,S,W]: tag for the cardinal sides at rotation 0
 *   - weight: WFC weighted-random selection
 *
 * Rotated variants are synthesised at load time. Sockets rotate with the tile
 * via `rotatedSockets[i] = baseSockets[(i - rotation + 4) % 4]`.
 *
 * NB: spinning a 2D isometric sprite by 90° is geometrically incorrect — the
 * ground plane shears. We accept this as a stylised artefact and compensate
 * with a per-rotation tint (see `ROTATION_TINTS`) so the "left" face stays
 * darker than the "right" face in the silhouette. Tiles whose interior art
 * would obviously break (deep arches with directional shadows) use only the
 * symmetry class indicated below; others fall back to the source artwork.
 */

export type Layer = 'ground' | 'mid' | 'top';
export type Symmetry = 'X' | 'I' | 'L';

export type SocketTag =
  | 'none' // wildcard — compatible with anything (ground/top empties only)
  | 'air' // explicit empty-mid space — compatible with most things EXCEPT stair-high
  | 'floor'
  | 'dais'
  // Shaded walls: cube-front colours. Two cube faces only meet if same shade.
  | 'wall-coral'
  | 'wall-lavender'
  | 'wall-sage'
  | 'open'
  | 'rail'
  | 'crenel'
  | 'stair-low'
  | 'stair-high';

/** Visible body shade of a tile — used for stacking + adjacency rules. */
export type Shade = 'coral' | 'lavender' | 'sage' | 'neutral';

export type BaseTileId =
  | 'empty-ground'
  | 'floor-plain'
  | 'floor-ornament'
  | 'floor-medallion'
  | 'dais-stepped'
  | 'empty-mid'
  | 'cube-plain'
  | 'cube-arch'
  | 'temple-balcony'
  | 'corner-inner'
  | 'corner-outer'
  | 'walls-L-tall'
  | 'stairs-high'
  | 'stairs-low'
  | 'ramp'
  | 'portal-arch'
  | 'column'
  | 'empty-top'
  | 'tower-crenel'
  | 'wall-curve'
  | 'top-cube-coral'
  | 'top-cube-lavender'
  | 'top-arch-coral';

export interface BaseTile {
  id: BaseTileId;
  layer: Layer;
  symmetry: Symmetry;
  /** Source sprite index in the 6×4 sheet, or null for synthetic empty tiles. */
  sourceIndex: number | null;
  /**
   * Optional paired-source index providing the rotation-2 (180°) facing. Used
   * for tiles with directional art whose 180° counterpart exists in the sheet
   * (e.g. cube-arch 4↔6). When present, rotation 2 is rendered from this
   * sprite instead of being synthesised geometrically.
   */
  pairedSourceIndex?: number;
  sockets: [SocketTag, SocketTag, SocketTag, SocketTag];
  weight: number;
  /** Visual body shade. Top-layer tiles will only place on a mid tile of the
   *  same shade (see index.tsx top-layer cellBias). Defaults to 'neutral'. */
  shade?: Shade;
  /** Multiplicative size adjustment applied at draw time. Defaults to 1. Use
   *  for sprites whose source art is naturally over- or under-sized relative
   *  to neighbouring tiles. */
  renderScale?: number;
  /**
   * Connectivity hint for the pathfinder. Defaults are inferred from layer/sockets
   * but explicit values document intent.
   */
  walkable?: boolean;
  /** True if this mid-layer tile creates a walkable surface on top (i.e. roof). */
  hasRoof?: boolean;
  /** Tile is a transition between layers (stairs, ramp). 'low'→'high' direction faces. */
  stairs?: { lowDir: 0 | 1 | 2 | 3 } | null;
  /** Tile is a horizontal portal connecting mid-layer surfaces through it. */
  portal?: boolean;
}

/**
 * Per-rotation tints. Rotation 0 = identity. Rotation 2 (paired-source 180°)
 * is rendered from a different sprite that already has correct lighting, so no
 * tint compensation is needed there. We keep the array for API compatibility.
 */
export const ROTATION_TINTS: ReadonlyArray<readonly [number, number, number]> = [
  [255, 255, 255],
  [255, 255, 255],
  [255, 255, 255],
  [255, 255, 255],
];

export const BASE_TILES: readonly BaseTile[] = [
  // ─── GROUND LAYER ───────────────────────────────────────────────────────
  {
    id: 'empty-ground',
    layer: 'ground',
    symmetry: 'X',
    sourceIndex: null,
    sockets: ['none', 'none', 'none', 'none'],
    // Weight 0 — ground is always a real floor tile; no air gaps.
    weight: 0,
    walkable: false,
  },
  {
    id: 'floor-plain',
    layer: 'ground',
    symmetry: 'X',
    sourceIndex: 0,
    sockets: ['floor', 'floor', 'floor', 'floor'],
    weight: 6,
    walkable: true,
  },
  {
    id: 'floor-ornament',
    layer: 'ground',
    symmetry: 'X',
    sourceIndex: 2,
    sockets: ['floor', 'floor', 'floor', 'floor'],
    weight: 1.2,
    walkable: true,
  },
  {
    id: 'floor-medallion',
    layer: 'ground',
    symmetry: 'X',
    sourceIndex: 22,
    sockets: ['floor', 'floor', 'floor', 'floor'],
    weight: 0.6,
    walkable: true,
  },
  {
    id: 'dais-stepped',
    layer: 'ground',
    symmetry: 'X',
    sourceIndex: 23,
    sockets: ['dais', 'dais', 'dais', 'dais'],
    weight: 0.35,
    walkable: true,
  },

  // ─── MID LAYER ──────────────────────────────────────────────────────────
  {
    id: 'empty-mid',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: null,
    // 'air' = explicit open mid-space. NOT compatible with stair-high so stairs
    // are forced to abut a real cube wall on their high side.
    sockets: ['air', 'air', 'air', 'air'],
    weight: 4.5,
    walkable: false,
  },
  {
    id: 'cube-plain',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: 1,
    sockets: ['wall-coral', 'wall-coral', 'wall-coral', 'wall-coral'],
    weight: 1.4,
    shade: 'coral',
    hasRoof: true,
  },
  {
    id: 'cube-arch',
    layer: 'mid',
    // Two-source pair (4 + 6) gives us rotations 0 and 2 from the sheet.
    symmetry: 'I',
    sourceIndex: 4,
    pairedSourceIndex: 6,
    // 'open' on the arch faces accepts any shade so people can walk through.
    sockets: ['open', 'wall-coral', 'open', 'wall-coral'],
    weight: 0.7,
    shade: 'coral',
    portal: true,
    hasRoof: true,
  },
  {
    id: 'temple-balcony',
    layer: 'mid',
    // Two-source pair (5 + 7) gives rotations 0 and 2.
    symmetry: 'I',
    sourceIndex: 5,
    pairedSourceIndex: 7,
    sockets: ['wall-lavender', 'wall-lavender', 'wall-lavender', 'wall-lavender'],
    weight: 0.45,
    shade: 'lavender',
    hasRoof: true,
  },
  {
    id: 'corner-inner',
    layer: 'mid',
    // Only one source facing exists — keep a single rotation to avoid sheared art.
    symmetry: 'X',
    sourceIndex: 8,
    sockets: ['wall-coral', 'wall-coral', 'air', 'air'],
    weight: 0.6,
    shade: 'coral',
    hasRoof: true,
  },
  {
    id: 'corner-outer',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: 9,
    sockets: ['air', 'air', 'wall-coral', 'wall-coral'],
    weight: 0.6,
    shade: 'coral',
    hasRoof: true,
  },
  {
    id: 'walls-L-tall',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: 11,
    sockets: ['air', 'air', 'wall-coral', 'wall-coral'],
    weight: 0.5,
    shade: 'coral',
    hasRoof: true,
  },
  {
    id: 'stairs-high',
    layer: 'mid',
    // Only one facing in the sheet; keep single rotation.
    symmetry: 'X',
    sourceIndex: 10,
    // High side requires wall/open (real cube or arch); 'air' explicitly
    // disallowed via COMPAT_PAIRS so stairs anchor to architecture.
    sockets: ['stair-high', 'air', 'stair-low', 'air'],
    weight: 0.7,
    stairs: { lowDir: 2 },
  },
  {
    id: 'stairs-low',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: 12,
    sockets: ['stair-high', 'air', 'stair-low', 'air'],
    weight: 0.7,
    stairs: { lowDir: 2 },
  },
  {
    id: 'ramp',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: 13,
    sockets: ['stair-high', 'air', 'stair-low', 'air'],
    weight: 0.55,
    stairs: { lowDir: 2 },
  },
  {
    id: 'portal-arch',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: 14,
    // Sage portal — walls on E/W are sage; openings on N/S are universal.
    sockets: ['open', 'wall-sage', 'open', 'wall-sage'],
    weight: 0.55,
    shade: 'sage',
    // Source art reads visually larger than other 1-tile sprites; trim down.
    renderScale: 0.85,
    portal: true,
  },
  {
    id: 'column',
    layer: 'mid',
    symmetry: 'X',
    sourceIndex: 15,
    // Free-standing pillar; only allowed in open air. Low weight keeps it rare.
    sockets: ['air', 'air', 'air', 'air'],
    weight: 0.08,
  },

  // ─── TOP LAYER ──────────────────────────────────────────────────────────
  {
    id: 'empty-top',
    layer: 'top',
    symmetry: 'X',
    sourceIndex: null,
    sockets: ['none', 'none', 'none', 'none'],
    weight: 9,
  },
  {
    id: 'tower-crenel',
    layer: 'top',
    symmetry: 'X',
    sourceIndex: 18,
    sockets: ['crenel', 'crenel', 'crenel', 'crenel'],
    weight: 0.5,
    shade: 'lavender',
  },
  {
    id: 'wall-curve',
    layer: 'top',
    symmetry: 'X',
    sourceIndex: 21,
    sockets: ['wall-coral', 'open', 'wall-coral', 'open'],
    weight: 0.3,
    shade: 'coral',
  },
  // Stackable cubes — reuse the mid-layer cube sprites so a coral cube on top
  // of a coral cube reads as a two-storey block. The shade-coupled top bias
  // already enforces matching shades (or pairs with empty-top above non-roof
  // mid cells), so these tiles only appear above another cube of their shade.
  {
    id: 'top-cube-coral',
    layer: 'top',
    symmetry: 'X',
    sourceIndex: 1,
    sockets: ['wall-coral', 'wall-coral', 'wall-coral', 'wall-coral'],
    weight: 1.6,
    shade: 'coral',
    hasRoof: true,
  },
  {
    id: 'top-cube-lavender',
    layer: 'top',
    symmetry: 'I',
    sourceIndex: 5,
    pairedSourceIndex: 7,
    sockets: ['wall-lavender', 'wall-lavender', 'wall-lavender', 'wall-lavender'],
    weight: 0.5,
    shade: 'lavender',
    hasRoof: true,
  },
  {
    id: 'top-arch-coral',
    layer: 'top',
    symmetry: 'I',
    sourceIndex: 4,
    pairedSourceIndex: 6,
    sockets: ['open', 'wall-coral', 'open', 'wall-coral'],
    weight: 0.4,
    shade: 'coral',
    hasRoof: true,
  },
];

/**
 * Tile note: source index 3 is the empty-diamond marker — used as an
 * intentional placeholder in the source sheet and excluded from generation.
 */

export interface TileVariant {
  /** Unique index in the expanded catalog. */
  index: number;
  baseId: BaseTileId;
  layer: Layer;
  rotation: 0 | 1 | 2 | 3;
  /** Sockets [N,E,S,W] after rotation. */
  sockets: [SocketTag, SocketTag, SocketTag, SocketTag];
  weight: number;
  base: BaseTile;
}

/**
 * Rotation set per symmetry class. We only emit rotations for which we have
 * actual sprite artwork (rotation 0 = canonical sprite, rotation 2 = paired
 * 180° sprite when present). The geometric `'L'` 4-fold rotation is no longer
 * used at runtime — synthetic 90° rotation of an isometric sprite produces an
 * incorrect projection.
 */
function rotationsFor(base: BaseTile): Array<0 | 1 | 2 | 3> {
  if (base.symmetry === 'I' && base.pairedSourceIndex !== undefined) return [0, 2];
  return [0];
}

function rotateSockets(
  sockets: readonly [SocketTag, SocketTag, SocketTag, SocketTag],
  rotation: 0 | 1 | 2 | 3,
): [SocketTag, SocketTag, SocketTag, SocketTag] {
  const out: [SocketTag, SocketTag, SocketTag, SocketTag] = [
    'none',
    'none',
    'none',
    'none',
  ];
  for (let i = 0; i < 4; i++) {
    out[i] = sockets[(i - rotation + 4) % 4];
  }
  return out;
}

/**
 * Expand BASE_TILES into the full per-rotation catalog. Index assignment is
 * stable (group by base, then rotation ascending), so consumers can rely on
 * consecutive indices for the same base id.
 */
export function buildVariantCatalog(): readonly TileVariant[] {
  const variants: TileVariant[] = [];
  for (const base of BASE_TILES) {
    for (const rotation of rotationsFor(base)) {
      variants.push({
        index: variants.length,
        baseId: base.id,
        layer: base.layer,
        rotation,
        sockets: rotateSockets(base.sockets, rotation),
        weight: base.weight,
        base,
      });
    }
  }
  return variants;
}

/**
 * Compatibility table: socket A on one cell's face must accept socket B on the
 * neighbour's facing edge. `'none'` is a wildcard.
 *
 * The whitelist is intentionally permissive — sparse architecture in a sea of
 * `empty-mid` is the target aesthetic, not contiguous walls, and overly strict
 * sockets cause WFC contradictions on small grids.
 */
const COMPAT_PAIRS: ReadonlyArray<readonly [SocketTag, SocketTag]> = [
  ['floor', 'floor'],
  ['floor', 'dais'],
  ['dais', 'dais'],
  // Shaded walls only meet a wall of identical shade. Each can also face air
  // (gap between buildings) or open (arch opening).
  ['wall-coral', 'wall-coral'],
  ['wall-lavender', 'wall-lavender'],
  ['wall-sage', 'wall-sage'],
  ['wall-coral', 'air'],
  ['wall-lavender', 'air'],
  ['wall-sage', 'air'],
  ['wall-coral', 'open'],
  ['wall-lavender', 'open'],
  ['wall-sage', 'open'],
  ['open', 'open'],
  ['open', 'air'],
  ['rail', 'rail'],
  ['rail', 'open'],
  ['rail', 'air'],
  ['crenel', 'crenel'],
  ['crenel', 'rail'],
  ['crenel', 'air'],
  ['air', 'air'],
  // Stair LOW end can step down into floor / arch / open air.
  ['stair-low', 'floor'],
  ['stair-low', 'open'],
  ['stair-low', 'air'],
  // Stair HIGH end MUST abut a wall (any shade) or open arch — never bare air.
  ['stair-high', 'wall-coral'],
  ['stair-high', 'wall-lavender'],
  ['stair-high', 'wall-sage'],
  ['stair-high', 'open'],
];

const COMPAT_LOOKUP: ReadonlySet<string> = new Set(
  COMPAT_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
);

export function sideCompat(a: SocketTag, b: SocketTag): boolean {
  if (a === 'none' || b === 'none') return true;
  if (a === b) return true;
  return COMPAT_LOOKUP.has(`${a}|${b}`);
}

/** Indices grouped by layer — used to seed each WFC pass. */
export interface LayerIndices {
  ground: number[];
  mid: number[];
  top: number[];
  emptyGround: number;
  emptyMid: number;
  emptyTop: number;
}

export function buildLayerIndices(catalog: readonly TileVariant[]): LayerIndices {
  const ground: number[] = [];
  const mid: number[] = [];
  const top: number[] = [];
  let emptyGround = -1;
  let emptyMid = -1;
  let emptyTop = -1;
  for (const v of catalog) {
    if (v.layer === 'ground') ground.push(v.index);
    else if (v.layer === 'mid') mid.push(v.index);
    else top.push(v.index);
    if (v.baseId === 'empty-ground' && v.rotation === 0) emptyGround = v.index;
    if (v.baseId === 'empty-mid' && v.rotation === 0) emptyMid = v.index;
    if (v.baseId === 'empty-top' && v.rotation === 0) emptyTop = v.index;
  }
  return { ground, mid, top, emptyGround, emptyMid, emptyTop };
}
