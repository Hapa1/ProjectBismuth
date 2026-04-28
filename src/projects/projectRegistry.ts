import { lazy } from 'react';
import type { ProjectMeta, ProjectComponentProps } from '../types/project';
import type { ComponentType } from 'react';

interface RegistryEntry {
  meta: ProjectMeta;
  load: () => Promise<{ default: ComponentType<ProjectComponentProps> }>;
}

export const projectRegistry: RegistryEntry[] = [
  {
    meta: {
      id: 'expanse',
      title: 'Expanse',
      year: 2026,
      renderer: 'p5',
      description: 'Slanted cuboid fields with interactive lighting and noise controls.',
      tags: ['p5', 'isometric', 'generative', 'animation'],
    },
    load: () => import('./expanse'),
  },
  {
    meta: {
      id: 'moonlight',
      title: 'Moonlight',
      year: 2026,
      renderer: 'three',
      description: 'Audio-reactive procedural crystal landscape under a pulsing moon.',
      tags: ['three', 'audio', 'shader', 'visualizer'],
    },
    load: () => import('./moonlight'),
  },
  {
    meta: {
      id: 'io',
      title: 'Io',
      year: 2026,
      renderer: 'three',
      description: 'Audio-reactive crystal field with rising plasma beams beneath a violet sky.',
      tags: ['three', 'shader', 'audio', 'visualizer'],
    },
    load: () => import('./io'),
  },
  {
    meta: {
      id: 'luminal',
      title: 'Luminal Pavilion',
      year: 2026,
      renderer: 'three',
      description: 'Reflective pavilion with audio-reactive ring glows and a static forest view.',
      tags: ['three', 'audio', 'shader', 'reflection'],
    },
    load: () => import('./luminal'),
  },
  {
    meta: {
      id: 'prism',
      title: 'Prism',
      year: 2026,
      renderer: 'three',
      description: 'Slowly spinning inverted pyramid with glossy iridescent fresnel shading.',
      tags: ['three', 'shader', 'iridescent'],
    },
    load: () => import('./prism'),
  },
  {
    meta: {
      id: 'lattice',
      title: 'Lattice',
      year: 2026,
      renderer: 'three',
      description: 'Frosted panel grid with glowing seams that bleed chromatic light into the surface.',
      tags: ['three', 'shader', 'grid', 'light'],
    },
    load: () => import('./lattice'),
  },
  {
    meta: {
      id: 'voronoi',
      title: 'Voronoi',
      year: 2026,
      renderer: 'three',
      description: 'Seeded voronoi tessellation with parallaxed cells, lit by pointer and audio beats.',
      tags: ['three', 'shader', 'voronoi', 'audio'],
    },
    load: () => import('./voronoi'),
  },
  {
    meta: {
      id: 'apex',
      title: 'Apex',
      year: 2026,
      renderer: 'three',
      description: 'Slowly rotating inverted pyramid with iridescent fresnel shading that breathes with audio.',
      tags: ['three', 'shader', 'audio', 'iridescent'],
    },
    load: () => import('./apex'),
  },
  {
    meta: {
      id: 'prismata',
      title: 'Prismata',
      year: 2026,
      renderer: 'three',
      description: 'Recursive cloud of orbiting iridescent crystals with per-node variation in count, kind, and size — synced to audio.',
      tags: ['three', 'shader', 'audio', 'fractal', 'iridescent'],
    },
    load: () => import('./prismata'),
  },
  {
    meta: {
      id: 'polyhedra',
      title: 'Polyhedra',
      year: 2026,
      renderer: 'three',
      description: 'Platonic solids with sliders for shape, size, rotation, hue, and wireframe.',
      tags: ['three', 'geometry', 'controls'],
    },
    load: () => import('./polyhedra'),
  },
  {
    meta: {
      id: 'geometria',
      title: 'Geometria',
      year: 2026,
      renderer: 'three',
      description: 'Iridescent construction of the sacred-geometry sequence — circle to Platonic solids — drawn by a glowing pencil tip.',
      tags: ['three', 'shader', 'geometry', 'animation'],
    },
    load: () => import('./geometria'),
  },
  {
    meta: {
      id: 'gargantua',
      title: 'Gargantua',
      year: 2026,
      renderer: 'three',
      description: 'Cinematic black hole with glowing accretion disk, gravitational lensing, and bloom.',
      tags: ['three', 'shader', 'space'],
    },
    load: () => import('./gargantua'),
  },
  {
    meta: {
      id: 'wfc',
      title: 'Wave Function Collapse',
      year: 2026,
      renderer: 'p5',
      description: 'Procedural tile generation via WFC with preset tilesets and live sliders.',
      tags: ['p5', 'procedural', 'wfc', 'controls'],
    },
    load: () => import('./wfc'),
  },
  {
    meta: {
      id: 'iso-blocks',
      title: 'Iso Blocks',
      year: 2026,
      renderer: 'p5',
      description: 'Voxel WFC building isometric stone, dirt, crystal, and iridescent bismuth terrain.',
      tags: ['p5', 'wfc', 'isometric', 'voxel', 'iridescent'],
    },
    load: () => import('./iso-blocks'),
  },
  {
    meta: {
      id: 'geometry-beneath',
      title: 'Geometry Beneath Everything',
      year: 2026,
      renderer: 'p5',
      description: 'Live visual aid for the talk: branching, spiral, and tiling — three pillars in one canvas.',
      tags: ['p5', 'fractal', 'spiral', 'tiling', 'controls', 'presentation'],
    },
    load: () => import('./geometry-beneath'),
  },
  {
    meta: {
      id: 'sierpinski-3d',
      title: 'Sierpinski Tetrahedron',
      year: 2026,
      renderer: 'three',
      description: 'Self-similar fractal where each tetrahedron spawns four smaller copies. Interactive sliders for depth and scale.',
      tags: ['three', 'fractal', '3d', 'controls', 'geometry'],
    },
    load: () => import('./sierpinski-3d'),
  },
  {
    meta: {
      id: 'cantor-2d',
      title: 'Cantor Set',
      year: 2026,
      renderer: 'p5',
      description: 'Animated fractal that removes the middle third at every iteration. Click to fold, or enable auto-animation.',
      tags: ['p5', 'fractal', 'animation', 'controls', 'interactive'],
    },
    load: () => import('./cantor-2d'),
  },
];

/** Returns a React.lazy component for the given project id. */
export function lazyComponentFor(id: string): React.LazyExoticComponent<ComponentType<ProjectComponentProps>> {
  const entry = projectRegistry.find((p) => p.meta.id === id);
  if (!entry) throw new Error(`Unknown project: ${id}`);
  return lazy(() => entry.load());
}
