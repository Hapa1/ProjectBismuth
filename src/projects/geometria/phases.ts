// Sacred-geometry construction phases for the Geometria project.
// Each phase declares an ordered list of 2D primitives (circles/lines).
// On build we flatten everything into a single ribbon mesh whose vertices
// carry a global `aArc` coordinate (0..1 across the whole construction);
// the stroke shader uses `uReveal` to discard not-yet-drawn segments.

export type Vec2 = readonly [number, number];

export interface CirclePrimitive {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface LinePrimitive {
  kind: 'line';
  a: Vec2;
  b: Vec2;
}

export type Primitive = CirclePrimitive | LinePrimitive;

export interface Phase {
  id: string;
  label: string;
  description: string;
  primitives: Primitive[];
}

// ---------------------------------------------------------------------------
// Geometry constants
// ---------------------------------------------------------------------------

export const BASE_RADIUS = 0.65;
export const FRUIT_RADIUS = 0.32;

const TAU = Math.PI * 2;

function ringPositions(radius: number, count: number, phase = 0): Vec2[] {
  return Array.from({ length: count }, (_, i) => {
    const a = phase + (i / count) * TAU;
    return [radius * Math.cos(a), radius * Math.sin(a)] as const;
  });
}

// ---------------------------------------------------------------------------
// Standard sacred-geometry centre sets
// ---------------------------------------------------------------------------

const ORIGIN: Vec2 = [0, 0] as const;

// Seed of Life: 6 circles around the centre, hex-spaced at distance R.
const seedCenters: Vec2[] = ringPositions(BASE_RADIUS, 6, 0);

// Flower of Life outer ring: 12 circles forming the standard outer band.
// Six on-axis at distance 2R, six off-axis at distance R*sqrt(3).
const flowerOuter: Vec2[] = [
  ...ringPositions(2 * BASE_RADIUS, 6, 0),
  ...ringPositions(BASE_RADIUS * Math.sqrt(3), 6, Math.PI / 6),
];

// Fruit of Life: 13 non-overlapping circles — the centre, the 6 seed centres,
// and the 6 on-axis outer centres at distance 2R.
const fruitCenters: Vec2[] = [
  ORIGIN,
  ...seedCenters,
  ...ringPositions(2 * BASE_RADIUS, 6, 0),
];

// Metatron's Cube: every unique line between the 13 fruit centres.
function buildMetatronEdges(centres: Vec2[]): LinePrimitive[] {
  const lines: LinePrimitive[] = [];
  for (let i = 0; i < centres.length; i++) {
    for (let j = i + 1; j < centres.length; j++) {
      lines.push({ kind: 'line', a: centres[i], b: centres[j] });
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Phases (cumulative — each phase reveals only its new primitives, but the
// previous phases' primitives remain on screen because their `aArc` is
// already <= uReveal).
// ---------------------------------------------------------------------------

export const PHASES: Phase[] = [
  {
    id: 'circle',
    label: 'Circle',
    description: 'One circle. The starting move of every construction.',
    primitives: [{ kind: 'circle', cx: 0, cy: 0, r: BASE_RADIUS }],
  },
  {
    id: 'seed',
    label: 'Seed of Life',
    description: 'Six circles around the first, hex-spaced.',
    primitives: seedCenters.map(([x, y]) => ({
      kind: 'circle' as const,
      cx: x,
      cy: y,
      r: BASE_RADIUS,
    })),
  },
  {
    id: 'flower',
    label: 'Flower of Life',
    description: 'Twelve more circles fill out the symmetric ring.',
    primitives: flowerOuter.map(([x, y]) => ({
      kind: 'circle' as const,
      cx: x,
      cy: y,
      r: BASE_RADIUS,
    })),
  },
  {
    id: 'fruit',
    label: 'Fruit of Life',
    description: 'Thirteen separated circles — the cube\'s vertices in 2D.',
    primitives: fruitCenters.map(([x, y]) => ({
      kind: 'circle' as const,
      cx: x,
      cy: y,
      r: FRUIT_RADIUS,
    })),
  },
  {
    id: 'metatron',
    label: "Metatron's Cube",
    description: 'Every line between the thirteen fruit centres.',
    primitives: buildMetatronEdges(fruitCenters),
  },
  {
    id: 'platonic',
    label: 'Platonic Solids',
    description: 'The five regular solids encoded in the cube.',
    // No 2D primitives — solids are rendered as 3D meshes by the project.
    primitives: [],
  },
];

export const PHASE_COUNT = PHASES.length;

// ---------------------------------------------------------------------------
// Ribbon builder
// ---------------------------------------------------------------------------

const RIBBON_WIDTH = 0.03;
const CIRCLE_SEGMENTS = 96;

interface PrimitiveMeta {
  /** Inclusive global aArc start. */
  aStart: number;
  /** Inclusive global aArc end. */
  aEnd: number;
  phaseIndex: number;
  /** Sampled centre-line points in world space (length ≥ 2). Used to drive the pencil tip. */
  samples: Vec2[];
  /** Cumulative arc length 0..1 over `samples`. */
  sampleArcs: number[];
}

export interface StrokeData {
  /** Float32 positions, 3 per vertex (z=0). */
  positions: Float32Array;
  /** Float32 global arc coordinate, 1 per vertex. */
  arcs: Float32Array;
  /** Float32 per-vertex intensity modulator (0..1). Metatron lines are dimmed. */
  intensityMods: Float32Array;
  /** Uint32 indices for triangle list. */
  indices: Uint32Array;
  /** Per-primitive metadata, in primitive draw order. */
  primitives: PrimitiveMeta[];
  /** Phase boundaries on the global aArc axis: phaseEdges[i] = aArc where phase i ends.
   *  Length = PHASE_COUNT. phaseEdges[PHASE_COUNT-1] === 1. */
  phaseEdges: number[];
}

function sampleCircle(p: CirclePrimitive): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * TAU;
    pts.push([p.cx + p.r * Math.cos(a), p.cy + p.r * Math.sin(a)] as const);
  }
  return pts;
}

function sampleLine(p: LinePrimitive): Vec2[] {
  return [p.a, p.b];
}

function primitiveLength(samples: Vec2[]): number {
  let len = 0;
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i][0] - samples[i - 1][0];
    const dy = samples[i][1] - samples[i - 1][1];
    len += Math.hypot(dx, dy);
  }
  return len;
}

/**
 * Builds the unified stroke ribbon plus per-primitive metadata.
 *
 * Each primitive contributes a quad strip along its sampled centre-line; the
 * `aArc` attribute is the global 0..1 coordinate that the shader compares
 * against `uReveal`. Phase pacing weights every primitive equally within its
 * phase (so a phase with one circle and a phase with 78 lines feel similarly
 * paced) — this keeps the visual cadence comfortable.
 */
export function buildStrokeData(): StrokeData {
  // Equal time per phase. Within a phase, distribute time across primitives
  // proportional to their arc length so circles and short lines pace nicely.
  const phaseShare = 1 / PHASE_COUNT;

  const positions: number[] = [];
  const arcs: number[] = [];
  const intensityModsArr: number[] = [];
  const indices: number[] = [];
  const primitives: PrimitiveMeta[] = [];
  const phaseEdges: number[] = [];

  let vertCursor = 0;

  PHASES.forEach((phase, phaseIndex) => {
    const phaseStart = phaseIndex * phaseShare;
    const phaseEnd = phaseStart + phaseShare;
    phaseEdges.push(phaseEnd);

    if (phase.primitives.length === 0) {
      return;
    }

    // Metatron lines get reduced intensity to avoid blinding overlap.
    const intensityMod = phase.id === 'metatron' ? 0.22 : 1.0;

    // Sample each primitive and compute its length so we can budget aArc.
    const samples = phase.primitives.map((p) =>
      p.kind === 'circle' ? sampleCircle(p) : sampleLine(p),
    );
    const lengths = samples.map(primitiveLength);
    const totalLen = lengths.reduce((s, l) => s + l, 0) || 1;

    let cursor = phaseStart;
    phase.primitives.forEach((_, i) => {
      const slice = (lengths[i] / totalLen) * phaseShare;
      const aStart = cursor;
      const aEnd = cursor + slice;
      cursor = aEnd;

      const pts = samples[i];
      // Compute per-sample local arc (0..1 along this primitive).
      const localArcs: number[] = [0];
      for (let k = 1; k < pts.length; k++) {
        const dx = pts[k][0] - pts[k - 1][0];
        const dy = pts[k][1] - pts[k - 1][1];
        localArcs.push(localArcs[k - 1] + Math.hypot(dx, dy));
      }
      const segLen = localArcs[localArcs.length - 1] || 1;
      for (let k = 0; k < localArcs.length; k++) localArcs[k] /= segLen;

      // Emit ribbon: at each sample, emit two verts perpendicular to the
      // tangent. Tangent at endpoints uses the adjacent segment.
      for (let k = 0; k < pts.length; k++) {
        const prev = pts[Math.max(0, k - 1)];
        const next = pts[Math.min(pts.length - 1, k + 1)];
        const tx = next[0] - prev[0];
        const ty = next[1] - prev[1];
        const tl = Math.hypot(tx, ty) || 1;
        // Perpendicular = (-ty, tx) / |t|
        const nx = -ty / tl;
        const ny = tx / tl;
        const w = RIBBON_WIDTH * 0.5;
        const ax = pts[k][0] + nx * w;
        const ay = pts[k][1] + ny * w;
        const bx = pts[k][0] - nx * w;
        const by = pts[k][1] - ny * w;
        positions.push(ax, ay, 0, bx, by, 0);
        const globalArc = aStart + localArcs[k] * (aEnd - aStart);
        arcs.push(globalArc, globalArc);
        intensityModsArr.push(intensityMod, intensityMod);
      }

      // Stitch quads.
      for (let k = 0; k < pts.length - 1; k++) {
        const v0 = vertCursor + k * 2;
        const v1 = v0 + 1;
        const v2 = v0 + 2;
        const v3 = v0 + 3;
        indices.push(v0, v2, v1, v1, v2, v3);
      }
      vertCursor += pts.length * 2;

      primitives.push({
        aStart,
        aEnd,
        phaseIndex,
        samples: pts,
        sampleArcs: localArcs,
      });
    });
  });

  // Force final edge to exactly 1 to avoid float drift.
  phaseEdges[phaseEdges.length - 1] = 1;

  return {
    positions: new Float32Array(positions),
    arcs: new Float32Array(arcs),
    intensityMods: new Float32Array(intensityModsArr),
    indices: new Uint32Array(indices),
    primitives,
    phaseEdges,
  };
}

/**
 * Maps a global aArc value to a world-space position along the construction —
 * used to anchor the pencil tip to the current head.
 */
export function sampleHead(
  data: StrokeData,
  reveal: number,
): { x: number; y: number; active: boolean } {
  // Find the primitive whose [aStart,aEnd] contains reveal.
  // Linear scan is fine — primitive count is small (≈100) and we only run once per frame.
  for (let i = 0; i < data.primitives.length; i++) {
    const p = data.primitives[i];
    if (reveal <= p.aEnd) {
      const t = p.aStart === p.aEnd ? 0 : (reveal - p.aStart) / (p.aEnd - p.aStart);
      // Find sample bracket via binary search on sampleArcs.
      const arr = p.sampleArcs;
      let lo = 0;
      let hi = arr.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= t) lo = mid;
        else hi = mid;
      }
      const span = arr[hi] - arr[lo] || 1;
      const u = (t - arr[lo]) / span;
      const ax = p.samples[lo][0];
      const ay = p.samples[lo][1];
      const bx = p.samples[hi][0];
      const by = p.samples[hi][1];
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, active: true };
    }
  }
  // Past the end of the construction — sit on the last sample.
  const last = data.primitives[data.primitives.length - 1];
  if (!last) return { x: 0, y: 0, active: false };
  const tail = last.samples[last.samples.length - 1];
  return { x: tail[0], y: tail[1], active: false };
}

/**
 * Returns the global aArc value at which a given phase index is fully drawn.
 * Used by the chip overlay to set animation targets.
 */
export function phaseTargetArc(phaseIndex: number, data: StrokeData): number {
  const idx = Math.max(0, Math.min(PHASE_COUNT - 1, phaseIndex));
  return data.phaseEdges[idx];
}
