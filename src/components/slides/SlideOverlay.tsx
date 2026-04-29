import { Children, isValidElement, useEffect, useState, type ReactNode } from 'react';
import styles from './SlideOverlay.module.css';
import { SlideTitle } from './SlideText';

/**
 * Default to collapsed on viewports narrower than the desktop breakpoint
 * (1024px) so mobile users see only a compact "See more" affordance and the
 * underlying live demo. Falls back to expanded when matchMedia is unavailable
 * (SSR / very old browsers).
 */
function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(min-width: 1024px)').matches;
}

export type OverlayPosition =
  | 'center'
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface SlideOverlayProps {
  position?: OverlayPosition;
  children: ReactNode;
}

/**
 * Glass text panel that floats on top of a SlideDemo. The wrapper is
 * pointer-events: none so the demo (e.g. OrbitControls) keeps receiving
 * gestures; only the inner panel captures pointer events.
 *
 * On mobile the overlay is always positioned at the top of the slide (so the
 * title is visible first) regardless of the requested `position`. The CSS
 * handles that override; the `position` prop still controls desktop layout.
 *
 * The overlay can be collapsed via the toggle button so the underlying demo
 * is fully visible. When collapsed, only a compact reopen button is shown.
 */
export function SlideOverlay({ position = 'bottom-left', children }: SlideOverlayProps) {
  const [open, setOpen] = useState<boolean>(() => isDesktopViewport());

  // Re-sync the default when the viewport crosses the desktop breakpoint so
  // rotating a tablet or resizing a window doesn't strand the overlay in the
  // wrong default state. User-initiated toggles are preserved within a
  // breakpoint range (we only react to the boundary crossing).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setOpen(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Find the first <Title> element in the children so the collapsed state can
  // render it as the visible label (with "See more" underneath). Falls back
  // to a generic label if no title is provided.
  const titleNode = Children.toArray(children).find(
    (child) => isValidElement(child) && child.type === SlideTitle,
  ) as ReactNode | undefined;

  return (
    <div className={styles.wrap} data-position={position} data-open={open}>
      {open ? (
        <div className={styles.overlay}>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setOpen(false)}
            aria-label="Hide slide text"
            aria-expanded={true}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
          {children}
        </div>
      ) : (
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setOpen(true)}
          aria-label="Show slide text"
          aria-expanded={false}
        >
          {titleNode ? (
            <span className={styles.expandTitle}>{titleNode}</span>
          ) : null}
          <span className={styles.expandHint}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            See more
          </span>
        </button>
      )}
    </div>
  );
}
