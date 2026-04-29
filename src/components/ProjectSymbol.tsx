/**
 * Inline SVG symbols for each project, displayed in the sidebar nav.
 *
 * Each symbol is a small geometric icon rendered at the project's accent color.
 * The viewBox is normalised to -50 -50 100 100 so all icons share the same
 * coordinate space and can be sized via CSS alone.
 */

interface Props {
  /** Project slug from the registry. */
  id: string;
  className?: string;
}

const SYMBOLS: Record<string, () => React.JSX.Element> = {
  bismuth: BismuthSymbol,
  expanse: ExpanseSymbol,
  moonlight: MoonlightSymbol,
  lattice: LatticeSymbol,
  voronoi: VoronoiSymbol,
  apex: ApexSymbol,
  prismata: PrismataSymbol,
  polyhedra: PolyhedraSymbol,
  geometria: GeometriaSymbol,
  gargantua: GargantuaSymbol,
  wfc: WfcSymbol,
  'iso-blocks': IsoBlocksSymbol,
  'geometry-beneath': GeometryBeneathSymbol,
  'sierpinski-3d': SierpinskiSymbol,
  'cantor-2d': CantorSymbol,
  'monument-valley': MonumentValleySymbol,
};

export function ProjectSymbol({ id, className }: Props) {
  const Inner = SYMBOLS[id];
  if (!Inner) return null;

  return (
    <svg
      className={className}
      viewBox="-50 -50 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <Inner />
    </svg>
  );
}

// ── Bismuth: hopper-crystal stepped halves ───────────────────────────
function BismuthSymbol() {
  return (
    <g>
      {/* Left stepped half */}
      <polyline points="-6,-28 -6,-12 -18,-12 -18,4 -30,4 -30,20" />
      {/* Right stepped half */}
      <polyline points="6,-28 6,-12 18,-12 18,4 30,4 30,20" />
      {/* Inner steps */}
      <polyline points="-6,-12 -6,4 -18,4 -18,20" />
      <polyline points="6,-12 6,4 18,4 18,20" />
      {/* Base */}
      <line x1="-30" y1="20" x2="30" y2="20" />
    </g>
  );
}

// ── Expanse: slanted cuboid field / isometric rows ───────────────────
function ExpanseSymbol() {
  return (
    <g>
      {[-18, -6, 6, 18].map((y) => (
        <line key={y} x1="-30" y1={y + 6} x2="30" y2={y - 6} />
      ))}
      {/* Vertical risers */}
      {[-18, 0, 18].map((x) => (
        <line key={x} x1={x} y1={-22} x2={x} y2={22} />
      ))}
    </g>
  );
}

// ── Moonlight: crescent moon ─────────────────────────────────────────
function MoonlightSymbol() {
  const r = 26;
  return (
    <g>
      <circle cx={0} cy={0} r={r} />
      <circle cx={12} cy={-8} r={r * 0.82} />
    </g>
  );
}

// ── Lattice: frosted grid panels ─────────────────────────────────────
function LatticeSymbol() {
  const s = 16;
  return (
    <g>
      {[-1, 0, 1].map((row) =>
        [-1, 0, 1].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={col * (s + 4) - s / 2}
            y={row * (s + 4) - s / 2}
            width={s}
            height={s}
            rx={2}
          />
        )),
      )}
    </g>
  );
}

// ── Voronoi: organic cell tessellation ───────────────────────────────
function VoronoiSymbol() {
  return (
    <g>
      <polygon points="0,-30 22,-14 18,14 -4,28 -24,8 -18,-18" />
      <line x1="0" y1="-30" x2="4" y2="-48" />
      <line x1="22" y1="-14" x2="42" y2="-20" />
      <line x1="18" y1="14" x2="38" y2="24" />
      <line x1="-4" y1="28" x2="-6" y2="46" />
      <line x1="-24" y1="8" x2="-44" y2="12" />
      <line x1="-18" y1="-18" x2="-32" y2="-36" />
      <circle cx="2" cy="0" r="2" fill="currentColor" />
    </g>
  );
}

// ── Apex: inverted pyramid with rays ─────────────────────────────────
function ApexSymbol() {
  return (
    <g>
      <polygon points="0,30 -28,-20 28,-20" />
      {/* Horizon line */}
      <line x1="-40" y1="-20" x2="40" y2="-20" />
      {/* Rays from apex */}
      <line x1="0" y1="30" x2="-38" y2="-20" />
      <line x1="0" y1="30" x2="38" y2="-20" />
      <line x1="0" y1="30" x2="-14" y2="-20" />
      <line x1="0" y1="30" x2="14" y2="-20" />
    </g>
  );
}

// ── Prismata: orbiting crystals ──────────────────────────────────────
function PrismataSymbol() {
  const n = 5;
  const r = 28;
  return (
    <g>
      <circle cx={0} cy={0} r={6} />
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        return (
          <g key={i}>
            <line x1={0} y1={0} x2={x} y2={y} strokeWidth="2" strokeDasharray="4 4" />
            <polygon
              points={`${x},${y - 6} ${x + 5},${y} ${x},${y + 6} ${x - 5},${y}`}
            />
          </g>
        );
      })}
    </g>
  );
}

// ── Polyhedra: icosahedron-like wireframe ─────────────────────────────
function PolyhedraSymbol() {
  const r = 30;
  const sides = 6;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return (
    <g>
      <polygon points={pts.join(' ')} />
      {/* Inner star connections */}
      {Array.from({ length: sides }).map((_, i) => {
        const a1 = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const a2 = (((i + 2) % sides) / sides) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={(Math.cos(a1) * r).toFixed(1)}
            y1={(Math.sin(a1) * r).toFixed(1)}
            x2={(Math.cos(a2) * r).toFixed(1)}
            y2={(Math.sin(a2) * r).toFixed(1)}
            strokeWidth="2.5"
          />
        );
      })}
    </g>
  );
}

