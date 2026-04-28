import type { ReactNode } from 'react';
import styles from './SlideCode.module.css';

interface SlideCodeProps {
  /** Top-left tag, e.g. "TypeScript", "three.js". */
  language?: string;
  /** Eyebrow label above the panel, e.g. "Old way". */
  label?: string;
  /** Caption rendered below the code panel. */
  caption?: string;
  /** Maximum scroll height (CSS). Defaults to a clamp. */
  maxHeight?: string;
  children: ReactNode;
}

/**
 * Glassy, scrollable code panel for slides. Designed to sit alongside
 * `SlidePrompt` and `SlideDemo` inside a `SlideCompare`. The body is
 * mask-faded at top and bottom so a long snippet feels like it continues
 * forever — emphasising the "wall of code" rhetoric without forcing the
 * audience to read every line.
 *
 * Authors paste raw source as children (use a JS template literal) and
 * whitespace is preserved.
 */
export function SlideCode({
  language = 'three.js',
  label = 'Old way',
  caption,
  maxHeight,
  children,
}: SlideCodeProps) {
  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.label}>{label}</figcaption>
      <div className={styles.panel}>
        <span className={styles.lang} aria-hidden="true">
          {language}
        </span>
        <pre
          className={styles.scroll}
          tabIndex={0}
          aria-label={`${language} code sample`}
          style={maxHeight ? { maxHeight } : undefined}
        >
          <code className={styles.code}>{children}</code>
        </pre>
      </div>
      {caption && <span className={styles.caption}>{caption}</span>}
    </figure>
  );
}
