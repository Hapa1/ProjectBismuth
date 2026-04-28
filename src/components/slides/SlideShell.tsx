import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { SlideContext } from './SlideContext';
import styles from './SlideShell.module.css';

interface SlideShellProps {
  id: string;
  /** Provided by the parent SlideshowView based on its IntersectionObserver. */
  isActive: boolean;
  /** Called once with the slide's root element so the parent can observe it. */
  registerEl?: (id: string, el: HTMLElement | null) => void;
  theme?: 'light' | 'dark';
  children: ReactNode;
}

export function SlideShell({ id, isActive, registerEl, theme = 'dark', children }: SlideShellProps) {
  const elRef = useRef<HTMLElement | null>(null);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      elRef.current = node;
      registerEl?.(id, node);
    },
    [id, registerEl],
  );

  useEffect(() => {
    return () => {
      registerEl?.(id, null);
    };
  }, [id, registerEl]);

  return (
    <SlideContext.Provider value={{ id, isActive }}>
      <section
        ref={setRef}
        className={styles.shell}
        data-slide-id={id}
        data-theme={theme}
        data-active={isActive}
        aria-label={`Slide: ${id}`}
      >
        {children}
      </section>
    </SlideContext.Provider>
  );
}
