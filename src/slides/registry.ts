import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { SlideMeta, SlideRegistryEntry } from './types';

/**
 * Single source of truth for slide order. Each entry lazy-loads an MDX file
 * that default-exports the slide component and named-exports `meta`.
 *
 * To add a slide: drop a new `.mdx` under ./content and append an entry here.
 */
export const slideRegistry: SlideRegistryEntry[] = [
  {
    meta: { id: 'opening', title: 'The Geometry Beneath Everything' },
    load: () => import('./content/01-opening.mdx'),
  },
  {
    meta: { id: 'the-question', title: 'Intro to Sacred Geometry' },
    load: () => import('./content/02-the-question.mdx'),
  },
  {
    meta: { id: 'repetition', title: 'Repetition Across Scale' },
    load: () => import('./content/03-repetition.mdx'),
  },
  {
    meta: { id: 'growth', title: 'Growth and Proportion' },
    load: () => import('./content/04-growth.mdx'),
  },
  {
    meta: { id: 'tiling', title: 'Symmetry and Tiling' },
    load: () => import('./content/05-tiling.mdx'),
  },
  {
    meta: { id: 'why-symbols-repeat', title: 'Why These Symbols Repeat' },
    load: () => import('./content/06-why-symbols-repeat.mdx'),
  },
  {
    meta: { id: 'practical', title: 'Why This Is Practical' },
    load: () => import('./content/07-practical.mdx'),
  },
  {
    meta: { id: 'closing', title: 'Closing' },
    load: () => import('./content/08-closing.mdx'),
  },
];

/** Returns a React.lazy component for the given slide id. */
export function lazySlideComponent(
  id: string,
): LazyExoticComponent<ComponentType<Record<string, unknown>>> {
  const entry = slideRegistry.find((s) => s.meta.id === id);
  if (!entry) throw new Error(`Unknown slide: ${id}`);
  return lazy(() => entry.load());
}

export type { SlideMeta };
