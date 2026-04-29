import { useEffect, useState, type ReactNode } from 'react';
import styles from './CollapsiblePanel.module.css';

/**
 * Default to collapsed on viewports narrower than 1024px so mobile users see
 * the live demo first and can opt into the controls panel.
 */
function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(min-width: 1024px)').matches;
}

export interface CollapsiblePanelProps {
  /** ARIA label applied to the panel (e.g. "Voronoi controls"). */
  ariaLabel: string;
  /**
   * The project-supplied panel class (typically `styles.panel`). Provides
   * positioning, glass background, and layout for the panel contents.
   */
  className?: string;
  children: ReactNode;
}

/**
 * Uniform mobile-first collapsible wrapper for project controls panels.
 *
 * - Mobile (<1024px): defaults closed; renders a 44×44 gear button. Tapping it
 *   reveals the panel. The panel includes a close (×) button.
 * - Desktop (>=1024px): defaults open; the close button collapses it to the
 *   gear and the user can re-open it.
 *
 * Re-syncs the default state when the viewport crosses the desktop breakpoint
 * (e.g. tablet rotation) so the user is never stranded in a wrong default.
 *
 * Designed to drop in as a replacement for `<aside className={styles.panel}>`
 * — pass the project's panel class via `className` and your label via
 * `ariaLabel`.
 */
export function CollapsiblePanel({ ariaLabel, className, children }: CollapsiblePanelProps) {
  const [open, setOpen] = useState<boolean>(() => isDesktopViewport());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setOpen(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(true)}
        aria-label={`Show ${ariaLabel}`}
        aria-expanded={false}
      >
        <svg
          className={styles.toggleIcon}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span className={styles.toggleLabel}>Controls</span>
      </button>
    );
  }

  return (
    <aside className={className} aria-label={ariaLabel}>
      <button
        type="button"
        className={styles.close}
        onClick={() => setOpen(false)}
        aria-label={`Hide ${ariaLabel}`}
        aria-expanded={true}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      </button>
      {children}
    </aside>
  );
}
