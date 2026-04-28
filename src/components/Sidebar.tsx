import { Link, useRouterState } from '@tanstack/react-router';
import { useUIStore } from '../state/uiStore';
import { projectRegistry } from '../projects/projectRegistry';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const close = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={close}
          aria-hidden="true"
        />
      )}

      <nav
        className={styles.sidebar}
        data-open={sidebarOpen}
        aria-label="Project navigation"
      >
        <div className={styles.header}>
          <Link to="/" className={styles.logo} onClick={close}>
            <span className={styles.logoMark}>◆</span>
            <span>Bismuth</span>
          </Link>
        </div>

        <ul className={styles.navList} role="list">
          {projectRegistry.map(({ meta }) => {
            const href = `/projects/${meta.id}`;
            const isActive = currentPath === href;
            return (
              <li key={meta.id}>
                <Link
                  to={href}
                  className={styles.navItem}
                  data-active={isActive}
                  onClick={close}
                >
                  <span className={styles.navTitle}>{meta.title}</span>
                  <span className={styles.navMeta}>
                    {meta.renderer} · {meta.year}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
