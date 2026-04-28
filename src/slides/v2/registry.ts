import type { SlideRegistryEntry } from '../types';

/**
 * PresentationV2 deck — "Exploring Math, Sacred Geometry, and Art with Code".
 *
 * Mounted at `/`. The original geometry deck lives at `/demo` and is defined
 * in [../registry.ts](../registry.ts). Both decks share the same slide
 * infrastructure (SlideshowView, SlideShell, MDX components) and only differ
 * in the slide list passed to SlideshowView.
 */
export const presentationV2Registry: SlideRegistryEntry[] = [
  {
    meta: { id: 'v2-title', title: 'Math, Sacred Geometry, and Art with Code' },
    load: () => import('./content/01-title.mdx'),
  },
  {
    meta: { id: 'v2-big-idea', title: 'Prompted, not Coded' },
    load: () => import('./content/02-big-idea.mdx'),
  },
  {
    meta: { id: 'v2-creative-coding', title: 'What Is Creative Coding?' },
    load: () => import('./content/03-creative-coding.mdx'),
  },
  {
    meta: { id: 'v2-fractals', title: 'Fractals' },
    load: () => import('./content/04-fractals.mdx'),
  },
  {
    meta: { id: 'v2-sacred-geometry', title: 'Sacred Geometry' },
    load: () => import('./content/05-sacred-geometry.mdx'),
  },
  {
    meta: { id: 'v2-gargantua', title: 'Gargantua' },
    load: () => import('./content/06-gargantua.mdx'),
  },
  {
    meta: { id: 'v2-audio', title: 'Music & Audio Visualizers' },
    load: () => import('./content/07-audio-visualizers.mdx'),
  },
  {
    meta: { id: 'v2-ai-vs-tool', title: 'AI Slop vs AI as a Tool' },
    load: () => import('./content/08-ai-slop-vs-tool.mdx'),
  },
  {
    meta: { id: 'v2-workflow', title: 'The New Creative Workflow' },
    load: () => import('./content/09-workflow.mdx'),
  },
  {
    meta: { id: 'v2-tools', title: 'Tools' },
    load: () => import('./content/10-tools.mdx'),
  },
  {
    meta: { id: 'v2-closing', title: 'Closing' },
    load: () => import('./content/11-closing.mdx'),
  },
];
