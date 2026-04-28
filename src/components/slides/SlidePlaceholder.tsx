import { useMemo } from 'react';
import styles from './SlidePlaceholder.module.css';

export type PlaceholderShape =
  | 'compound'
  | 'symbol-wall'
  | 'fractal-tree'
  | 'spiral'
  | 'hex-tiling'
  | 'symbol-wall-annotated'
  | 'grid-icons'
  | 'single-mark';

interface SlidePlaceholderProps {
  shape: PlaceholderShape;
  /** Optional small label rendered at the bottom (e.g. "Demo: bismuth"). */
  caption?: string;
}

/**
 * Lightweight SVG placeholder used in slides while real project demos are
 * still being wired up. No WebGL, no animation — just a recognizable shape
 * that hints at the slide's content so the deck reads end-to-end.
 */
export function SlidePlaceholder({ shape, caption }: SlidePlaceholderProps) {
  const node = useMemo(() => renderShape(shape), [shape]);
  return (
    <div className={styles.bg} aria-hidden="true">
      <svg
        className={styles.svg}
        viewBox="-100 -100 200 200"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {node}
      </svg>
      {caption && <div className={styles.label}>{caption}</div>}
    </div>
  );
}

function renderShape(shape: PlaceholderShape) {
  switch (shape) {
    case 'compound':
      return <CompoundMark />;
    case 'symbol-wall':
      return <SymbolWall />;
    case 'fractal-tree':
      return <FractalTree />;
    case 'spiral':
      return <Spiral />;
    case 'hex-tiling':
      return <HexTiling />;
    case 'symbol-wall-annotated':
      return <SymbolWall annotated />;
    case 'grid-icons':
      return <GridIcons />;
    case 'single-mark':
      return <SingleMark />;
    default:
      return null;
  }
}

// ---------- shape primitives ----------

function CompoundMark() {
  // A hexagon containing a triangle and a circle: a generic "geometry" mark.
  return (
    <g>
      <Polygon sides={6} radius={70} />
      <circle cx={0} cy={0} r={42} />
      <Polygon sides={3} radius={28} rotate={-90} />
    </g>
  );
}

