import type { ExhibitDef } from './types';
import { FlowerOfLifeScene } from './cells/FlowerOfLifeScene';
import { MandalaScene } from './cells/MandalaScene';
import { RoseWindowScene } from './cells/RoseWindowScene';
import { SpiralScene } from './cells/SpiralScene';
import { IslamicTileScene } from './cells/IslamicTileScene';
import { VesicaPiscisScene } from './cells/VesicaPiscisScene';

const fmtInt = (v: number) => Math.round(v).toString();
const fmt2 = (v: number) => v.toFixed(2);

/**
 * The single source of truth for Slide 2's symbol exhibits. Adding a new
 * symbol is one entry here plus one Scene file under `./cells/`.
 */
export const EXHIBITS: ExhibitDef[] = [
  {
    id: 'flower-of-life',
    label: 'Flower of Life — Polish folk carving',
    image: '/slides/symbols/flower-of-life.jpg',
    imageAlt: 'Hexafoil rosette carved into a wooden cottage beam, Silesian Beskids, Poland.',
    credit: {
      author: 'Silar',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:020210830_004259_Hexafoil,_Silesian_Beskids.jpg',
    },
    controls: [
      { id: 'rings', label: 'Rings', min: 1, max: 4, step: 1, default: 2, format: fmtInt },
      { id: 'radius', label: 'Radius', min: 0.5, max: 1.4, step: 0.05, default: 1.0, format: fmt2 },
      { id: 'hue', label: 'Hue', min: 0, max: 6.28, step: 0.05, default: 0, format: fmt2 },
    ],
    render: ({ params }) => <FlowerOfLifeScene params={params} />,
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
  {
    id: 'vesica-piscis',
    label: 'Vesica Piscis — Chalice Well, Glastonbury',
    image: '/slides/symbols/vesica-piscis.jpg',
    imageAlt: 'Wrought-iron cover of the Chalice Well showing the vesica piscis.',
    credit: {
      author: 'Theangryblackwoman',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chalice_Well_Cover.jpg',
    },
    controls: [
      { id: 'separation', label: 'Separation', min: 0.2, max: 1.6, step: 0.05, default: 0.7, format: fmt2 },
      { id: 'ratio', label: 'Radius ratio', min: 0.5, max: 1.5, step: 0.05, default: 1.0, format: fmt2 },
      { id: 'hue', label: 'Hue', min: 0, max: 6.28, step: 0.05, default: 0, format: fmt2 },
    ],
    render: ({ params }) => <VesicaPiscisScene params={params} />,
  },
];
