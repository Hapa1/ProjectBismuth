import { useState, type ReactNode } from 'react';
import type { OverlayPosition } from './SlideOverlay';
import styles from './SlideAnnotation.module.css';

interface SlideAnnotationProps {
  /**
   * Where the annotation floats within the slide. Uses the same vocabulary as
   * SlideOverlay so authors can predict placement intuitively.
   *
   * @default 'bottom-right'
   */
  position?: OverlayPosition;
  /**
   * When true (default), renders a × button the viewer can use to close the
   * annotation. Hiding the button is useful for non-interactive kiosk contexts.
   */
  dismissable?: boolean;
  /** Accessible label for the dismiss button. */
  dismissLabel?: string;
  /**
   * Any slide widget: SlidePrompt, SlideCode, a plain paragraph, custom JSX —
   * the annotation is renderer-agnostic.
   */
  children: ReactNode;
}

/**
 * Floating dismissable annotation that sits on top of a slide.
 *
 * A prompt is just one flavour of annotation — authors can place any child
 * widget inside (SlidePrompt, SlideCode, arbitrary JSX) and it will float at
 * the chosen position with a glass panel backdrop. Clicking × removes it from
 * the DOM for the rest of the session.
 *
 * Usage in MDX:
 * ```mdx
 * <Annotation position="bottom-right">
 *   <Prompt>What used to take a textbook takes a sentence.</Prompt>
 * </Annotation>
 * ```
 */
export function SlideAnnotation({
  position = 'bottom-right',
  dismissable = true,
  dismissLabel = 'Dismiss annotation',
  children,
}: SlideAnnotationProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={styles.wrap} data-position={position} aria-live="polite">
      <div className={styles.panel} role="complementary">
        {dismissable && (
          <div className={styles.toolbar}>
            <button
              className={styles.dismiss}
              onClick={() => setDismissed(true)}
              aria-label={dismissLabel}
            >
              ×
            </button>
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
