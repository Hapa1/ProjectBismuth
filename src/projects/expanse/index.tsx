import { useEffect, useMemo, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Expanse.module.css';

type PaletteName = 'rag-belur' | 'cc238' | 'dale-paddle' | 'ducci-x';

interface Controls {
  seed: string;
  animate: boolean;
  speed: number;
  sunX: number;
  sunY: number;
  mouseControlsSun: boolean;
  sunHeight: number;
  gamma: number;
  zoom: number;
  heightRange: number;
  slopeRange: number;
  noiseMagnitude: number;
  noiseScale: number;
  rotation: number;
  cellSize: number;
  outline: boolean;
  paletteMain: PaletteName;
  paletteSecondary: PaletteName;
  paletteContrast: PaletteName;
  mainLevels: number;
  secondaryLevels: number;
  contrastLevels: number;
}

interface Vec2 {
  x: number;
  y: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Basis {
  b1: Vec2;
  b2: Vec2;
  b3: Vec2;
}

const PALETTES: Record<PaletteName, string[]> = {
  'rag-belur': ['#f3e6af', '#f17a35', '#e8553f', '#af8a15', '#394f61'],
  cc238: ['#f8b4a8', '#f77f4e', '#ab8418', '#64794a', '#6a4d66'],
  'dale-paddle': ['#f4edd5', '#b08f1a', '#53635a', '#6a5553', '#4f82bf'],
  'ducci-x': ['#fff4c9', '#f75831', '#cf4f8d', '#5c7f4b', '#59436b'],
};

const DEFAULT_CONTROLS: Controls = {
  seed: createSeed(),
  animate: true,
  speed: 0.55,
  sunX: 0,
  sunY: 0,
  mouseControlsSun: false,
  sunHeight: 620,
  gamma: 0,
  zoom: 1.55,
  heightRange: 10,
  slopeRange: 0.1,
  noiseMagnitude: 3,
  noiseScale: 0.05,
  rotation: 0,
  cellSize: 70,
  outline: false,
  paletteMain: 'rag-belur',
  paletteSecondary: 'cc238',
  paletteContrast: 'dale-paddle',
  mainLevels: 3,
  secondaryLevels: 1,
  contrastLevels: 2,
};

function ExpanseAnimated({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const controlsRef = useRef<Controls>(DEFAULT_CONTROLS);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    let cancelled = false;

    async function startSketch() {
      const host = hostRef.current;
      if (!host || sketchRef.current) return;

      const p5Module = await import('p5');
      if (cancelled || !hostRef.current) return;

      const P5Constructor = p5Module.default;
      const sketch = (p: P5) => {
        p.setup = () => {
          p.createCanvas(width, height);
          p.pixelDensity(Math.min(window.devicePixelRatio, 2));
        };

        p.draw = () => {
          drawExpanse(p, width, height, controlsRef.current);
        };
      };

      sketchRef.current = new P5Constructor(sketch, host);
    }

    void startSketch();

    return () => {
      cancelled = true;
      sketchRef.current?.remove();
      sketchRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = sketchRef.current;
    if (!instance) return;
    instance.resizeCanvas(width, height);
  }, [width, height]);

  const paletteOptions = useMemo(
    () => Object.keys(PALETTES) as PaletteName[],
    [],
  );

  return (
    <div className={styles.root}>
      <div ref={hostRef} className={styles.canvasHost} />

      <aside className={styles.panel} aria-label="Expanse controls">
        <h3 className={styles.panelTitle}>Slant Settings</h3>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Seed</p>
          <div className={styles.seedRow}>
            <input
              className={styles.seedInput}
              value={controls.seed}
              onChange={(event) => setControls((prev) => ({ ...prev, seed: event.target.value }))}
              aria-label="Seed"
            />
            <button
              className={styles.button}
              type="button"
              onClick={() => setControls((prev) => ({ ...prev, seed: createSeed() }))}
            >
              Randomize
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Animation</p>
          <ToggleControl
            label="Animate"
            checked={controls.animate}
            onChange={(checked) => setControls((prev) => ({ ...prev, animate: checked }))}
          />
          <SliderControl
            label="Speed"
            min={0.05}
            max={1.8}
            step={0.01}
            value={controls.speed}
            onChange={(value) => setControls((prev) => ({ ...prev, speed: value }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Sun</p>
          <ToggleControl
            label="Mouse controls sun"
            checked={controls.mouseControlsSun}
            onChange={(checked) => setControls((prev) => ({ ...prev, mouseControlsSun: checked }))}
          />
          <SliderControl
            label="Sun X"
            min={-2}
            max={2}
            step={0.05}
            value={controls.sunX}
            onChange={(value) => setControls((prev) => ({ ...prev, sunX: value }))}
          />
          <SliderControl
            label="Sun Y"
            min={-2}
            max={2}
            step={0.05}
            value={controls.sunY}
            onChange={(value) => setControls((prev) => ({ ...prev, sunY: value }))}
          />
          <SliderControl
            label="Sun Height"
            min={80}
            max={980}
            step={10}
            value={controls.sunHeight}
            onChange={(value) => setControls((prev) => ({ ...prev, sunHeight: value }))}
          />
          <SliderControl
            label="Gamma"
            min={-2}
            max={2}
            step={0.1}
            value={controls.gamma}
            onChange={(value) => setControls((prev) => ({ ...prev, gamma: value }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Cells</p>
          <SliderControl
            label="Zoom"
            min={0.8}
            max={2.6}
            step={0.05}
            value={controls.zoom}
            onChange={(value) => setControls((prev) => ({ ...prev, zoom: value }))}
          />
          <SliderControl
            label="Cell Size"
            min={32}
            max={95}
            step={1}
            value={controls.cellSize}
            onChange={(value) => setControls((prev) => ({ ...prev, cellSize: value }))}
          />
          <SliderControl
            label="Height Range"
            min={1}
            max={20}
            step={1}
            value={controls.heightRange}
            onChange={(value) => setControls((prev) => ({ ...prev, heightRange: value }))}
          />
          <SliderControl
            label="Slope Range"
            min={0}
            max={0.2}
            step={0.01}
            value={controls.slopeRange}
            onChange={(value) => setControls((prev) => ({ ...prev, slopeRange: value }))}
          />
          <SliderControl
            label="Rotation"
            min={-6}
            max={6}
            step={0.2}
            value={controls.rotation}
            onChange={(value) => setControls((prev) => ({ ...prev, rotation: value }))}
          />
          <ToggleControl
            label="Outline cells"
            checked={controls.outline}
            onChange={(checked) => setControls((prev) => ({ ...prev, outline: checked }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Noise</p>
          <SliderControl
            label="Noise Magnitude"
            min={0}
            max={5}
            step={0.1}
            value={controls.noiseMagnitude}
            onChange={(value) => setControls((prev) => ({ ...prev, noiseMagnitude: value }))}
          />
          <SliderControl
            label="Noise Scale"
            min={0.01}
            max={0.12}
            step={0.005}
            value={controls.noiseScale}
            onChange={(value) => setControls((prev) => ({ ...prev, noiseScale: value }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Color</p>
          <SelectControl
            label="Main Palette"
            value={controls.paletteMain}
            options={paletteOptions}
            onChange={(value) => setControls((prev) => ({ ...prev, paletteMain: value }))}
          />
          <SliderControl
            label="Main Levels"
            min={1}
            max={5}
            step={1}
            value={controls.mainLevels}
            onChange={(value) => setControls((prev) => ({ ...prev, mainLevels: value }))}
          />
          <SelectControl
            label="Secondary Palette"
            value={controls.paletteSecondary}
            options={paletteOptions}
            onChange={(value) => setControls((prev) => ({ ...prev, paletteSecondary: value }))}
          />
          <SliderControl
            label="Secondary Levels"
            min={1}
            max={5}
            step={1}
            value={controls.secondaryLevels}
            onChange={(value) => setControls((prev) => ({ ...prev, secondaryLevels: value }))}
          />
          <SelectControl
            label="Contrast Palette"
            value={controls.paletteContrast}
            options={paletteOptions}
            onChange={(value) => setControls((prev) => ({ ...prev, paletteContrast: value }))}
          />
          <SliderControl
            label="Contrast Levels"
            min={1}
            max={5}
            step={1}
            value={controls.contrastLevels}
            onChange={(value) => setControls((prev) => ({ ...prev, contrastLevels: value }))}
          />
        </section>
      </aside>
    </div>
  );
}

interface SliderControlProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function SliderControl({ label, min, max, step, value, onChange }: SliderControlProps) {
  const id = `slider-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <span className={styles.value}>{value.toFixed(step >= 1 ? 0 : 2)}</span>
      <input
        id={id}
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleControl({ label, checked, onChange }: ToggleControlProps) {
  const id = `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={styles.toggleRow}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.checkbox}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

interface SelectControlProps {
  label: string;
  value: PaletteName;
  options: PaletteName[];
  onChange: (value: PaletteName) => void;
}

function SelectControl({ label, value, options, onChange }: SelectControlProps) {
  const id = `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <span className={styles.value} />
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as PaletteName)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CellData {
  x: number;
  y: number;
  noiseBaseX: number;
  noiseBaseY: number;
  sx: number;
  sy: number;
  z: number;
  paletteBand: number;
}

function drawExpanse(p: P5, width: number, height: number, controls: Controls) {
  const t = controls.animate ? p.millis() * 0.001 * controls.speed : 0;
  const seed = hashSeed(controls.seed);
  p.noiseSeed(seed);

  const scale = (Math.min(width, height) / 1500) * controls.zoom;
  const basis = createBasis(controls.rotation, scale);
  const totalDim = 2200;
  const cols = Math.max(8, Math.floor(totalDim / controls.cellSize));
  const rows = Math.max(8, Math.floor(totalDim / controls.cellSize));
  const cw = totalDim / cols;
  const ch = totalDim / rows;
  const extrusionScale = cw / 14;

  const paletteNames: PaletteName[] = [
    controls.paletteMain,
    controls.paletteSecondary,
    controls.paletteContrast,
  ];
  const levels = [controls.mainLevels, controls.secondaryLevels, controls.contrastLevels];

  // Pass 1: pre-compute all cell data in row-major order.
  // Using a position-based hash for palette randomisation lets us compute in
  // any order without depending on sequential RNG call order.
  const cells: CellData[][] = [];
  const rawZ: number[][] = [];
  const rawSx: number[][] = [];
  const rawSy: number[][] = [];

  for (let yi = 0; yi < rows; yi++) {
    cells[yi] = [];
    rawZ[yi] = [];
    rawSx[yi] = [];
    rawSy[yi] = [];
    for (let xi = 0; xi < cols; xi++) {
      const x = -totalDim / 2 + xi * cw;
      const y = -totalDim / 2 + yi * ch;
      const noiseBaseX = (x + 1400 + seed * 0.00001) * controls.noiseScale * 0.02;
      const noiseBaseY = (y + 1400 + seed * 0.00002) * controls.noiseScale * 0.02;
      const n = p.noise(noiseBaseX, noiseBaseY, t * 0.35);
      const nHeight = 1 + Math.max(0, n - 0.4) * 2 * controls.noiseMagnitude;

      const sx =
        (p.noise(noiseBaseX * 1.5 + 70, noiseBaseY * 1.3 + 9, t * 0.28) * 2 - 1) *
        controls.slopeRange *
        cw *
        nHeight;
      const sy =
        (p.noise(noiseBaseX * 1.7 + 130, noiseBaseY * 1.2 + 21, t * 0.3) * 2 - 1) *
        controls.slopeRange *
        ch *
        nHeight;
      const z = (Math.abs(sx) + Math.abs(sy) + controls.heightRange * nHeight) * extrusionScale;

      // Position-based colour randomisation (no sequential RNG dependency).
      const rx = cellHash(xi, yi, seed);
      const ry = cellHash(xi + 997, yi + 1999, seed);
      const randomBand = p.noise(noiseBaseX + rx, noiseBaseY + ry, 0.1);
      const paletteBand = randomBand < 0.62 ? 0 : randomBand < 0.9 ? 1 : 2;

      cells[yi][xi] = { x, y, noiseBaseX, noiseBaseY, sx, sy, z, paletteBand };
      rawZ[yi][xi] = z;
      rawSx[yi][xi] = sx;
      rawSy[yi][xi] = sy;
    }
  }

  // Pass 2: blur height and slope grids so neighbouring tiles blend smoothly.
  // Radius 2 averages over a 5×5 neighbourhood, eliminating the sharp exposed
  // side faces that appear when adjacent tiles differ by even a small amount.
  const smoothZ = applyBoxBlur(rawZ, rows, cols, 2);
  const smoothSx = applyBoxBlur(rawSx, rows, cols, 1);
  const smoothSy = applyBoxBlur(rawSy, rows, cols, 1);

  p.background('#e5dfcf');
  p.push();
  p.translate(width / 2, height / 2);

  const sun = getSunPosition(p, width, height, controls);

  // Pass 3: painter's algorithm — diagonal order, far to near.
  const maxD = cols + rows - 2;
  for (let d = maxD; d >= 0; d -= 1) {
    const xiStart = Math.min(cols - 1, d);
    const xiEnd = Math.max(0, d - (rows - 1));
    for (let xi = xiStart; xi >= xiEnd; xi -= 1) {
      const yi = d - xi;
      const { x, y, paletteBand } = cells[yi][xi];
      const z = smoothZ[yi][xi];
      const sx = smoothSx[yi][xi];
      const sy = smoothSy[yi][xi];

      const palette = PALETTES[paletteNames[paletteBand]];
      const paletteLevels = levels[paletteBand];

      const shapeTop: Vec3[] = [
        { x, y, z: z + sx + sy },
        { x: x + cw, y, z: z - sx + sy },
        { x: x + cw, y: y + ch, z: z - sx - sy },
        { x, y: y + ch, z: z + sx - sy },
      ];
      const shapeLeft: Vec3[] = [
        shapeTop[0],
        shapeTop[3],
        { x, y: y + ch, z: 0 },
        { x, y, z: 0 },
      ];
      const shapeRight: Vec3[] = [
        shapeTop[0],
        { x, y, z: 0 },
        { x: x + cw, y, z: 0 },
        shapeTop[1],
      ];

      drawShape(p, basis, shapeLeft, sun, palette, paletteLevels, controls.gamma, controls.outline, 0.86);
      drawShape(p, basis, shapeRight, sun, palette, paletteLevels, controls.gamma, controls.outline, 0.7);
      drawShape(p, basis, shapeTop, sun, palette, paletteLevels, controls.gamma, controls.outline, 1.05);
    }
  }

  p.pop();
}

function drawShape(
  p: P5,
  basis: Basis,
  shape: Vec3[],
  sun: Vec3,
  palette: string[],
  levels: number,
  gamma: number,
  outline: boolean,
  faceBias: number,
) {
  const illum = clamp01(illuminance(sun, shape, gamma) * faceBias);
  p.fill(colorFromPalette(palette, illum, levels));
  if (outline) {
    p.stroke(0, 90);
    p.strokeWeight(0.8);
  } else {
    p.noStroke();
  }

  p.beginShape();
  for (const vertex of shape) {
    const projected = project(vertex, basis);
    p.vertex(projected.x, projected.y);
  }
  p.endShape(p.CLOSE);
}

function createBasis(rotation: number, scale: number): Basis {
  const rot = (rotation * Math.PI) / 12;
  const phi1 = -Math.PI / 6 + rot;
  const phi2 = -(5 * Math.PI) / 6 + rot;
  const phi3 = -Math.PI / 2 + rot;

  return {
    b1: { x: Math.cos(phi1) * scale, y: Math.sin(phi1) * scale },
    b2: { x: Math.cos(phi2) * scale, y: Math.sin(phi2) * scale },
    b3: { x: Math.cos(phi3) * scale, y: Math.sin(phi3) * scale },
  };
}

function project(point: Vec3, basis: Basis): Vec2 {
  return {
    x: point.x * basis.b1.x + point.y * basis.b2.x + point.z * basis.b3.x,
    y: point.x * basis.b1.y + point.y * basis.b2.y + point.z * basis.b3.y,
  };
}

function illuminance(sun: Vec3, shape: Vec3[], gamma: number): number {
  const a = shape[0];
  const b = shape[1];
  const d = shape[3];
  const ab = sub3(b, a);
  const ad = sub3(d, a);
  const normal = normalize3(cross3(ab, ad));
  const center = centerOf(shape);
  const toSun = normalize3(sub3(sun, center));

  const cosine = dot3(normal, toSun);
  const raw = Math.max(0, -cosine);
  const gammaCurve = Math.pow(2, -gamma);
  return clamp01(Math.pow(raw, gammaCurve));
}

function getSunPosition(p: P5, width: number, height: number, controls: Controls): Vec3 {
  const sunX = controls.mouseControlsSun ? p.mouseX - width / 2 : (controls.sunX * width) / 2;
  const sunY = controls.mouseControlsSun
    ? p.mouseY - height / 2 - controls.sunHeight
    : (controls.sunY * height) / 2 - controls.sunHeight;

  return { x: sunX, y: sunY, z: controls.sunHeight };
}

function colorFromPalette(palette: string[], illum: number, levels: number): string {
  const steps = Math.max(1, Math.floor(levels));
  const quantized = Math.round(illum * steps) / steps;
  const index = Math.min(palette.length - 1, Math.max(0, Math.floor(quantized * (palette.length - 1))));
  return palette[index];
}

function centerOf(points: Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;

  for (const point of points) {
    x += point.x;
    y += point.y;
    z += point.z;
  }

  return {
    x: x / points.length,
    y: y / points.length,
    z: z / points.length,
  };
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize3(v: Vec3): Vec3 {
  const mag = Math.hypot(v.x, v.y, v.z);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function applyBoxBlur(grid: number[][], rows: number, cols: number, radius: number): number[][] {
  const result: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let yi = 0; yi < rows; yi++) {
    for (let xi = 0; xi < cols; xi++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = yi + dy;
          const nx = xi + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
            sum += grid[ny][nx];
            count++;
          }
        }
      }
      result[yi][xi] = sum / count;
    }
  }
  return result;
}

function cellHash(xi: number, yi: number, seed: number): number {
  let h = ((seed ^ (xi * 2654435761)) ^ (yi * 1234567891)) >>> 0;
  h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) >>> 0;
  h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeed(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export default ExpanseAnimated;