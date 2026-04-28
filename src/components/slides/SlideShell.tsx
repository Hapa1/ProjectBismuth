import { useCallback, useRef, type ReactNode } from 'react';
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

  // Use the ref callback alone for registration. We intentionally do NOT
  // pair this with a useEffect cleanup — under React 18 StrictMode an
  // effect cleanup fires during the double-invoke, which would unregister
  // the element while the ref callback (only invoked on actual node
  // mount/unmount) does not re-register it, leaving the parent's
  // element map empty. The ref callback itself is called with `null` on
  // real unmount, which is sufficient.
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      elRef.current = node;
      registerEl?.(id, node);
    },
    [id, registerEl],
  );

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
