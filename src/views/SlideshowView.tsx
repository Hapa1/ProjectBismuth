import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MDXProvider } from '@mdx-js/react';
import { useReducedMotion } from 'framer-motion';
import { slideRegistry as defaultSlideRegistry } from '../slides/registry';
import type { SlideRegistryEntry } from '../slides/types';
import { slideMdxComponents } from '../slides/mdxComponents';
import { slideInfo } from '../slides/slideInfo';
import { SlideShell } from '../components/slides/SlideShell';
import { StageLoader } from '../components/StageLoader';
import { ExhibitInfoModal } from '../components/ExhibitInfoModal';
import { useUIStore } from '../state/uiStore';
import styles from './SlideshowView.module.css';

interface SlideshowViewProps {
  /** The deck to render. Defaults to the original geometry slideshow. */
  registry?: SlideRegistryEntry[];
}

export function SlideshowView({ registry = defaultSlideRegistry }: SlideshowViewProps = {}) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const prefersReducedMotion = useReducedMotion();

  const deckRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityRef = useRef(new Map<string, number>());
  const [activeId, setActiveId] = useState<string>(registry[0]?.meta.id ?? '');
  const [infoOpen, setInfoOpen] = useState(false);

  // Lazy components, memoized by registry identity so identity is stable
  // for as long as the registry reference is stable.
  const slides = useMemo(
    () =>
      registry.map((entry) => ({
        meta: entry.meta,
        Component: lazy(() => entry.load()),
      })),
    [registry],
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
        // Pick the slide closest to the top of the deck among those whose
        // ratio is at the threshold. Using ratio alone is not enough: when
        // scroll-snap is mid-transition two slides can both report ratio≈1
        // and the first-inserted would win permanently. Tiebreak by the
        // slide whose top is nearest the deck's top.
        const root = deckRef.current;
        if (!root) return;
        const rootRect = root.getBoundingClientRect();
        let bestId: string | null = null;
        let bestRatio = 0;
        let bestDistance = Infinity;
        for (const [id, ratio] of visibility) {
          if (ratio < 0.6) continue;
          const el = elementsRef.current.get(id);
          if (!el) continue;
          const dist = Math.abs(el.getBoundingClientRect().top - rootRect.top);
          if (
            ratio > bestRatio ||
            (Math.abs(ratio - bestRatio) < 0.001 && dist < bestDistance)
          ) {
            bestRatio = ratio;
            bestDistance = dist;
            bestId = id;
          }
        }
        if (bestId) {
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

  // Scroll-based fallback. The IntersectionObserver above is the primary
  // signal, but on some browsers (and headless test environments) IO entries
  // can lag behind scroll-snap transitions or fail to fire for programmatic
  // scrolls. Recomputing the active slide directly from element rects on
  // every scroll event guarantees the active slide updates even when IO is
  // delayed — which in turn ensures `SlideDemo` mounts when its slide
  // actually fills the viewport.
  useEffect(() => {
    const root = deckRef.current;
    if (!root) return;
    let rafId = 0;
    const recompute = () => {
      rafId = 0;
      const rootRect = root.getBoundingClientRect();
      const rootHeight = rootRect.height || 1;
      let bestId: string | null = null;
      let bestScore = -Infinity;
      for (const [id, el] of elementsRef.current) {
        const r = el.getBoundingClientRect();
        const visibleTop = Math.max(r.top, rootRect.top);
        const visibleBottom = Math.min(r.bottom, rootRect.bottom);
        const visible = Math.max(0, visibleBottom - visibleTop);
        const ratio = visible / rootHeight;
        if (ratio < 0.6) continue;
        // Prefer higher ratio; tiebreak by proximity of slide top to deck top.
        const distance = Math.abs(r.top - rootRect.top);
        const score = ratio * 1000 - distance;
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
      if (bestId) {
        setActiveId((current) => (current === bestId ? current : bestId!));
      }
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(recompute);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    // Run once after mount so the initial active slide reflects current scroll.
    recompute();
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
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
      <div className={styles.frame}>
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

        {slides.length > 1 && (() => {
          const idx = Math.max(0, slides.findIndex((s) => s.meta.id === activeId));
          const atFirst = idx <= 0;
          const atLast = idx >= slides.length - 1;
          const progress = slides.length > 1 ? idx / (slides.length - 1) : 0;
          const activeTitle = slides[idx]?.meta.title ?? '';
          return (
            <footer className={styles.navWrap}>
              <div
                className={styles.progress}
                role="progressbar"
                aria-label="Presentation progress"
                aria-valuemin={0}
                aria-valuemax={slides.length - 1}
                aria-valuenow={idx}
              >
                <div
                  className={styles.progressFill}
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
              <nav
                className={styles.nav}
                aria-label="Slide navigation"
              >
                <div className={styles.navCluster}>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => scrollToIndex(idx - 1)}
                    disabled={atFirst}
                    aria-label="Previous slide"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M15 6l-6 6 6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div className={styles.navLabel}>
                    <span className={styles.navTitleRow}>
                      <span className={styles.navTitle} title={activeTitle}>
                        {activeTitle}
                      </span>
                      <button
                        type="button"
                        className={styles.navInfoBtn}
                        onClick={() => setInfoOpen(true)}
                        aria-label={`About ${activeTitle}`}
                        aria-haspopup="dialog"
                      >
                        ?
                      </button>
                    </span>
                    <span className={styles.navCounter} aria-label={`Slide ${idx + 1} of ${slides.length}`}>
                      {idx + 1} / {slides.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => scrollToIndex(idx + 1)}
                    disabled={atLast}
                    aria-label="Next slide"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M9 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </nav>
            </footer>
          );
        })()}
      </div>

      {(() => {
        const active = slides.find((s) => s.meta.id === activeId);
        if (!active) return null;
        return (
          <ExhibitInfoModal
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            id={active.meta.id}
            title={active.meta.title}
            subtitleParts={['slide', active.meta.id]}
            info={slideInfo[active.meta.id]}
          />
        );
      })()}
    </MDXProvider>
  );
}
