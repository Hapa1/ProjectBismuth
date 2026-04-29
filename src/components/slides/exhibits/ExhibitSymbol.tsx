/**
 * Inline SVG symbols for the Sacred Geometry slide rail (Slide 5).
 *
 * Same coordinate system and stroke style as `ProjectSymbol` so the icons
 * read as a coherent set with the main nav. viewBox is `-50 -50 100 100`,
 * fill: none, stroke: currentColor — color is supplied by CSS.
 */

interface Props {
  /** Exhibit id from the exhibits registry. */
  id: string;
  className?: string;
}

const SYMBOLS: Record<string, () => React.JSX.Element> = {
  geometria: GeometriaIcon,
  'golden-ratio': GoldenRatioIcon,
  mandala: MandalaIcon,
  'rose-window': RoseWindowIcon,
  spiral: SpiralIcon,
  'islamic-tile': IslamicTileIcon,
  'vesica-piscis': VesicaPiscisIcon,
};

export function ExhibitSymbol({ id, className }: Props) {
  const Inner = SYMBOLS[id];
  if (!Inner) return null;

  return (
    <svg
      className={className}
      viewBox="-50 -50 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <Inner />
    </svg>
  );
}

// ── Geometria: seed of life (overlapping circles) ───────────────────
function GeometriaIcon() {
  const r = 16;
  const centers: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    centers.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return (
    <g>
      {centers.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={r} />
      ))}
    </g>
  );
}

