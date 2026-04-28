import { Link } from '@tanstack/react-router';
import { projectRegistry } from '../projects/projectRegistry';
import { useUIStore } from '../state/uiStore';
import styles from './LandingView.module.css';

export function LandingView() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <button
          className={styles.menuBtn}
          onClick={toggleSidebar}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <h1 className={styles.title}>Project Bismuth</h1>
        <p className={styles.subtitle}>A coding art portfolio.</p>
      </header>

      <ul className={styles.grid} role="list">
        {projectRegistry.map(({ meta }) => (
          <li key={meta.id}>
            <Link
              to="/projects/$projectId"
              params={{ projectId: meta.id }}
              className={styles.card}
            >
              <span className={styles.cardRenderer}>{meta.renderer}</span>
              <span className={styles.cardTitle}>{meta.title}</span>
              <span className={styles.cardDesc}>{meta.description}</span>
              <span className={styles.cardYear}>{meta.year}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
