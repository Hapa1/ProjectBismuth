import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './components/Sidebar';
import { SpecFooter } from './components/SpecFooter';
import { AudioProvider } from './state/AudioProvider';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <AudioProvider>
      <div className={styles.shell}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
          <SpecFooter />
        </main>
      </div>
    </AudioProvider>
  );
}