// ── Golden Ratio: nested φ-rectangles + golden spiral ───────────────
function GoldenRatioIcon() {
  const PHI = (1 + Math.sqrt(5)) / 2;
  type Rect = { x: number; y: number; size: number; quadrant: number };
  const rects: Rect[] = [];
  const arcs: { cx: number; cy: number; r: number; start: number }[] = [];
  let size = 8;
  let cx = 0;
  let cy = 0;
  const dirs: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const iters = 6;
  for (let i = 0; i < iters; i += 1) {
    const dir = dirs[i % 4];
    rects.push({ x: cx - size / 2, y: cy - size / 2, size, quadrant: i });
    arcs.push({
      cx: cx - (dir[0] * size) / 2,
      cy: cy - (dir[1] * size) / 2,
      r: size,
      start: (i % 4) * (Math.PI / 2) + Math.PI,
    });
    const next = size * PHI;
    cx += (dir[0] * (size + next)) / 2;
    cy += (dir[1] * (size + next)) / 2;
    size = next;
  }

  // Fit into the icon viewBox (-50..50 with padding).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.size);
    maxY = Math.max(maxY, r.y + r.size);
  }
  const pad = 84;
  const span = Math.max(maxX - minX, maxY - minY);
  const fit = pad / span;
  const ox = (minX + maxX) / 2;
  const oy = (minY + maxY) / 2;
  const tx = (v: number) => (v - ox) * fit;
  // Flip Y so the spiral coils visually anchor toward bottom (matches typical illustrations).
  const ty = (v: number) => -(v - oy) * fit;

  // Build spiral path.
  const path: string[] = [];
  arcs.forEach((a, i) => {
    const samples = 16;
    for (let s = 0; s <= samples; s += 1) {
      const t = a.start + (s / samples) * (Math.PI / 2);
      const x = tx(a.cx + Math.cos(t) * a.r);
      const y = ty(a.cy + Math.sin(t) * a.r);
      path.push(`${i === 0 && s === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }
  });

  return (
    <g>
      {rects.map((r, i) => (
        <rect
          key={i}
          x={tx(r.x).toFixed(2)}
          y={ty(r.y + r.size).toFixed(2)}
          width={(r.size * fit).toFixed(2)}
          height={(r.size * fit).toFixed(2)}
          strokeWidth="1.6"
        />
      ))}
      <path d={path.join(' ')} strokeWidth="2.6" />
    </g>
  );
}

// ── Mandala: concentric rings + radial petals ───────────────────────
function MandalaIcon() {
  const petals = 12;
  return (
    <g>
      <circle cx={0} cy={0} r={36} />
      <circle cx={0} cy={0} r={24} strokeWidth="2" />
      <circle cx={0} cy={0} r={6} fill="currentColor" stroke="none" />
      {Array.from({ length: petals }).map((_, i) => {
        const a = (i / petals) * Math.PI * 2;
        const x1 = Math.cos(a) * 24;
        const y1 = Math.sin(a) * 24;
        const x2 = Math.cos(a) * 36;
        const y2 = Math.sin(a) * 36;
        return (
          <line
            key={i}
            x1={x1.toFixed(2)}
            y1={y1.toFixed(2)}
            x2={x2.toFixed(2)}
            y2={y2.toFixed(2)}
            strokeWidth="2"
          />
        );
      })}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const cx = Math.cos(a) * 15;
        const cy = Math.sin(a) * 15;
        return <circle key={i} cx={cx.toFixed(2)} cy={cy.toFixed(2)} r={5} strokeWidth="1.8" />;
      })}
    </g>
  );
}

// ── Rose Window: outer ring with petal arcs ─────────────────────────
function RoseWindowIcon() {
  const spokes = 8;
  const r = 36;
  return (
    <g>
      <circle cx={0} cy={0} r={r} />
      <circle cx={0} cy={0} r={10} strokeWidth="2" />
      {Array.from({ length: spokes }).map((_, i) => {
        const a = (i / spokes) * Math.PI * 2;
        const cx = Math.cos(a) * 22;
        const cy = Math.sin(a) * 22;
        return (
          <g key={i}>
            <circle cx={cx.toFixed(2)} cy={cy.toFixed(2)} r={11} strokeWidth="2" />
            <line
              x1={(Math.cos(a) * 10).toFixed(2)}
              y1={(Math.sin(a) * 10).toFixed(2)}
              x2={(Math.cos(a) * r).toFixed(2)}
              y2={(Math.sin(a) * r).toFixed(2)}
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </g>
  );
}

// ── Spiral: triple spiral (Newgrange triskele) ──────────────────────
function SpiralIcon() {
  // Build an Archimedean spiral path.
  const buildSpiral = (cx: number, cy: number, rotate: number, turns = 2.5) => {
    const steps = 80;
    const a = 0;
    const b = 4.5;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * turns * Math.PI * 2;
      const r = a + b * t * 0.18;
      const x = cx + Math.cos(t + rotate) * r;
      const y = cy + Math.sin(t + rotate) * r;
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(' ');
  };

  const r = 18;
  return (
    <g strokeWidth="2.4">
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const cx = Math.cos(a) * r;
        const cy = Math.sin(a) * r;
        return <path key={i} d={buildSpiral(cx, cy, a + Math.PI)} />;
      })}
    </g>
  );
}

// ── Islamic Tile: 8-point star (two overlapping squares) ────────────
function IslamicTileIcon() {
  const r = 36;
  const points = (rotate: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rotate;
      pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
    }
    return pts.join(' ');
  };
  // Inner octagon connecting star intersections
  const innerR = 18;
  const inner: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    inner.push(`${(Math.cos(a) * innerR).toFixed(2)},${(Math.sin(a) * innerR).toFixed(2)}`);
  }
  return (
    <g>
      <polygon points={points(0)} />
      <polygon points={points(Math.PI / 4)} />
      <polygon points={inner.join(' ')} strokeWidth="2" />
    </g>
  );
}

// ── Vesica Piscis: two overlapping circles ──────────────────────────
function VesicaPiscisIcon() {
  const r = 24;
  const offset = r / 2;
  return (
    <g>
      <circle cx={-offset} cy={0} r={r} />
      <circle cx={offset} cy={0} r={r} />
      {/* Outer enclosing circle (Chalice Well frame) */}
      <circle cx={0} cy={0} r={38} strokeWidth="2" />
    </g>
  );
}
