import { useMemo, useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { projectRegistry, lazyComponentFor } from '../projects/projectRegistry';
import { exhibitInfo } from '../projects/exhibitInfo';
import { RenderStage } from '../components/RenderStage';
import { ExhibitInfoModal } from '../components/ExhibitInfoModal';
import { useUIStore } from '../state/uiStore';
import { NotFoundView } from './NotFoundView';
import styles from './ProjectView.module.css';

export function ProjectView() {
  const { projectId } = useParams({ from: '/projects/$projectId' });
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [infoOpen, setInfoOpen] = useState(false);

  const entry = projectRegistry.find((p) => p.meta.id === projectId);

  // Unknown project — don't redirect, show not-found
  if (!entry) return <NotFoundView />;

  // Stable lazy component — memo so it isn't recreated on every render
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const LazyComponent = useMemo(() => lazyComponentFor(projectId), [projectId]);

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <button
          className={styles.menuBtn}
          onClick={toggleSidebar}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.breadcrumbLink}>index</Link>
          <span className={styles.sep}>/</span>
          <span className={styles.title}>{entry.meta.title}</span>
          <button
            type="button"
            className={styles.infoBtn}
            onClick={() => setInfoOpen(true)}
            aria-label={`About ${entry.meta.title}`}
            aria-haspopup="dialog"
          >
            ?
          </button>
        </div>
      </header>

      <RenderStage projectId={projectId} ProjectComponent={LazyComponent} />

      <ExhibitInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        meta={entry.meta}
        info={exhibitInfo[projectId]}
      />
    </div>
  );
}
