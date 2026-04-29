import type { ExhibitDef } from './types';
import { GoldenRatioScene } from './cells/GoldenRatioScene';
import { MandalaScene } from './cells/MandalaScene';
import { RoseWindowScene } from './cells/RoseWindowScene';
import { SpiralScene } from './cells/SpiralScene';
import { IslamicTileScene } from './cells/IslamicTileScene';

const fmtInt = (v: number) => Math.round(v).toString();
const fmt2 = (v: number) => v.toFixed(2);

/**
 * The single source of truth for Slide 2's symbol exhibits. Adding a new
 * symbol is one entry here plus one Scene file under `./cells/`.
 */
export const EXHIBITS: ExhibitDef[] = [
  {
    id: 'geometria',
    label: 'Sacred Geometry',
    imageAlt: 'A vertical carousel of original generative artwork studies.',
    gallery: [
      { src: '/slides/Dream1.png', alt: 'Dream study 1' },
      { src: '/slides/Liquid1.png', alt: 'Liquid study 1' },
      { src: '/slides/Griz1.png', alt: 'Griz study 1' },
      { src: '/slides/Griz2.png', alt: 'Griz study 2' },
    ],
    controls: [],
    projectId: 'geometria',
  },
  {
    id: 'golden-ratio',
    label: 'Golden Ratio — φ ≈ 1.6180339887',
    imageAlt: 'Nested squares scaling by the golden ratio with the golden spiral.',
    excerpt: [
      'φ is the unique positive number where 1 + 1/φ = φ. Solve x² = x + 1 and you get φ = (1 + √5) / 2.',
      'Each square in the construction is φ times larger than the one before. The spiral is built from quarter-circle arcs inside each square — an approximation of a true logarithmic spiral whose growth factor is φ per quarter turn.',
      'It shows up wherever growth is self-similar: nautilus shells, sunflower seed packings, branching plants, even the rotation of galactic arms. Not because nature "knows" φ, but because φ is the fixed point of the simplest self-referential rule there is.',
    ],
    controls: [
      { id: 'iterations', label: 'Iterations', min: 2, max: 10, step: 1, default: 7, format: fmtInt },
      { id: 'thickness', label: 'Thickness', min: 0.015, max: 0.08, step: 0.002, default: 0.03, format: fmt2 },
      { id: 'hue', label: 'Hue', min: 0, max: 6.28, step: 0.05, default: 0, format: fmt2 },
    ],
    render: ({ params }) => <GoldenRatioScene params={params} />,
  },
  {
    id: 'mandala',
    label: 'Mandala — Tibetan sand mandala',
    image: '/slides/symbols/mandala.jpg',
    imageAlt: 'Chenrezig sand mandala created by Tibetan Buddhist monks.',
    credit: {
      author: 'Colonel Warden',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chenrezig_Sand_Mandala.jpg',
    },
    controls: [
      { id: 'petals', label: 'Petals', min: 6, max: 24, step: 1, default: 12, format: fmtInt },
      { id: 'rings', label: 'Rings', min: 1, max: 5, step: 1, default: 3, format: fmtInt },
      { id: 'spin', label: 'Spin', min: 0, max: 0.6, step: 0.02, default: 0.15, format: fmt2 },
    ],
    render: ({ params }) => <MandalaScene params={params} />,
  },
  {
    id: 'rose-window',
    label: 'Rose Window — Notre-Dame de Paris',
    image: '/slides/symbols/rose-window.jpg',
    imageAlt: 'Stained-glass rose window in the apse of Notre-Dame de Paris.',
    credit: {
      author: 'MOSSOT',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Paris_Notre-Dame_Int%C3%A9rieur_164_rosac%C3%A9e_primitive.JPG',
    },
    controls: [
      { id: 'spokes', label: 'Spokes', min: 6, max: 24, step: 1, default: 12, format: fmtInt },
      { id: 'innerRadius', label: 'Inner radius', min: 0.2, max: 0.8, step: 0.05, default: 0.4, format: fmt2 },
      { id: 'hue', label: 'Hue', min: 0, max: 6.28, step: 0.05, default: 0, format: fmt2 },
    ],
    render: ({ params }) => <RoseWindowScene params={params} />,
  },
  {
    id: 'spiral',
    label: 'Spiral — Newgrange entrance stone',
    image: '/slides/symbols/spiral.jpg',
    imageAlt: 'Triple-spiral carving on the entrance stone at Newgrange, Ireland.',
    credit: {
      author: 'Nomadtales',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Newgrange_Entrance_Stone.jpg',
    },
    controls: [
      { id: 'turns', label: 'Turns', min: 1, max: 6, step: 0.5, default: 3, format: fmt2 },
      { id: 'growth', label: 'Growth', min: 0.05, max: 0.4, step: 0.01, default: 0.18, format: fmt2 },
      { id: 'thickness', label: 'Thickness', min: 0.01, max: 0.06, step: 0.002, default: 0.025, format: fmt2 },
    ],
    render: ({ params }) => <SpiralScene params={params} />,
  },
  {
    id: 'islamic-tile',
    label: 'Islamic Tile — Sheikh Lotfollah Mosque',
    image: '/slides/symbols/islamic-tile.jpg',
    imageAlt: 'Tilework on the dome of the Sheikh Lotfollah Mosque, Isfahan.',
    credit: {
      author: 'J.salehifar',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sheikh_Lotfollah_Mosque_5.jpg',
    },
    controls: [
      { id: 'points', label: 'Points', min: 5, max: 12, step: 1, default: 8, format: fmtInt },
      { id: 'density', label: 'Density', min: 1, max: 4, step: 1, default: 2, format: fmtInt },
      { id: 'rotation', label: 'Rotation', min: 0, max: 3.14, step: 0.05, default: 0, format: fmt2 },
    ],
    render: ({ params }) => <IslamicTileScene params={params} />,
  },
];
