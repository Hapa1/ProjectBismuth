import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { EXHIBITS } from './registry';
import { Slider } from '../../../lib/controls';
import { useSlideContext } from '../SlideContext';
import styles from './SymbolExhibits.module.css';

/**
 * Slide 2 visual: master/detail symbol explorer.
 *
 * - Left rail: 6 photo thumbnails (radio-style). Tap or arrow-key to switch.
 * - Right detail: large photo + live iridescent <Canvas> + slider stack.
 *
 * Only one WebGL context is created (the detail panel's <Canvas>), in line
 * with the spec's no-multi-context rule. The canvas mounts only when the
 * slide is active so background slides don't run a render loop.
 */
export function SymbolExhibits() {
  const { isActive } = useSlideContext();
  const [activeId, setActiveId] = useState<string>(EXHIBITS[0]?.id ?? '');
  const [showImage, setShowImage] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const active = useMemo(
    () => EXHIBITS.find((e) => e.id === activeId) ?? EXHIBITS[0],
    [activeId],
  );

  // Slider values per exhibit, seeded from defaults.
  const [paramsById, setParamsById] = useState<Record<string, Record<string, number>>>(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const e of EXHIBITS) {
      const init: Record<string, number> = {};
      for (const c of e.controls) init[c.id] = c.default;
      out[e.id] = init;
    }
    return out;
  });

  // Reset to defaults whenever the user picks a new exhibit? No — preserve
  // tweaks when bouncing between symbols. Resets are explicit (button below).
  const params = paramsById[active.id];

  const setParam = (id: string, value: number) => {
    setParamsById((prev) => ({
      ...prev,
      [active.id]: { ...prev[active.id], [id]: value },
    }));
  };

  const reset = () => {
    const init: Record<string, number> = {};
    for (const c of active.controls) init[c.id] = c.default;
    setParamsById((prev) => ({ ...prev, [active.id]: init }));
  };

  // Keyboard nav on the rail (up/down/home/end).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const idx = EXHIBITS.findIndex((x) => x.id === active.id);
      if (idx < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveId(EXHIBITS[(idx + 1) % EXHIBITS.length].id);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveId(EXHIBITS[(idx - 1 + EXHIBITS.length) % EXHIBITS.length].id);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveId(EXHIBITS[0].id);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveId(EXHIBITS[EXHIBITS.length - 1].id);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowImage((v) => !v);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowControls((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active.id]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Slide 2 · The Question</span>
        <h2 className={styles.title}>The same shapes, drawn by people who never met</h2>
      </header>

      <div className={styles.layout}>
        {/* Rail */}
        <nav className={styles.rail} aria-label="Symbols">
          <ul className={styles.railList}>
            {EXHIBITS.map((e) => {
              const selected = e.id === active.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`${styles.railItem} ${selected ? styles.railItemActive : ''}`}
                    onClick={() => setActiveId(e.id)}
                    aria-pressed={selected}
                    aria-label={e.label}
                  >
                    <img
                      className={styles.thumb}
                      src={e.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span className={styles.thumbLabel}>{e.label.split(' — ')[0]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Detail */}
        <section className={styles.detail} aria-live="polite">
          <div className={styles.viewport}>
            {isActive && (
              <Canvas
                key={active.id}
                className={styles.canvas}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
                dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
                camera={{ position: [0, 0, 4], fov: 50 }}
              >
                <color attach="background" args={['#0a0a0a']} />
                {active.render({ params })}
              </Canvas>
            )}

              {!showImage && (
                <button
                  type="button"
                  className={`${styles.reopenTab} ${styles.reopenLeft}`}
                  onClick={() => setShowImage(true)}
                  title="Show image · I"
                >
                  Image
                </button>
              )}

              {!showControls && (
                <button
                  type="button"
                  className={`${styles.reopenTab} ${styles.reopenRight}`}
                  onClick={() => setShowControls(true)}
                  title="Show controls · C"
                >
                  Controls
                </button>
              )}

              {showImage && (
                <figure className={styles.imageOverlay}>
                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={() => setShowImage(false)}
                    aria-label="Hide reference image"
                    title="Hide · I"
                  >
                    ×
                  </button>
                  <img
                    className={styles.image}
                    src={active.image}
                    alt={active.imageAlt}
                    loading="eager"
                    decoding="async"
                  />
                  <figcaption className={styles.caption}>
                    <strong className={styles.captionTitle}>{active.label}</strong>
                    <span className={styles.captionCredit}>
                      <a href={active.credit.sourceUrl} target="_blank" rel="noreferrer">
                        {active.credit.author}
                      </a>
                      {' · '}
                      <a href={active.credit.licenseUrl} target="_blank" rel="noreferrer">
                        {active.credit.license}
                      </a>
                      {' · Wikimedia'}
                    </span>
                  </figcaption>
                </figure>
              )}

            {showControls && (
              <div className={styles.controlsOverlay}>
                <div className={styles.controlsHeader}>
                  <span className={styles.controlsTitle}>Controls</span>
                  <div className={styles.controlsHeaderActions}>
                    <button type="button" className={styles.resetButton} onClick={reset}>
                      Reset
                    </button>
                    <button
                      type="button"
                      className={styles.closeButton}
                      onClick={() => setShowControls(false)}
                      aria-label="Hide controls"
                      title="Hide · C"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {active.controls.map((c) => (
                  <Slider
                    key={c.id}
                    label={c.label}
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={params[c.id]}
                    onChange={(v) => setParam(c.id, v)}
                    format={c.format}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
