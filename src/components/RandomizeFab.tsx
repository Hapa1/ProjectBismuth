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
        <DiceIcon />
      </motion.span>
    </motion.button>
  );
}

function DiceIcon() {
  // Die showing the "5" face: rounded square with five pips.
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
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="currentColor" fillOpacity="0.18" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
