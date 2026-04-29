import { useState, useEffect, Suspense, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ComponentType } from 'react';
import type { ProjectComponentProps } from '../types/project';
import { StageLoader } from './StageLoader';
import { RandomizeFab } from './RandomizeFab';
import styles from './RenderStage.module.css';

interface RenderStageProps {
  projectId: string;
  ProjectComponent: ComponentType<ProjectComponentProps>;
}

export function RenderStage({ projectId, ProjectComponent }: RenderStageProps) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const prefersReducedMotion = useReducedMotion();

  const bindContainer = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  // Debounced ResizeObserver — rebind on keyed project mount/unmount.
  useEffect(() => {
    const el = containerEl;
    if (!el) return;

    let rafId: number;
    const ro = new ResizeObserver((entries) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const { contentRect } = entries[0];
        setSize({ width: Math.round(contentRect.width), height: Math.round(contentRect.height) });
      });
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [containerEl]);

  const variants = {
    initial: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit:    { opacity: 0, scale: prefersReducedMotion ? 1 : 1.02 },
  };

  return (
    <div className={styles.stage}>
      <AnimatePresence mode="wait">
        <motion.div
          key={projectId}
          ref={bindContainer}
          className={styles.inner}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {size.width > 0 && (
            <Suspense fallback={<StageLoader />}>
              <ProjectComponent width={size.width} height={size.height} />
            </Suspense>
          )}
        </motion.div>
      </AnimatePresence>
      <RandomizeFab />
    </div>
  );
}
