import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ARTISTS, type ArtistEntry } from './artists';
import styles from './ArtistCarousel.module.css';

interface ArtistCarouselProps {
  /** Override the seed list for one-off slides. Defaults to ARTISTS. */
  artists?: ArtistEntry[];
  /** Default CTA label used when an entry has no `ctaLabel`. */
  defaultCtaLabel?: string;
  /** Eyebrow shown above the strip. */
  eyebrow?: string;
}

const DEFAULT_CTA = 'View on Instagram ↗';

/**
 * Slide 3 visual: horizontal carousel of favorite generative artists.
 *
 * - Glass strip pinned to the bottom of the slide.
 * - Scroll-snap on touch, prev/next buttons on >= md, arrow keys when focused.
 * - Each card surfaces a CTA link (default "View on Instagram ↗", overridable).
 */
export function ArtistCarousel({
  artists = ARTISTS,
  defaultCtaLabel = DEFAULT_CTA,
  eyebrow = 'Favorite generative artists',
}: ArtistCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

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

  const items = useMemo(() => artists, [artists]);

  return (
    <div className={styles.wrap}>
      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <div className={styles.controls} aria-hidden="false">
            <button
              type="button"
              className={styles.navButton}
              onClick={() => scrollByCard(-1)}
              disabled={!canPrev}
              aria-label="Previous artists"
            >
              ←
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => scrollByCard(1)}
              disabled={!canNext}
              aria-label="Next artists"
            >
              →
            </button>
          </div>
        </div>
        <div
          ref={trackRef}
          className={styles.track}
          role="region"
          aria-label="Favorite generative artists"
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          {items.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} defaultCtaLabel={defaultCtaLabel} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ArtistCardProps {
  artist: ArtistEntry;
  defaultCtaLabel: string;
}

function ArtistCard({ artist, defaultCtaLabel }: ArtistCardProps) {
  const [errored, setErrored] = useState(false);
  const ctaLabel = artist.ctaLabel ?? defaultCtaLabel;
  const ctaUrl = artist.ctaUrl ?? artist.instagramUrl;

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {!errored && artist.imageSrc ? (
          <img
            src={artist.imageSrc}
            alt={`Work by ${artist.name}`}
            loading="lazy"
            decoding="async"
            onError={() => setErrored(true)}
          />
        ) : (
          <ArtistFallback seed={artist.id} />
        )}
      </div>
      <div className={styles.meta}>
        <h3 className={styles.name}>{artist.name}</h3>
        <span className={styles.handle}>@{artist.handle}</span>
      </div>
      <p className={styles.description}>{artist.description}</p>
      <a
        className={styles.cta}
        href={ctaUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`${ctaLabel} — ${artist.name}`}
      >
        {ctaLabel}
      </a>
    </article>
  );
}

/**
 * Deterministic procedural SVG so each artist gets a distinct placeholder
 * even when no image is on disk. Keeps the slide visually intact for demos
 * before real images are added under public/slides/artists/.
 */
function ArtistFallback({ seed }: { seed: string }) {
  // Cheap string hash → stable angle / hue / count per seed.
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const hue = ((h >>> 0) % 360) / 360;
  const rings = 4 + (Math.abs(h) % 4);
  const rot = (Math.abs(h >> 4) % 90) - 45;
  const ringElements = [];
  for (let i = 0; i < rings; i += 1) {
    const r = 8 + i * (38 / rings);
    ringElements.push(
      <circle key={`c-${i}`} cx="0" cy="0" r={r} stroke={`hsl(${hue * 360}, 60%, ${55 - i * 4}%)`} />,
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
