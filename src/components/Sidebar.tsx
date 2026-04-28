import { useEffect } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useUIStore } from '../state/uiStore';
import { projectRegistry } from '../projects/projectRegistry';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const projectsNavExpanded = useUIStore((s) => s.projectsNavExpanded);
  const toggleProjectsNav = useUIStore((s) => s.toggleProjectsNav);
  const autoExpandProjectsNav = useUIStore((s) => s.autoExpandProjectsNav);

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isOnProjectRoute = /^\/projects\//.test(currentPath);
  const isHome = currentPath === '/';

  // Auto-expand the Projects group on first visit to a project route this
  // session, but never override an explicit user toggle.
  useEffect(() => {
    if (isOnProjectRoute) autoExpandProjectsNav();
  }, [isOnProjectRoute, autoExpandProjectsNav]);

  const close = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && (
        <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      )}

      <nav
        className={styles.sidebar}
        data-open={sidebarOpen}
        aria-label="Site navigation"
      >
        <div className={styles.header}>
          <Link to="/" className={styles.logo} onClick={close}>
            <span className={styles.logoMark}>◆</span>
            <span>Bismuth</span>
          </Link>
        </div>

        <ul className={styles.navList} role="list">
          <li>
            <Link
              to="/"
              className={styles.navItem}
              data-active={isHome}
              onClick={close}
            >
              <span className={styles.navTitle}>Home</span>
              <span className={styles.navMeta}>presentation</span>
            </Link>
          </li>

          <li className={styles.group}>
            <button
              type="button"
              className={styles.groupHeader}
              aria-expanded={projectsNavExpanded}
              aria-controls="sidebar-projects"
              onClick={toggleProjectsNav}
            >
              <span className={styles.groupTitle}>Projects</span>
              <span
                className={styles.groupChevron}
                data-expanded={projectsNavExpanded}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            <ul
              id="sidebar-projects"
              className={styles.groupList}
              role="list"
              data-expanded={projectsNavExpanded}
              hidden={!projectsNavExpanded}
            >
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
          </li>
        </ul>
      </nav>
    </>
  );
}
