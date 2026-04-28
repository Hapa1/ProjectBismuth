import type { ReactNode } from 'react';
import styles from './SlideOverlay.module.css';

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
 */
export function SlideOverlay({ position = 'bottom-left', children }: SlideOverlayProps) {
  return (
    <div className={styles.wrap} data-position={position}>
      <div className={styles.overlay}>{children}</div>
    </div>
  );
}
