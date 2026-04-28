import { createContext, useContext } from 'react';

interface SlideContextValue {
  /** Stable slide id (matches SlideMeta.id). */
  id: string;
  /** True when this slide is the visible/active one in the deck. */
  isActive: boolean;
}

export const SlideContext = createContext<SlideContextValue | null>(null);

export function useSlideContext(): SlideContextValue {
  const ctx = useContext(SlideContext);
  if (!ctx) {
    throw new Error('useSlideContext must be used inside a <SlideShell>');
  }
  return ctx;
}