// ── Geometria: seed of life (overlapping circles) ────────────────────
function GeometriaSymbol() {
  const r = 14;
  const centers: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    centers.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return (
    <g>
      {centers.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

// ── Gargantua: black hole with accretion disk ────────────────────────
function GargantuaSymbol() {
  return (
    <g>
      <circle cx={0} cy={0} r={12} fill="currentColor" stroke="none" />
      <ellipse cx={0} cy={0} rx={36} ry={10} />
      <ellipse cx={0} cy={0} rx={28} ry={7} />
      <circle cx={0} cy={0} r={18} strokeWidth="2" />
    </g>
  );
}

// ── WFC: wave function collapse tile grid ────────────────────────────
function WfcSymbol() {
  const s = 14;
  const gap = 4;
  const fills = [true, false, true, false, true, false, true, false, true];
  return (
    <g>
      {[-1, 0, 1].map((row, ri) =>
        [-1, 0, 1].map((col, ci) => {
          const idx = ri * 3 + ci;
          const x = col * (s + gap) - s / 2;
          const y = row * (s + gap) - s / 2;
          return (
            <g key={idx}>
              <rect x={x} y={y} width={s} height={s} rx={1} />
              {fills[idx] && (
                <line x1={x + 3} y1={y + 3} x2={x + s - 3} y2={y + s - 3} strokeWidth="2.5" />
              )}
              {!fills[idx] && (
                <circle cx={x + s / 2} cy={y + s / 2} r={3} strokeWidth="2.5" />
              )}
            </g>
          );
        }),
      )}
    </g>
  );
}

// ── Iso Blocks: isometric cube ───────────────────────────────────────
function IsoBlocksSymbol() {
  // Isometric cube built from three visible faces
  const top: string = 'M0,-28 L26,-14 L0,0 L-26,-14 Z';
  const left: string = 'M-26,-14 L0,0 L0,28 L-26,14 Z';
  const right: string = 'M26,-14 L0,0 L0,28 L26,14 Z';
  return (
    <g>
      <path d={top} />
      <path d={left} />
      <path d={right} />
    </g>
  );
}

// ── Geometry Beneath: branching fractal tree ─────────────────────────
function GeometryBeneathSymbol() {
  const lines: [number, number, number, number][] = [];

  function branch(x: number, y: number, angle: number, len: number, depth: number) {
    if (depth <= 0 || len < 3) return;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    lines.push([x, y, x2, y2]);
    branch(x2, y2, angle - 0.5, len * 0.68, depth - 1);
    branch(x2, y2, angle + 0.5, len * 0.68, depth - 1);
  }

  branch(0, 30, -Math.PI / 2, 28, 5);

  return (
    <g>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} strokeWidth={Math.max(2, 3.5 - i * 0.08)} />
      ))}
    </g>
  );
}

// ── Sierpinski 3D: nested triangles ──────────────────────────────────
function SierpinskiSymbol() {
  const r = 34;
  const tri = (cx: number, cy: number, size: number): string => {
    const pts: string[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${(cx + Math.cos(a) * size).toFixed(1)},${(cy + Math.sin(a) * size).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  return (
    <g>
      {/* Outer triangle */}
      <polygon points={tri(0, 4, r)} />
      {/* Three inner triangles */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const cx = Math.cos(a) * r * 0.5;
        const cy = 4 + Math.sin(a) * r * 0.5;
        return <polygon key={i} points={tri(cx, cy, r * 0.5)} strokeWidth="2.5" />;
      })}
    </g>
  );
}

// ── Cantor 2D: horizontal bars with removed middle thirds ────────────
function CantorSymbol() {
  const bars: { x: number; w: number; y: number }[] = [];
  const totalW = 72;

  function cantor(x: number, w: number, depth: number, y: number) {
    if (depth <= 0 || w < 2) return;
    bars.push({ x: x - totalW / 2, w, y });
    const third = w / 3;
    cantor(x, third, depth - 1, y + 14);
    cantor(x + 2 * third, third, depth - 1, y + 14);
  }

  cantor(0, totalW, 4, -28);

  return (
    <g>
      {bars.map(({ x, w, y }, i) => (
        <line key={i} x1={x} y1={y} x2={x + w} y2={y} strokeWidth="5" strokeLinecap="butt" />
      ))}
    </g>
  );
}

// ── Monument Valley: isometric stepped tower ─────────────────────────
function MonumentValleySymbol() {
  // Three stacked isometric blocks, each smaller and offset upward,
  // evoking the impossible architecture of the game.
  const block = (cx: number, cy: number, w: number, h: number) => {
    const hw = w / 2;
    return (
      <g key={`${cx}-${cy}`}>
        {/* Top rhombus */}
        <polygon points={`${cx},${cy - h} ${cx + hw},${cy - h + hw / 2} ${cx},${cy - h + hw} ${cx - hw},${cy - h + hw / 2}`} />
        {/* Left face */}
        <polygon points={`${cx - hw},${cy - h + hw / 2} ${cx},${cy - h + hw} ${cx},${cy + hw} ${cx - hw},${cy + hw / 2}`} />
        {/* Right face */}
        <polygon points={`${cx + hw},${cy - h + hw / 2} ${cx},${cy - h + hw} ${cx},${cy + hw} ${cx + hw},${cy + hw / 2}`} />
      </g>
    );
  };

  return (
    <g>
      {block(0, 22, 44, 12)}
      {block(0, 4, 32, 12)}
      {block(0, -12, 20, 12)}
    </g>
  );
}
