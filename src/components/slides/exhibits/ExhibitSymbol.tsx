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
  'flower-of-life': FlowerOfLifeIcon,
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

// ── Flower of Life: 19-circle hexafoil with bounding hexagon ────────
function FlowerOfLifeIcon() {
  const r = 12;
  const centers: [number, number][] = [[0, 0]];
  // First ring (6)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    centers.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // Second ring (12) — alternating outer & corner positions
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    centers.push([Math.cos(a) * r * 2, Math.sin(a) * r * 2]);
    const a2 = a + Math.PI / 6;
    centers.push([
      Math.cos(a2) * r * Math.sqrt(3),
      Math.sin(a2) * r * Math.sqrt(3),
    ]);
  }
  return (
    <g>
      {centers.map(([x, y], i) => (
        <circle
          key={i}
          cx={x.toFixed(2)}
          cy={y.toFixed(2)}
          r={r}
          strokeWidth="1.8"
        />
      ))}
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
