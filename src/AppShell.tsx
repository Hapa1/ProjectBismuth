import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './components/Sidebar';
import { SpecFooter } from './components/SpecFooter';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
        <SpecFooter />
      </main>
    </div>
  );
}
