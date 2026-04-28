import { useId } from 'react';
import styles from './Slider.module.css';

export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

/**
 * Standard slider used by individual art projects (voronoi, apex, lattice,
 * etc.) and by the slide exhibit panel. Two-row grid: label + value above
 * a full-width range input. 44px hit target, accent color drives thumb.
 */
export function Slider({ label, min, max, step, value, onChange, format }: SliderProps) {
  const id = useId();
  const display = format ? format(value) : value.toFixed(2);
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <span className={styles.value} aria-hidden="true">{display}</span>
      <input
        id={id}
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={display}
      />
    </div>
  );
}
