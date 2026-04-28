import type { ReactNode } from 'react';
import styles from './SlideText.module.css';

export function SlideTitle({ children }: { children: ReactNode }) {
  return <h1 className={styles.title}>{children}</h1>;
}

export function SlideEyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

export function SlideBody({ children }: { children: ReactNode }) {
  return <p className={styles.body}>{children}</p>;
}
