import { useEffect, useRef } from 'react';
import { useUIStore } from '../state/uiStore';

/**
 * Register a randomize callback for the active project. The shell's stage-level
 * Randomize FAB invokes this callback when pressed.
 *
 * The latest `callback` is captured by ref, so callers do not need to wrap
 * it in `useCallback`. The slot is cleared automatically on unmount so
 * non-randomize projects never see a stale FAB.
 */
export function useRandomize(callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    const invoke = () => ref.current();
    useUIStore.getState().setRandomizeAction(invoke);
    return () => {
      // Only clear if we still own the slot — guards against the unlikely
      // case where another project mounted before we unmounted.
      if (useUIStore.getState().randomizeAction === invoke) {
        useUIStore.getState().setRandomizeAction(null);
      }
    };
  }, []);
}
