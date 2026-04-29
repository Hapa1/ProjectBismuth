import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ExhibitInfo } from '../types/project';
import styles from './ExhibitInfoModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Stable id used for aria-labelledby. */
  id: string;
  /** Heading text — project or slide title. */
  title: string;
  /** Caps row under the title; falsy entries are skipped. */
  subtitleParts?: Array<string | undefined | null | false>;
  info: ExhibitInfo | undefined;
}

/**
 * Renders long-form context (significance / science / practice) in an
 * accessible modal dialog. Portaled to <body>, focus-trapped, Esc-closable,
 * backdrop-closable. Used by both [../views/ProjectView.tsx](../views/ProjectView.tsx)
 * and [../views/SlideshowView.tsx](../views/SlideshowView.tsx).
 */
export function ExhibitInfoModal({ open, onClose, id, title, subtitleParts, info }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Capture focus on open, restore on close, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Esc to close + Tab focus trap.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const titleId = `exhibit-info-title-${id}`;
  const parts = (subtitleParts ?? []).filter((p): p is string => Boolean(p));

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {parts.length > 0 && (
              <p className={styles.subtitle}>
                {parts.map((p, i) => (
                  <span key={i}>
                    {i > 0 && <span aria-hidden="true" className={styles.subtitleSep}>·</span>}
                    <span>{p}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {info ? (
            <>
              <Section heading="Significance" body={info.significance} />
              <Section heading="The Math / Science" body={info.science} />
              <Section heading="Where You See It" body={info.practice} />
              {info.references && info.references.length > 0 && (
                <section className={styles.section}>
                  <h3 className={styles.sectionHeading}>Further Reading</h3>
                  <ul className={styles.refList}>
                    {info.references.map((r) => (
                      <li key={r.url}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={styles.refLink}
                        >
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <p className={styles.empty}>No additional information yet.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ heading, body }: { heading: string; body: string }) {
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeading}>{heading}</h3>
      {paragraphs.map((p, i) => (
        <p key={i} className={styles.paragraph}>{p}</p>
      ))}
    </section>
  );
}
