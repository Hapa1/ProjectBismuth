import styles from './StageLoader.module.css';

export function StageLoader() {
  return (
    <div className={styles.loader} aria-label="Loading project…">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  );
}
