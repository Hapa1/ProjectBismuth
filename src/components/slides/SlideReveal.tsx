import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { lazyComponentFor } from '../../projects/projectRegistry';
import { StageLoader } from '../StageLoader';
import { useSlideContext } from './SlideContext';
import styles from './SlideReveal.module.css';

interface SlideRevealProps {
  /** Path to the static image shown before interaction (relative to /public). */
  src: string;
  /** Alt text for the static image. */
  alt?: string;
  /** Project id to mount on click (or always, when overlay). */
  projectId: string;
  /** Show darkening scrim. Default true. */
  scrim?: boolean;
  /**
   * When true, the project mounts immediately on top of the image (no click
   * required) and is composited via `mix-blend-mode: screen` so its dark
   * background is invisible and only its bright strokes show through.
   * Project UI panels (e.g. WFC controls) are hidden in this mode.
   */
  overlay?: boolean;
  /**
   * How the static image is fit to the slide. Defaults to `cover` (legacy
   * behaviour). Use `contain` when the image has its own composition you
   * don't want cropped.
   */
  imageFit?: 'cover' | 'contain';
}

/**
 * Shows a static image as the slide background. On click the image cross-fades
 * out and the live project cross-fades in and takes over completely.
 *
 * When `overlay` is true, the project animates over the (always-visible) image
 * via `mix-blend-mode: screen` instead of replacing it.
 */
export function SlideReveal({
  src,
  alt = '',
  projectId,
  scrim = true,
  overlay = false,
  imageFit = 'cover',
}: SlideRevealProps) {
  const { isActive } = useSlideContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [revealed, setRevealed] = useState(false);

  const ProjectComponent = useMemo(() => lazyComponentFor(projectId), [projectId]);

  // Reset to image when slide becomes inactive so next visit starts fresh.
  useEffect(() => {
    if (!isActive) setRevealed(false);
  }, [isActive]);

  const bindContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (!node) return;
    let rafId = 0;
    const ro = new ResizeObserver((entries) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const { contentRect } = entries[0];
        setSize({
          width: Math.round(contentRect.width),
          height: Math.round(contentRect.height),
        });
      });
    });
    ro.observe(node);
    // No cleanup ref — component lifetime handles it via React teardown.
    // (ResizeObserver on an unmounted element is a no-op.)
  }, []);

  const handleClick = useCallback(() => {
    if (overlay) return;
    if (!revealed) setRevealed(true);
  }, [overlay, revealed]);

  const canMount = isActive && size.width > 0 && size.height > 0;
  const showDemo = overlay ? canMount : canMount && revealed;
  const interactive = !overlay;

  return (
    <div
      className={`${styles.root} ${overlay ? styles.overlayRoot : ''}`}
      ref={bindContainer}
      onClick={interactive ? handleClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={
        interactive
          ? revealed
            ? `Live ${projectId} demo`
            : `Click to reveal ${projectId} demo`
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') handleClick();
            }
          : undefined
      }
    >
      {/* Static image — fades out on reveal (kept visible in overlay mode) */}
      <img
        className={`${styles.image} ${styles[`fit-${imageFit}`]} ${
          !overlay && revealed ? styles.hidden : ''
        }`}
        src={src}
        alt={alt}
        draggable={false}
      />

      {/* Live project — fades in on reveal, or always visible in overlay mode */}
      <div
        className={`${styles.demo} ${showDemo ? styles.visible : ''} ${
          overlay ? styles.overlayDemo : ''
        }`}
      >
        {showDemo && (
          <Suspense fallback={<StageLoader />}>
            <ProjectComponent width={size.width} height={size.height} />
          </Suspense>
        )}
      </div>

      {scrim && <div className={styles.scrim} aria-hidden="true" />}

      {/* Hint badge disappears once revealed (hidden entirely in overlay mode) */}
      {!overlay && (
        <span className={`${styles.hint} ${revealed ? styles.gone : ''}`} aria-hidden="true">
          Click to reveal live demo
        </span>
      )}
    </div>
  );
}
