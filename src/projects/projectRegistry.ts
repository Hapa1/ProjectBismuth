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
      id: 'bismuth',
      title: 'Bismuth Simulator',
      year: 2026,
      renderer: 'three',
      description: 'Recursive iridescent bismuth crystal growth.',
      tags: ['three', 'shader', 'recursion'],
    },
    load: () => import('./bismuth'),
  },
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
      id: 'gargantua',
      title: 'Gargantua',
      year: 2026,
      renderer: 'three',
      description: 'Cinematic black hole with glowing accretion disk, gravitational lensing, and bloom.',
      tags: ['three', 'shader', 'space'],
    },
    load: () => import('./gargantua'),
  },
];

/** Returns a React.lazy component for the given project id. */
export function lazyComponentFor(id: string): React.LazyExoticComponent<ComponentType<ProjectComponentProps>> {
  const entry = projectRegistry.find((p) => p.meta.id === id);
  if (!entry) throw new Error(`Unknown project: ${id}`);
  return lazy(() => entry.load());
}
