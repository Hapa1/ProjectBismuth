import type { ReactNode } from 'react';
import styles from './SlideCompare.module.css';

interface SlideCompareProps {
  /** Optional headline rendered above all panels. */
  headline?: ReactNode;
  /**
   * Layout mode.
   *
   * - `row` (default): all children become equal-width columns on `>=lg`,
   *   separated by a `→` arrow. Use for 2 panels you want side by side.
   * - `split`: requires exactly 3 children. On `>=lg`, the first two stack
   *   on the left and the third spans both rows on the right — i.e. two
   *   inputs collapsing into one shared output. On mobile, all three
   *   stack vertically with `↓` arrows.
   */
  layout?: 'row' | 'split';
  children: ReactNode;
}

/**
 * Comparison layout primitive. Use to juxtapose 2–3 slide panels (e.g.
 * `SlideCode` + `SlidePrompt` → `SlideDemo`) with connector arrows.
 *
 * Authors place children directly; the wrapper handles arrows via CSS
 * pseudo-elements between siblings, so authors never write the connectors
 * themselves.
 */
export function SlideCompare({ headline, layout = 'row', children }: SlideCompareProps) {
  return (
    <div className={styles.wrap}>
      {headline && <h1 className={styles.headline}>{headline}</h1>}
      <div className={styles.grid} data-layout={layout}>
        {children}
      </div>
    </div>
  );
}

