import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useUIStore } from '../state/uiStore';
import styles from './RandomizeFab.module.css';

/**
 * Stage-level floating action button that triggers the active project's
 * randomize callback (registered via `useRandomize`). Renders nothing when
 * no project has registered a callback.
 */
export function RandomizeFab() {
  const action = useUIStore((s) => s.randomizeAction);
  const prefersReducedMotion = useReducedMotion();
  const [pressCount, setPressCount] = useState(0);

  if (!action) return null;

  const handleClick = () => {
    action();
    setPressCount((n) => n + 1);
  };

  return (
    <motion.button
      type="button"
      className={styles.fab}
      onClick={handleClick}
      aria-label="Randomize"
      title="Randomize"
      whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
    >
      <motion.span
        key={pressCount}
        className={styles.icon}
        initial={prefersReducedMotion ? false : { rotate: -30, scale: 0.85 }}
        animate={prefersReducedMotion ? undefined : { rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 14 }}
      >
        <SparklesIcon />
      </motion.span>
    </motion.button>
  );
}

function SparklesIcon() {
  // Sparkles / wand: a large 4-point star with two smaller accents.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Main star */}
      <path d="M12 3.5 L13.6 9.4 L19.5 11 L13.6 12.6 L12 18.5 L10.4 12.6 L4.5 11 L10.4 9.4 Z" fill="currentColor" fillOpacity="0.18" />
      {/* Top-right accent */}
      <path d="M18.5 4 L19.1 5.9 L21 6.5 L19.1 7.1 L18.5 9 L17.9 7.1 L16 6.5 L17.9 5.9 Z" fill="currentColor" fillOpacity="0.35" />
      {/* Bottom-left accent */}
      <path d="M5.5 16 L6 17.5 L7.5 18 L6 18.5 L5.5 20 L5 18.5 L3.5 18 L5 17.5 Z" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}
