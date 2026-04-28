import { useCallback, useEffect, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Cantor2D.module.css';

interface Controls {
  depth: number;
  spread: number;
  strokeWeight: number;
  autoAnimate: boolean;
  animationSpeed: number;
  foldAmount: number;
}

const DEFAULTS: Controls = {
  depth: 6,
  spread: 0.4,
  strokeWeight: 2,
  autoAnimate: true,
  animationSpeed: 0.8,
  foldAmount: 0,
};

function drawCantorSet(
  p: P5,
  x: number,
  y: number,
  len: number,
  depth: number,
  spread: number,
  foldAmount: number,
) {
  if (depth === 0 || len < 1) return;

  // Apply folding via vertical displacement
  const verticalOffset = foldAmount * 20 * (1 - depth / 6);

  p.stroke(232, 234, 240, 235);
  p.strokeWeight(Math.max(0.5, 2 * (depth / 6)));
  p.line(x, y + verticalOffset, x + len, y + verticalOffset);

  if (depth > 0) {
    const newLen = len * spread;
    const nextY = y + 40;

    // Left segment
    drawCantorSet(p, x, nextY, newLen, depth - 1, spread, foldAmount);
    // Right segment
    drawCantorSet(p, x + len - newLen, nextY, newLen, depth - 1, spread, foldAmount);
  }
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function SliderControl({ label, min, max, step, value, onChange, format }: SliderProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {format ? format(value) : value.toFixed(step < 1 ? 2 : 0)}
      </span>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function Cantor2D({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const controlsRef = useRef<Controls>(controls);
  const sizeRef = useRef({ width, height });
  const animationRef = useRef<number>(0);
  const autoAnimateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  // Setup p5 sketch
  useEffect(() => {
    let cancelled = false;

    async function start() {
      const host = hostRef.current;
      if (!host || sketchRef.current) return;
      const p5Module = await import('p5');
      if (cancelled || !hostRef.current) return;
      const P5Constructor = p5Module.default;

      const sketch = (p: P5) => {
        p.setup = () => {
          const { width: w, height: h } = sizeRef.current;
          p.createCanvas(w, h);
          p.pixelDensity(Math.min(window.devicePixelRatio, 2));
        };

        p.draw = () => {
          const { width: w, height: h } = sizeRef.current;
          const c = controlsRef.current;
          p.background(8, 9, 12);

          const padding = 40;
          const canvasWidth = w - 2 * padding;
          drawCantorSet(
            p,
            padding,
            padding,
            canvasWidth,
            c.depth,
            c.spread,
            c.foldAmount,
          );

          // Draw tagline
          p.fill(154, 154, 154);
          p.textSize(12);
          p.textFont('IBM Plex Mono');
          p.text('Click to fold. Each line is removed to 1/3 at every iteration.', 20, h - 20);
        };

        p.mousePressed = () => {
          const host = hostRef.current;
          if (!host) return false;
          const mx = p.mouseX;
          const my = p.mouseY;
          if (mx > 0 && mx < sizeRef.current.width && my > 0 && my < sizeRef.current.height) {
            // Toggle fold animation
            animationRef.current = animationRef.current > 0 ? 0 : 1;
            return true;
          }
          return false;
        };
      };

      sketchRef.current = new P5Constructor(sketch, host);
    }

    void start();

    return () => {
      cancelled = true;
      sketchRef.current?.remove();
      sketchRef.current = null;
    };
  }, []);

  // Resize canvas when dimensions change
  useEffect(() => {
    const instance = sketchRef.current;
    if (!instance) return;
    instance.resizeCanvas(width, height);
  }, [width, height]);

  // Animation loop: auto-advance fold amount
  useEffect(() => {
    if (!controls.autoAnimate) {
      if (autoAnimateTimerRef.current !== null) {
        clearInterval(autoAnimateTimerRef.current);
        autoAnimateTimerRef.current = null;
      }
      return;
    }

    autoAnimateTimerRef.current = window.setInterval(() => {
      animationRef.current += (controls.animationSpeed * 0.01);
      // Oscillate between 0 and 1
      if (animationRef.current > 1) {
        animationRef.current = 0;
      }
      // Update foldAmount
      setControls((p) => ({ ...p, foldAmount: animationRef.current }));
    }, 30);

    return () => {
      if (autoAnimateTimerRef.current !== null) {
        clearInterval(autoAnimateTimerRef.current);
        autoAnimateTimerRef.current = null;
      }
    };
  }, [controls.autoAnimate, controls.animationSpeed]);

  const setDepth = useCallback((depth: number) => {
    setControls((p) => ({ ...p, depth }));
  }, []);

  const setSpread = useCallback((spread: number) => {
    setControls((p) => ({ ...p, spread }));
  }, []);

  const toggleAutoAnimate = useCallback(() => {
    setControls((p) => ({ ...p, autoAnimate: !p.autoAnimate }));
    animationRef.current = 0;
  }, []);

  const setAnimationSpeed = useCallback((animationSpeed: number) => {
    setControls((p) => ({ ...p, animationSpeed }));
  }, []);

  const reset = useCallback(() => {
    setControls(DEFAULTS);
    animationRef.current = 0;
  }, []);

  return (
    <div className={styles.root}>
      <div ref={hostRef} className={styles.canvasHost} />

      <aside className={styles.panel} aria-label="Cantor 2D controls">
        <h3 className={styles.panelTitle}>Cantor Set (2D)</h3>
        <p className={styles.tagline}>
          Click or enable auto-animate to see the fractal fold and unfold. Each line removes its
          middle third.
        </p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Geometry</p>
          <SliderControl
            label="Depth"
            min={1}
            max={8}
            step={1}
            value={controls.depth}
            onChange={setDepth}
          />
          <SliderControl
            label="Segment ratio"
            min={0.25}
            max={0.5}
            step={0.05}
            value={controls.spread}
            onChange={setSpread}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Animation</p>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="autoAnimate"
              checked={controls.autoAnimate}
              onChange={toggleAutoAnimate}
              aria-label="Auto-animate"
            />
            <label htmlFor="autoAnimate">Auto-animate</label>
          </div>
          {controls.autoAnimate && (
            <SliderControl
              label="Animation speed"
              min={0.2}
              max={2}
              step={0.1}
              value={controls.animationSpeed}
              onChange={setAnimationSpeed}
            />
          )}
          <p className={styles.note}>Click the canvas to manually fold/unfold.</p>
        </section>

        <section className={styles.section}>
          <div className={styles.buttonRow}>
            <button className={styles.button} type="button" onClick={reset}>
              Reset
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

export default Cantor2D;