function SymbolWall({ annotated = false }: { annotated?: boolean }) {
  // 3x2 grid of small recognizable sacred-geometry-ish marks.
  const cells: { x: number; y: number; node: React.ReactNode }[] = [
    { x: -60, y: -40, node: <FlowerOfLife r={22} /> },
    { x: 0, y: -40, node: <Mandala r={22} /> },
    { x: 60, y: -40, node: <RoseWindow r={22} /> },
    { x: -60, y: 40, node: <SpiralMotif r={22} /> },
    { x: 0, y: 40, node: <IslamicTile r={22} /> },
    { x: 60, y: 40, node: <VesicaPiscis r={22} /> },
  ];
  return (
    <g>
      {cells.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`}>
          {c.node}
          {annotated && (
            <circle
              cx={0}
              cy={0}
              r={26}
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeDasharray="1.5 2"
            />
          )}
        </g>
      ))}
    </g>
  );
}

function FractalTree() {
  // Recursive Y-branch.
  const branches: React.ReactNode[] = [];
  const draw = (
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    key: string,
  ) => {
    if (depth === 0 || length < 2) return;
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    branches.push(<line key={key} x1={x} y1={y} x2={x2} y2={y2} />);
    const spread = 0.45;
    draw(x2, y2, angle - spread, length * 0.72, depth - 1, key + 'L');
    draw(x2, y2, angle + spread, length * 0.72, depth - 1, key + 'R');
    draw(x2, y2, angle - spread * 0.2, length * 0.55, depth - 1, key + 'M');
  };
  draw(0, 80, -Math.PI / 2, 50, 7, 'r');
  return <g>{branches}</g>;
}

function Spiral() {
  // Logarithmic-ish spiral as a polyline.
  const pts: string[] = [];
  const turns = 4;
  const steps = 240;
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * turns * Math.PI * 2;
    const r = 4 + 0.55 * t * t * 0.6;
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return (
    <g>
      <polyline points={pts.join(' ')} />
      <circle cx={0} cy={0} r={2} fill="currentColor" stroke="none" />
    </g>
  );
}

function HexTiling() {
  // Honeycomb of hexagons.
  const hexR = 14;
  const dx = hexR * Math.sqrt(3);
  const dy = hexR * 1.5;
  const cells: React.ReactNode[] = [];
  for (let row = -3; row <= 3; row += 1) {
    for (let col = -3; col <= 3; col += 1) {
      const x = col * dx + (row % 2 === 0 ? 0 : dx / 2);
      const y = row * dy;
      if (Math.hypot(x, y) > 90) continue;
      cells.push(
        <g key={`${row}-${col}`} transform={`translate(${x} ${y})`}>
          <Polygon sides={6} radius={hexR - 0.5} />
        </g>,
      );
    }
  }
  return <g>{cells}</g>;
}

function GridIcons() {
  // 4x2 grid of tiny domain icons (lung, gear, river, prism, etc.).
  const w = 38;
  const h = 38;
  const cols = 4;
  const rows = 2;
  const xs = (i: number) => (i - (cols - 1) / 2) * (w + 8);
  const ys = (j: number) => (j - (rows - 1) / 2) * (h + 8);
  const tiles: React.ReactNode[] = [];
  const icons = [
    <LungIcon key="lung" />,
    <GearIcon key="gear" />,
    <RiverIcon key="river" />,
    <PrismIcon key="prism" />,
    <SpiralMotif r={12} key="spiral" />,
    <FlowerOfLife r={12} key="flower" />,
    <Polygon sides={6} radius={12} key="hex" />,
    <Polygon sides={3} radius={12} key="tri" />,
  ];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const idx = j * cols + i;
      tiles.push(
        <g key={`${i}-${j}`} transform={`translate(${xs(i)} ${ys(j)})`}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx={4}
            stroke="currentColor"
            strokeOpacity={0.35}
          />
          {icons[idx]}
        </g>,
      );
    }
  }
  return <g>{tiles}</g>;
}

function SingleMark() {
  // Closing slide: a single quiet circle inside a hex.
  return (
    <g>
      <Polygon sides={6} radius={60} />
      <circle cx={0} cy={0} r={6} fill="currentColor" stroke="none" />
    </g>
  );
}

// ---------- small reusable marks ----------

function Polygon({
  sides,
  radius,
  rotate = 0,
}: {
  sides: number;
  radius: number;
  rotate?: number;
}) {
  const pts: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = ((i / sides) * Math.PI * 2) + (rotate * Math.PI) / 180 - Math.PI / 2;
    pts.push(`${(Math.cos(a) * radius).toFixed(2)},${(Math.sin(a) * radius).toFixed(2)}`);
  }
  return <polygon points={pts.join(' ')} />;
}

function FlowerOfLife({ r }: { r: number }) {
  const cs = [
    [0, 0],
    [r, 0],
    [-r, 0],
    [r / 2, (r * Math.sqrt(3)) / 2],
    [-r / 2, (r * Math.sqrt(3)) / 2],
    [r / 2, -(r * Math.sqrt(3)) / 2],
    [-r / 2, -(r * Math.sqrt(3)) / 2],
  ];
  return (
    <g>
      {cs.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

function Mandala({ r }: { r: number }) {
  const petals = 8;
  return (
    <g>
      <circle cx={0} cy={0} r={r} />
      {Array.from({ length: petals }).map((_, i) => {
        const a = (i / petals) * Math.PI * 2;
        const x = Math.cos(a) * r * 0.55;
        const y = Math.sin(a) * r * 0.55;
        return <circle key={i} cx={x} cy={y} r={r * 0.45} />;
      })}
    </g>
  );
}

function RoseWindow({ r }: { r: number }) {
  return (
    <g>
      <circle cx={0} cy={0} r={r} />
      <Polygon sides={12} radius={r * 0.8} />
      <Polygon sides={6} radius={r * 0.45} />
    </g>
  );
}

function SpiralMotif({ r }: { r: number }) {
  const pts: string[] = [];
  for (let i = 0; i <= 80; i += 1) {
    const t = (i / 80) * Math.PI * 4;
    const rr = (r / (Math.PI * 4)) * t;
    pts.push(`${(Math.cos(t) * rr).toFixed(2)},${(Math.sin(t) * rr).toFixed(2)}`);
  }
  return <polyline points={pts.join(' ')} />;
}

function IslamicTile({ r }: { r: number }) {
  return (
    <g>
      <Polygon sides={8} radius={r} />
      <Polygon sides={8} radius={r} rotate={22.5} />
      <Polygon sides={4} radius={r * 0.55} />
    </g>
  );
}

function VesicaPiscis({ r }: { r: number }) {
  return (
    <g>
      <circle cx={-r * 0.45} cy={0} r={r * 0.85} />
      <circle cx={r * 0.45} cy={0} r={r * 0.85} />
    </g>
  );
}

function LungIcon() {
  return (
    <g transform="scale(0.9)">
      <path d="M -2 -10 L -2 6 Q -10 12 -10 0 Q -10 -8 -4 -10 Z" />
      <path d="M 2 -10 L 2 6 Q 10 12 10 0 Q 10 -8 4 -10 Z" />
      <line x1={0} y1={-12} x2={0} y2={6} />
    </g>
  );
}

function GearIcon() {
  const teeth = 10;
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i += 1) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 12 : 8;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <g>
      <polygon points={pts.join(' ')} />
      <circle cx={0} cy={0} r={3} />
    </g>
  );
}

function RiverIcon() {
  return (
    <g>
      <path d="M -12 -10 Q -4 -4 -8 4 Q -12 12 0 12" />
      <path d="M -8 -10 Q 0 -2 -4 6 Q -8 14 4 14" transform="translate(2 -2)" />
    </g>
  );
}

function PrismIcon() {
  return (
    <g>
      <Polygon sides={3} radius={11} />
      <line x1={-13} y1={0} x2={-3} y2={0} />
      <line x1={3} y1={-3} x2={14} y2={-6} />
      <line x1={3} y1={0} x2={14} y2={0} />
      <line x1={3} y1={3} x2={14} y2={6} />
    </g>
  );
}
