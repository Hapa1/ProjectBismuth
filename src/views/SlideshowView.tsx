import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MDXProvider } from '@mdx-js/react';
import { useReducedMotion } from 'framer-motion';
import { slideRegistry, lazySlideComponent } from '../slides/registry';
import { slideMdxComponents } from '../slides/mdxComponents';
import { SlideShell } from '../components/slides/SlideShell';
import { StageLoader } from '../components/StageLoader';
import { useUIStore } from '../state/uiStore';
import styles from './SlideshowView.module.css';

export function SlideshowView() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const prefersReducedMotion = useReducedMotion();

  const deckRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityRef = useRef(new Map<string, number>());
  const [activeId, setActiveId] = useState<string>(slideRegistry[0]?.meta.id ?? '');

  // Lazy components, memoized by registry order so identity is stable.
  const slides = useMemo(
    () =>
      slideRegistry.map((entry) => ({
        meta: entry.meta,
        Component: lazySlideComponent(entry.meta.id),
      })),
    [],
  );

  const registerEl = useCallback((id: string, el: HTMLElement | null) => {
    const map = elementsRef.current;
    const observer = observerRef.current;
    const prev = map.get(id);
    if (prev && observer) observer.unobserve(prev);
    if (el) {
      map.set(id, el);
      if (observer) observer.observe(el);
    } else {
      map.delete(id);
      visibilityRef.current.delete(id);
    }
  }, []);

  // IntersectionObserver: track which slide is most visible.
  useEffect(() => {
    const root = deckRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibility = visibilityRef.current;
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.slideId;
          if (!id) continue;
          visibility.set(id, e.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId && bestRatio >= 0.6) {
          setActiveId((current) => (current === bestId ? current : bestId!));
        }
      },
      {
        root,
        threshold: [0, 0.25, 0.5, 0.6, 0.75, 1],
      },
    );
    observerRef.current = observer;

    // Observe any elements registered before this effect ran.
    for (const el of elementsRef.current.values()) observer.observe(el);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const root = deckRef.current;
      if (!root) return;
      const clamped = Math.max(0, Math.min(slides.length - 1, index));
      const id = slides[clamped]?.meta.id;
      if (!id) return;
      const el = elementsRef.current.get(id);
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    },
    [slides, prefersReducedMotion],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, [contenteditable="true"]')) return;
      const idx = slides.findIndex((s) => s.meta.id === activeId);
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          scrollToIndex(idx + 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          scrollToIndex(idx - 1);
          break;
        case 'Home':
          e.preventDefault();
          scrollToIndex(0);
          break;
        case 'End':
          e.preventDefault();
          scrollToIndex(slides.length - 1);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId, slides, scrollToIndex]);

  return (
    <MDXProvider components={slideMdxComponents}>
      <button
        className={styles.menuBtn}
        onClick={toggleSidebar}
        aria-label="Open navigation"
      >
        ☰
      </button>

      <div ref={deckRef} className={styles.deck} aria-label="Presentation deck">
        {slides.map(({ meta, Component }) => {
          const isActive = meta.id === activeId;
          return (
            <SlideShell
              key={meta.id}
              id={meta.id}
              isActive={isActive}
              registerEl={registerEl}
              theme={meta.theme}
            >
              <Suspense fallback={<StageLoader />}>
                <Component />
              </Suspense>
            </SlideShell>
          );
        })}
      </div>

      {slides.length > 1 && (
        <nav className={styles.dots} aria-label="Slide indicator">
          {slides.map((s, i) => (
            <button
              key={s.meta.id}
              className={styles.dot}
              data-active={s.meta.id === activeId}
              aria-label={`Go to slide ${i + 1}: ${s.meta.title}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </nav>
      )}
    </MDXProvider>
  );
}
