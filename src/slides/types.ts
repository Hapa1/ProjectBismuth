import type { ComponentType } from 'react';

export interface SlideMeta {
  /** Stable id, also used as the React key. */
  id: string;
  /** Short title for analytics / aria-label. */
  title: string;
  /** Visual theme hint for the overlay. Defaults to 'dark'. */
  theme?: 'light' | 'dark';
}

export interface SlideRegistryEntry {
  meta: SlideMeta;
  load: () => Promise<{
    default: ComponentType<Record<string, unknown>>;
    meta: SlideMeta;
  }>;
}
