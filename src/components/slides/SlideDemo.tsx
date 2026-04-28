import { useCallback, useEffect, useState, Suspense, useMemo } from 'react';
import { lazyComponentFor } from '../../projects/projectRegistry';
import { StageLoader } from '../StageLoader';
import { useSlideContext } from './SlideContext';
import styles from './SlideDemo.module.css';

interface SlideDemoProps {
  /** Project id from the project registry (e.g. 'bismuth'). */
  projectId: string;
  /**
   * If false, the demo unmounts when the slide is not active to release WebGL
   * contexts. Default true.
   */
  unmountWhenInactive?: boolean;
  /** Show a darkening scrim over the demo for overlay legibility. Default true. */
  scrim?: boolean;
}

/**
 * Full-bleed live project demo for a slide. Mounts only when the parent slide
 * is active so we keep at most one WebGL/p5 context running at a time.
 */
export function SlideDemo({ projectId, unmountWhenInactive = true, scrim = true }: SlideDemoProps) {
  const { isActive } = useSlideContext();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mountedOnce, setMountedOnce] = useState(false);

  const ProjectComponent = useMemo(() => lazyComponentFor(projectId), [projectId]);

  const bindContainer = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  useEffect(() => {
    const el = containerEl;
    if (!el) return;
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
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [containerEl]);

  useEffect(() => {
    if (isActive) setMountedOnce(true);
  }, [isActive]);

  const shouldMount = unmountWhenInactive ? isActive : mountedOnce;

  return (
    <div className={styles.bg} ref={bindContainer}>
      {shouldMount && size.width > 0 && size.height > 0 && (
        <Suspense fallback={<StageLoader />}>
          <div className={`${styles.fade} ${isActive ? styles.fadeIn : ''}`}>
            <ProjectComponent width={size.width} height={size.height} />
          </div>
        </Suspense>
      )}
      {scrim && <div className={styles.scrim} aria-hidden="true" />}
    </div>
  );
}
