import { useEffect, useMemo, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Expanse.module.css';
import { useRandomize } from '../../lib/useRandomize';

type PaletteName = 'rag-belur' | 'cc238' | 'dale-paddle' | 'ducci-x';
type ShadingMode = 'realistic' | 'palette';

interface Controls {
  seed: string;
  animate: boolean;
  speed: number;
  sunX: number;
  sunY: number;
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
  colorVariation: boolean;
  shadingMode: ShadingMode;
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
  sunX: 0.35,
  sunY: 2,
  sunHeight: 620,
  gamma: 2,
  zoom: 1.55,
  heightRange: 10,
  slopeRange: 0.35,
  noiseMagnitude: 3,
  noiseScale: 0.05,
  rotation: 0,
  cellSize: 70,
  outline: true,
  paletteMain: 'rag-belur',
  paletteSecondary: 'rag-belur',
  paletteContrast: 'dale-paddle',
  mainLevels: 3,
  secondaryLevels: 1,
  contrastLevels: 2,
  colorVariation: true,
  shadingMode: 'palette',
};

function ExpanseAnimated({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const controlsRef = useRef<Controls>(DEFAULT_CONTROLS);
  const hoverStateRef = useRef<HoverState>({ map: new Map(), lastTime: 0 });
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);

  const randomize = () => setControls((prev) => ({ ...prev, seed: createSeed() }));
  useRandomize(randomize);

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
          drawExpanse(p, width, height, controlsRef.current, hoverStateRef.current);
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
              onClick={randomize}
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
            max={0.6}
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
          <ShadingModeControl
            value={controls.shadingMode}
            onChange={(value) => setControls((prev) => ({ ...prev, shadingMode: value }))}
          />
          <ToggleControl
            label="Color variation"
            checked={controls.colorVariation}
            onChange={(checked) => setControls((prev) => ({ ...prev, colorVariation: checked }))}
          />
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

interface ShadingModeControlProps {
  value: ShadingMode;
  onChange: (value: ShadingMode) => void;
}

function ShadingModeControl({ value, onChange }: ShadingModeControlProps) {
  return (
    <div className={styles.row}>
      <label htmlFor="select-shading-mode" className={styles.label}>
        Shading
      </label>
      <span className={styles.value} />
      <select
        id="select-shading-mode"
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as ShadingMode)}
      >
        <option value="realistic">Realistic (lit)</option>
        <option value="palette">Palette bands</option>
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
  colorIndex: number;
}

function drawExpanse(p: P5, width: number, height: number, controls: Controls, hover: HoverState) {
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
      const n = smoothNoise2(p, noiseBaseX, noiseBaseY, t * 0.35);
      const nHeight = 1 + Math.max(0, n - 0.4) * 2 * controls.noiseMagnitude;

      const sx =
        (smoothNoise2(p, noiseBaseX * 1.2 + 70, noiseBaseY * 1.1 + 9, t * 0.28) * 2 - 1) *
        controls.slopeRange *
        cw *
        nHeight;
      const sy =
        (smoothNoise2(p, noiseBaseX * 1.3 + 130, noiseBaseY * 1.0 + 21, t * 0.3) * 2 - 1) *
        controls.slopeRange *
        ch *
        nHeight;
      const z = (Math.abs(sx) + Math.abs(sy) + controls.heightRange * nHeight) * extrusionScale;

      // Position-based colour randomisation (no sequential RNG dependency).
      // Use Perlin noise (smooth, neighbour-correlated) for both the palette
      // band selection and the within-palette color index so adjacent cubes
      // form gradients rather than confetti. When colorVariation is disabled,
      // every cell uses the main palette — no secondary/contrast splotches.
      const randomBand = p.noise(noiseBaseX * 0.8 + 53, noiseBaseY * 0.8 + 91, t * 0.12);
      const paletteBand = controls.colorVariation
        ? randomBand < 0.62 ? 0 : randomBand < 0.9 ? 1 : 2
        : 0;

      // Pick one base color per cube so all faces share a hue (top/sides are
      // lit/shaded variants of the same material rather than different palette entries).
      // Use a separate Perlin-noise field at lower frequency so neighbouring cubes
      // share similar hues — producing smooth color gradients across the field.
      const palette = PALETTES[paletteNames[paletteBand]];
      const colorField = p.noise(
        noiseBaseX * 0.6 + (seed % 1000) * 0.0007,
        noiseBaseY * 0.6 + (seed % 1000) * 0.0011,
        t * 0.15 + 17,
      );
      const colorIndex = Math.min(
        palette.length - 1,
        Math.max(0, Math.floor(clamp01(colorField) * palette.length)),
      );

      cells[yi][xi] = { x, y, noiseBaseX, noiseBaseY, sx, sy, z, paletteBand, colorIndex };
      rawZ[yi][xi] = z;
      rawSx[yi][xi] = sx;
      rawSy[yi][xi] = sy;
    }
  }

  // Pass 2: blur height and slope grids so neighbouring tiles blend smoothly.
  // Wider radius on the height grid produces a calmer, more wave-like surface.
  const smoothZ = applyBoxBlur(rawZ, rows, cols, 3);
  const smoothSx = applyBoxBlur(rawSx, rows, cols, 2);
  const smoothSy = applyBoxBlur(rawSy, rows, cols, 2);

  p.background('#e5dfcf');
  p.push();
  p.translate(width / 2, height / 2);

  const sun = getSunPosition(p, width, height, controls);

  // Decay all hover intensities by elapsed time. Slow fade so the trail is gentle.
  const now = p.millis() / 1000;
  const dt = hover.lastTime === 0 ? 0 : Math.min(0.1, now - hover.lastTime);
  hover.lastTime = now;
  const fadeRate = 0.6; // intensity per second (1 / fadeRate seconds to fully fade)
  if (dt > 0 && hover.map.size > 0) {
    for (const [k, v] of hover.map) {
      const next = v - dt * fadeRate;
      if (next <= 0.001) hover.map.delete(k);
      else hover.map.set(k, next);
    }
  }

  // Hit-test: front-to-back (small d first). First top-face containing the
  // mouse wins. We only check inside-canvas mouse positions.
  const mouseInside =
    p.mouseX >= 0 && p.mouseX <= width && p.mouseY >= 0 && p.mouseY <= height;
  if (mouseInside) {
    const mx = p.mouseX - width / 2;
    const my = p.mouseY - height / 2;
    const maxDHit = cols + rows - 2;
    let hit: string | null = null;
    outer: for (let d = 0; d <= maxDHit && hit === null; d += 1) {
      const xiStart = Math.min(cols - 1, d);
      const xiEnd = Math.max(0, d - (rows - 1));
      for (let xi = xiStart; xi >= xiEnd; xi -= 1) {
        const yi = d - xi;
        const { x, y } = cells[yi][xi];
        const z = smoothZ[yi][xi];
        const sx = smoothSx[yi][xi];
        const sy = smoothSy[yi][xi];
        const top: Vec3[] = [
          { x, y, z: z + sx + sy },
          { x: x + cw, y, z: z - sx + sy },
          { x: x + cw, y: y + ch, z: z - sx - sy },
          { x, y: y + ch, z: z + sx - sy },
        ];
        const p0 = project(top[0], basis);
        const p1 = project(top[1], basis);
        const p2 = project(top[2], basis);
        const p3 = project(top[3], basis);
        if (pointInQuad(mx, my, p0, p1, p2, p3)) {
          hit = `${xi},${yi}`;
          break outer;
        }
      }
    }
    if (hit !== null) hover.map.set(hit, 1);
  }

  // Pass 3: painter's algorithm — diagonal order, far to near.
  const maxD = cols + rows - 2;
  for (let d = maxD; d >= 0; d -= 1) {
    const xiStart = Math.min(cols - 1, d);
    const xiEnd = Math.max(0, d - (rows - 1));
    for (let xi = xiStart; xi >= xiEnd; xi -= 1) {
      const yi = d - xi;
      const { x, y, paletteBand, colorIndex } = cells[yi][xi];
      const z = smoothZ[yi][xi];
      const sx = smoothSx[yi][xi];
      const sy = smoothSy[yi][xi];

      const palette = PALETTES[paletteNames[paletteBand]];
      const paletteLevels = levels[paletteBand];
      const baseColor = palette[colorIndex];
      const hoverIntensity = hover.map.get(`${xi},${yi}`) ?? 0;

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

      drawShape(p, basis, shapeLeft, sun, palette, baseColor, paletteLevels, controls.gamma, controls.outline, 0.78, controls.shadingMode, hoverIntensity);
      drawShape(p, basis, shapeRight, sun, palette, baseColor, paletteLevels, controls.gamma, controls.outline, 0.62, controls.shadingMode, hoverIntensity);
      drawShape(p, basis, shapeTop, sun, palette, baseColor, paletteLevels, controls.gamma, controls.outline, 1.08, controls.shadingMode, hoverIntensity);
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
  baseColor: string,
  levels: number,
  gamma: number,
  outline: boolean,
  faceBias: number,
  mode: ShadingMode,
  hoverIntensity: number,
) {
  const illum = clamp01(illuminance(sun, shape, gamma) * faceBias);
  let fill = mode === 'realistic'
    ? shadeColor(baseColor, illum, levels)
    : colorFromPalette(palette, illum, levels);
  if (hoverIntensity > 0) {
    fill = blendTowards(fill, HOVER_TINT, hoverIntensity);
  }
  p.fill(fill);
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

function getSunPosition(_p: P5, width: number, height: number, controls: Controls): Vec3 {
  const sunX = (controls.sunX * width) / 2;
  const sunY = (controls.sunY * height) / 2 - controls.sunHeight;
  return { x: sunX, y: sunY, z: controls.sunHeight };
}

// Warm light tint (sun) and cool shadow tint (sky bounce) — mixing the cube's
// base hue toward these gives faces a believable single-material appearance
// under directional light, instead of swapping palette entries per face.
const LIGHT_TINT = { r: 255, g: 248, b: 228 };
const SHADOW_TINT = { r: 70, g: 78, b: 100 };

function colorFromPalette(palette: string[], illum: number, levels: number): string {
  const steps = Math.max(1, Math.floor(levels));
  const quantized = Math.round(illum * steps) / steps;
  const index = Math.min(palette.length - 1, Math.max(0, Math.floor(quantized * (palette.length - 1))));
  return palette[index];
}

function shadeColor(baseHex: string, illum: number, levels: number): string {
  const base = hexToRgb(baseHex);
  const steps = Math.max(1, Math.floor(levels) + 2); // smoother bands than raw palette levels
  // Soft S-curve so mid-tones dominate and pure black/white are rare.
  const eased = smoothstep(0.05, 0.95, illum);
  const quantized = Math.round(eased * steps) / steps;

  // Brightness bias — push the whole curve up so the scene reads as lit, not
  // half-shadowed. 0 = neutral, >0 = brighter.
  const brightness = 0.18;
  const lit = clamp01(quantized + brightness);

  let r: number;
  let g: number;
  let b: number;
  if (lit < 0.5) {
    // Shadow side: lerp from cool shadow toward base, but keep ambient floor
    // high so the hue is still readable in shadow.
    const t = lit * 2; // 0..1
    const k = 0.6 + t * 0.4; // 0.6 .. 1.0 — mostly base, only a touch of cool tint
    r = lerp(SHADOW_TINT.r, base.r, k);
    g = lerp(SHADOW_TINT.g, base.g, k);
    b = lerp(SHADOW_TINT.b, base.b, k);
  } else {
    // Lit side: lerp from base toward warm light. Stronger cap so highlights pop.
    const t = (lit - 0.5) * 2; // 0..1
    const k = t * 0.65; // 0 .. 0.65
    r = lerp(base.r, LIGHT_TINT.r, k);
    g = lerp(base.g, LIGHT_TINT.g, k);
    b = lerp(base.b, LIGHT_TINT.b, k);
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// Smoother noise field used for the height/slope of the expanse. Combines:
//   1. Domain warping  — sample coords are perturbed by a low-frequency noise
//      field so ridges flow organically instead of aligning to the grid.
//   2. Two-octave fBm  — gives a touch of natural variation without high-frequency
//      chatter (octave 2 amplitude is small).
//   3. Smoothstep ease — softens the response curve so peaks and valleys
//      transition gently rather than abruptly.
function smoothNoise2(p: P5, x: number, y: number, t: number): number {
  const warpX = (p.noise(x * 0.5 + 100, y * 0.5 + 200, t * 0.2) - 0.5) * 1.4;
  const warpY = (p.noise(x * 0.5 + 311, y * 0.5 + 411, t * 0.2 + 5) - 0.5) * 1.4;
  const wx = x + warpX;
  const wy = y + warpY;
  const o1 = p.noise(wx, wy, t);
  const o2 = p.noise(wx * 2.0 + 17, wy * 2.0 + 31, t * 1.15);
  const summed = (o1 * 1.0 + o2 * 0.35) / 1.35;
  return summed * summed * (3 - 2 * summed);
}

interface HoverState {
  map: Map<string, number>;
  lastTime: number;
}

// Accent highlight color used when a tile is hovered. Matches the site accent.
const HOVER_TINT = { r: 167, g: 139, b: 250 };

function blendTowards(
  cssColor: string,
  target: { r: number; g: number; b: number },
  t: number,
): string {
  const k = clamp01(t);
  const base = parseCssRgb(cssColor);
  const r = Math.round(lerp(base.r, target.r, k));
  const g = Math.round(lerp(base.g, target.g, k));
  const b = Math.round(lerp(base.b, target.b, k));
  return `rgb(${r}, ${g}, ${b})`;
}

function parseCssRgb(s: string): { r: number; g: number; b: number } {
  if (s.startsWith('#')) return hexToRgb(s);
  const m = s.match(/rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

// Treats the four projected vertices of the top face as a convex quad and
// tests if (mx, my) lies inside via consistent cross-product signs.
function pointInQuad(mx: number, my: number, a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const s1 = sign2(mx, my, a, b);
  const s2 = sign2(mx, my, b, c);
  const s3 = sign2(mx, my, c, d);
  const s4 = sign2(mx, my, d, a);
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0 || s4 > 0;
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0 || s4 < 0;
  return !(hasPos && hasNeg);
}

function sign2(mx: number, my: number, p1: Vec2, p2: Vec2): number {
  return (mx - p2.x) * (p1.y - p2.y) - (p1.x - p2.x) * (my - p2.y);
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