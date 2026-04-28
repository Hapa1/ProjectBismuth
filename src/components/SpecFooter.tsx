import { useUIStore } from '../state/uiStore';
import { projectRegistry } from '../projects/projectRegistry';
import { useRouterState } from '@tanstack/react-router';
import styles from './SpecFooter.module.css';

function useCurrentMeta() {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  const match = path.match(/^\/projects\/([^/]+)$/);
  if (!match) return null;
  return projectRegistry.find((p) => p.meta.id === match[1])?.meta ?? null;
}

export function SpecFooter() {
  const fps = useUIStore((s) => s.fps);
  const meta = useCurrentMeta();

  if (!meta) return null;

  return (
    <footer className={styles.footer}>
      <span className={styles.item}>{meta.renderer}</span>
      <span className={styles.sep}>·</span>
      <span className={styles.item}>{meta.id}</span>
      <span className={styles.sep}>·</span>
      <span className={styles.item}>{fps > 0 ? `${fps} fps` : '— fps'}</span>
    </footer>
  );
}
