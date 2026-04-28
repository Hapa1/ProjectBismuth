import { useState } from 'react';
import styles from './SymbolWall.module.css';

interface Credit {
  /** Author or uploader name as it appears on Wikimedia Commons. */
  author: string;
  /** Short license identifier, e.g. "CC BY-SA 4.0". */
  license: string;
  /** Direct link to the license deed. */
  licenseUrl: string;
  /** Link to the Wikimedia Commons file description page. */
  sourceUrl: string;
}

interface SymbolEntry {
  /** Short caption shown beneath the image. */
  label: string;
  /** Public-relative path. */
  src: string;
  /** Attribution information for CC-licensed photographs. */
  credit: Credit;
  /** Inline SVG fallback if the image fails to load. */
  fallback: React.ReactNode;
}

const SYMBOLS: SymbolEntry[] = [
  {
    label: 'Flower of Life — Polish folk carving',
    src: '/slides/symbols/flower-of-life.jpg',
    credit: {
      author: 'Silar',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:020210830_004259_Hexafoil,_Silesian_Beskids.jpg',
    },
    fallback: <FlowerOfLife />,
  },
  {
    label: 'Mandala — Tibetan sand mandala',
    src: '/slides/symbols/mandala.jpg',
    credit: {
      author: 'Colonel Warden',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chenrezig_Sand_Mandala.jpg',
    },
    fallback: <Mandala />,
  },
  {
    label: 'Rose Window — Notre-Dame de Paris',
    src: '/slides/symbols/rose-window.jpg',
    credit: {
      author: 'MOSSOT',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Paris_Notre-Dame_Int%C3%A9rieur_164_rosac%C3%A9e_primitive.JPG',
    },
    fallback: <RoseWindow />,
  },
  {
    label: 'Spiral — Newgrange entrance stone',
    src: '/slides/symbols/spiral.jpg',
    credit: {
      author: 'Nomadtales',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Newgrange_Entrance_Stone.jpg',
    },
    fallback: <SpiralMotif />,
  },
  {
    label: 'Islamic Tile — Sheikh Lotfollah Mosque',
    src: '/slides/symbols/islamic-tile.jpg',
    credit: {
      author: 'J.salehifar',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sheikh_Lotfollah_Mosque_5.jpg',
    },
    fallback: <IslamicTile />,
  },
  {
    label: 'Vesica Piscis — Chalice Well, Glastonbury',
    src: '/slides/symbols/vesica-piscis.jpg',
    credit: {
      author: 'Theangryblackwoman',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chalice_Well_Cover.jpg',
    },
    fallback: <VesicaPiscis />,
  },
];

export function SymbolWall() {
  return (
    <div className={styles.bg}>
      <div className={styles.grid}>
        {SYMBOLS.map((s) => (
          <SymbolCell key={s.label} entry={s} />
        ))}
      </div>
    </div>
  );
}

function SymbolCell({ entry }: { entry: SymbolEntry }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className={styles.cell}>
      <div className={styles.media}>
        {errored ? (
          <svg
            className={styles.fallback}
            viewBox="-50 -50 100 100"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {entry.fallback}
          </svg>
        ) : (
          <img
            src={entry.src}
            alt={entry.label}
            onError={() => setErrored(true)}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      <div className={styles.captionBar}>
        <div className={styles.label}>{entry.label}</div>
        <div className={styles.credit}>
          <a
            href={entry.credit.sourceUrl}
            target="_blank"
            rel="noreferrer"
            title="View source on Wikimedia Commons"
          >
            {entry.credit.author}
          </a>
          {' · '}
          <a
            href={entry.credit.licenseUrl}
            target="_blank"
            rel="noreferrer"
            title={`License: ${entry.credit.license}`}
          >
            {entry.credit.license}
          </a>
          {' · Wikimedia Commons'}
        </div>
      </div>
    </div>
  );
}

// ---------- SVG fallbacks (only render if a photo fails to load) ----------

function FlowerOfLife() {
  const r = 14;
  const cs: [number, number][] = [
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

function Mandala() {
  const petals = 12;
  const r = 32;
  return (
    <g>
      <circle cx={0} cy={0} r={r} />
      <circle cx={0} cy={0} r={r * 0.55} />
      {Array.from({ length: petals }).map((_, i) => {
        const a = (i / petals) * Math.PI * 2;
        const x = Math.cos(a) * r * 0.7;
        const y = Math.sin(a) * r * 0.7;
        return <circle key={i} cx={x} cy={y} r={r * 0.22} />;
      })}
    </g>
  );
}

function RoseWindow() {
  return (
    <g>
      <circle cx={0} cy={0} r={36} />
      <Polygon sides={12} radius={28} />
      <Polygon sides={6} radius={16} />
      <circle cx={0} cy={0} r={5} />
    </g>
  );
}

function SpiralMotif() {
  const pts: string[] = [];
  for (let i = 0; i <= 200; i += 1) {
    const t = (i / 200) * 3.5 * Math.PI * 2;
    const r = 1.5 + 0.05 * t * t;
    pts.push(`${(Math.cos(t) * r).toFixed(2)},${(Math.sin(t) * r).toFixed(2)}`);
  }
  return <polyline points={pts.join(' ')} />;
}

function IslamicTile() {
  return (
    <g>
      <Polygon sides={8} radius={36} />
      <Polygon sides={8} radius={36} rotate={22.5} />
      <Polygon sides={4} radius={20} />
      <Polygon sides={4} radius={20} rotate={45} />
    </g>
  );
}

function VesicaPiscis() {
  const r = 26;
  return (
    <g>
      <circle cx={-r * 0.45} cy={0} r={r} />
      <circle cx={r * 0.45} cy={0} r={r} />
    </g>
  );
}

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
    const a =
      (i / sides) * Math.PI * 2 + (rotate * Math.PI) / 180 - Math.PI / 2;
    pts.push(
      `${(Math.cos(a) * radius).toFixed(2)},${(Math.sin(a) * radius).toFixed(2)}`,
    );
  }
  return <polygon points={pts.join(' ')} />;
}
