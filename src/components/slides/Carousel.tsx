import { useCallback, useEffect, useRef, useState, useId } from 'react';
import styles from './Carousel.module.css';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CarouselItem {
  /** Stable id used as the React key and fallback SVG seed. */
  id: string;
  /** Square image path. Falls back to a deterministic procedural SVG when absent or broken. */
  imageSrc?: string;
  /**
   * Optional Instagram post URL (e.g. `https://www.instagram.com/p/Cabc123/`).
   * When set, the card renders Instagram's official `/embed` iframe instead
   * of `imageSrc` so the actual post (image + caption) is shown inline.
   */
  instagramPostUrl?: string;
  /** Seed for the fallback SVG. Defaults to `id`. */
  fallbackSeed?: string;
  /** Primary card label (artist name, project title, etc.). */
  title: string;
  /** Secondary label (handle, category, date, …). */
  subtitle?: string;
  /** Short descriptive copy. Keep under ~160 chars for the card. */
  description: string;
  /** CTA destination URL. */
  ctaUrl: string;
  /** CTA label override. Falls back to `defaultCtaLabel` prop. */
  ctaLabel?: string;
}

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------

interface CarouselProps {
  items: CarouselItem[];
  /** Label shown above the track. */
  eyebrow?: string;
  /** Default CTA text when an item has no `ctaLabel`. */
  defaultCtaLabel?: string;
  /**
   * CSS value applied as `right` offset on viewports >= 768 px.
   * Use this to keep the shell from sliding under a project's right-rail panel.
   *
   * Example: `"calc(min(18.5rem, 36vw) + 1.5rem)"` for the Expanse panel.
   */
  rightInset?: string;
}

export function Carousel({
  items,
  eyebrow = 'Featured',
  defaultCtaLabel = 'View more ↗',
  rightInset,
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const trackId = useId();

  const updateButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateButtons();
    el.addEventListener('scroll', updateButtons, { passive: true });
    const ro = new ResizeObserver(updateButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateButtons);
      ro.disconnect();
    };
  }, [updateButtons]);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(`.${styles.card}`);
    const step = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollByCard(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollByCard(-1);
      }
    },
    [scrollByCard],
  );

  // Apply `rightInset` at the >= 768 px breakpoint only — CSS handles the
  // conditional via the `--carousel-right-inset` custom property.
  const wrapStyle = rightInset
    ? ({ '--carousel-right-inset': rightInset } as React.CSSProperties)
    : undefined;

  return (
    <div className={`${styles.wrap} ${collapsed ? styles.wrapCollapsed : ''}`} style={wrapStyle}>
      <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
        <div className={styles.headerRow}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => setCollapsed((v) => !v)}
              aria-expanded={!collapsed}
              aria-controls={trackId}
              aria-label={collapsed ? 'Show artists' : 'Hide artists'}
            >
              {collapsed ? '▲ Show' : '▼ Hide'}
            </button>
            <div className={`${styles.controls} ${collapsed ? styles.controlsHidden : ''}`} aria-hidden="false">
              <button
                type="button"
                className={styles.navButton}
                onClick={() => scrollByCard(-1)}
                disabled={!canPrev}
                aria-label="Previous"
              >
                ←
              </button>
              <button
                type="button"
                className={styles.navButton}
                onClick={() => scrollByCard(1)}
                disabled={!canNext}
                aria-label="Next"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div
          id={trackId}
          ref={trackRef}
          className={`${styles.track} ${collapsed ? styles.trackCollapsed : ''}`}
          role="region"
          aria-label={eyebrow}
          tabIndex={collapsed ? -1 : 0}
          onKeyDown={onKeyDown}
        >
          {items.map((item) => (
            <CarouselCard key={item.id} item={item} defaultCtaLabel={defaultCtaLabel} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface CarouselCardProps {
  item: CarouselItem;
  defaultCtaLabel: string;
}

function CarouselCard({ item, defaultCtaLabel }: CarouselCardProps) {
  const [errored, setErrored] = useState(false);
  const ctaLabel = item.ctaLabel ?? defaultCtaLabel;
  const seed = item.fallbackSeed ?? item.id;
  const embedSrc = toInstagramEmbedSrc(item.instagramPostUrl);

  return (
    <article className={`${styles.card} ${embedSrc ? styles.cardEmbed : ''}`}>
      <div className={`${styles.media} ${embedSrc ? styles.mediaEmbed : ''}`}>
        {embedSrc ? (
          <iframe
            className={styles.embed}
            src={embedSrc}
            title={`${item.title} on Instagram`}
            loading="lazy"
            scrolling="no"
            allow="encrypted-media; fullscreen"
            allowTransparency
          />
        ) : !errored && item.imageSrc ? (
          <img
            src={item.imageSrc}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onError={() => setErrored(true)}
          />
        ) : (
          <CarouselFallback seed={seed} />
        )}
      </div>
      <div className={styles.meta}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        {item.subtitle && <span className={styles.subtitle}>{item.subtitle}</span>}
      </div>
      <p className={styles.description}>{item.description}</p>
      <a
        className={styles.cta}
        href={item.ctaUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`${ctaLabel} — ${item.title}`}
      >
        {ctaLabel}
      </a>
    </article>
  );
}

/**
 * Normalize a public Instagram post URL into its embeddable iframe URL.
 * Returns `undefined` for unsupported / malformed input so the caller can
 * fall back to `imageSrc` or the procedural SVG.
 *
 * Accepts:
 *   https://www.instagram.com/p/<id>/
 *   https://www.instagram.com/reel/<id>/
 *   https://www.instagram.com/tv/<id>/
 */
function toInstagramEmbedSrc(postUrl?: string): string | undefined {
  if (!postUrl) return undefined;
  try {
    const u = new URL(postUrl);
    if (!/(^|\.)instagram\.com$/.test(u.hostname)) return undefined;
    const match = u.pathname.match(/^\/(p|reel|tv)\/([^/]+)\/?/);
    if (!match) return undefined;
    return `https://www.instagram.com/${match[1]}/${match[2]}/embed/captioned/`;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Fallback SVG — deterministic procedural art so cards never appear broken.
// ---------------------------------------------------------------------------

function CarouselFallback({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const hue = ((h >>> 0) % 360) / 360;
  const rings = 4 + (Math.abs(h) % 4);
  const rot = (Math.abs(h >> 4) % 90) - 45;

  const ringElements = [];
  for (let i = 0; i < rings; i += 1) {
    const r = 8 + i * (38 / rings);
    ringElements.push(
      <circle
        key={`c-${i}`}
        cx="0"
        cy="0"
        r={r}
        stroke={`hsl(${hue * 360}, 60%, ${55 - i * 4}%)`}
      />,
    );
  }

  const spokes = 6 + (Math.abs(h >> 8) % 6);
  const spokeElements = [];
  for (let i = 0; i < spokes; i += 1) {
    const a = (i / spokes) * Math.PI * 2;
    const x = Math.cos(a) * 44;
    const y = Math.sin(a) * 44;
    spokeElements.push(
      <line
        key={`s-${i}`}
        x1="0"
        y1="0"
        x2={x.toFixed(2)}
        y2={y.toFixed(2)}
        stroke={`hsl(${hue * 360}, 60%, 50%)`}
        strokeOpacity="0.35"
      />,
    );
  }

  return (
    <svg
      className={styles.fallback}
      viewBox="-50 -50 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      strokeWidth="0.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <g transform={`rotate(${rot})`}>
        {spokeElements}
        {ringElements}
      </g>
    </svg>
  );
}
