import type { ReactNode } from 'react';
import styles from './SlidePrompt.module.css';

interface SlidePromptProps {
  /**
   * Optional small label rendered above the prompt block — e.g. "Prompt to
   * Claude" or "What you'd type". Defaults to "Prompt".
   */
  label?: string;
  children: ReactNode;
}

/**
 * Styled prompt block for slides. Designed to sit inside a SlideOverlay or
 * stand on its own as a secondary overlay panel. Renders the children as
 * preformatted text so authors can paste a real natural-language prompt
 * verbatim with line breaks preserved.
 */
export function SlidePrompt({ label = 'Prompt', children }: SlidePromptProps) {
  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.label}>{label}</figcaption>
      <pre className={styles.code}>{children}</pre>
    </figure>
  );
}
