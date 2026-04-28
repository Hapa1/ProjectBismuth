import { Link } from '@tanstack/react-router';
import styles from './NotFoundView.module.css';

export function NotFoundView() {
  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <p className={styles.message}>Project not found.</p>
      <Link to="/" className={styles.back}>← back to index</Link>
    </div>
  );
}
