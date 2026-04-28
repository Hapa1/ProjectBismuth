import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Prismata.module.css';
import { useAudioAnalyser, type AudioBands } from '../../lib/useAudioAnalyser';
import {
  IridescentLine,
  IridescentPolygon,
  IridescentSolid,
  useIridescentMaterial,
  useAudioUniforms,
  usePrefersReducedMotion,
  type IridescentPaletteMode,
} from '../../lib/iridescent';

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
interface Controls {
  audioGain: number;
  smoothing: number;
  reactivity: number;
  branchCount: number;
  ringRadius: number;
  childScale: number;
  spinBase: number;
  bloomIntensity: number;
  palette: IridescentPaletteMode;
}

const DEFAULTS: Controls = {
  audioGain: 0.95,
  smoothing: 0.82,
  reactivity: 0.85,
  branchCount: 5,
  ringRadius: 1.55,
  childScale: 0.46,
  spinBase: 0.28,
  bloomIntensity: 0.7,
  palette: 'cosine',
};

// ---------------------------------------------------------------------------
// FractalNode — recursive iridescent spire
// ---------------------------------------------------------------------------
interface NodeProps {
  level: number;
  maxDepth: number;
  branchCount: number;
  ringRadius: number;
  childScale: number;
  spinBase: number;
  material: THREE.ShaderMaterial;
  bandsRef: React.MutableRefObject<AudioBands>;
  reactivity: number;
  reduceMotion: boolean;
  /** Reverses spin sign every other level for visual contrast. */
  spinSign: number;
}

function FractalNode({
  level,
  maxDepth,
  branchCount,
  ringRadius,
  childScale,
  spinBase,
  material,
  bandsRef,
  reactivity,
  reduceMotion,
  spinSign,
}: NodeProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reduceMotion || !groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const b = bandsRef.current;
    const speed = spinBase + b.mid * 1.6 * reactivity;
    groupRef.current.rotation.y += dt * speed * spinSign;
    groupRef.current.rotation.x += dt * speed * 0.35 * spinSign;
  });

  // Generate ring positions in the XZ plane (computed even at leaves so the
  // hook order stays stable; unused at leaves).
  const ringPoints = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < branchCount; i += 1) {
      const a = (i / branchCount) * Math.PI * 2;
      pts.push([Math.cos(a) * ringRadius, 0, Math.sin(a) * ringRadius]);
    }
    return pts;
  }, [branchCount, ringRadius]);

  // Leaf — just a small solid.
  if (level >= maxDepth) {
    return (
      <IridescentSolid
        kind={level % 2 === 0 ? 'tetra' : 'octa'}
        size={0.55}
        material={material}
      />
    );
  }

  return (
    <group ref={groupRef}>
      {/* Central solid */}
      <IridescentSolid
        kind={level === 0 ? 'icosa' : level % 2 === 0 ? 'tetra' : 'octa'}
        size={0.62}
        material={material}
      />

      {/* Encircling polygon outline (lies in XZ plane) */}
      <IridescentPolygon
        sides={Math.max(3, branchCount + 1)}
        radius={ringRadius * 0.72}
        outlineWidth={0.022}
        rotation={[Math.PI / 2, 0, 0]}
        material={material}
      />

      {/* Branch lines + child nodes */}
      {ringPoints.map((p, i) => (
        <group key={i}>
          <IridescentLine
            points={[[0, 0, 0], p]}
            width={0.018}
            material={material}
          />
          <group position={p} scale={childScale}>
            <FractalNode
              level={level + 1}
              maxDepth={maxDepth}
              branchCount={Math.max(3, branchCount - 1)}
              ringRadius={ringRadius * 0.95}
              childScale={childScale}
              spinBase={spinBase * 1.1}
              material={material}
              bandsRef={bandsRef}
              reactivity={reactivity}
              reduceMotion={reduceMotion}
              spinSign={-spinSign}
            />
          </group>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
interface SceneProps {
  bandsRef: React.MutableRefObject<AudioBands>;
  controls: Controls;
  reduceMotion: boolean;
  maxDepth: number;
}

function Scene({ bandsRef, controls, reduceMotion, maxDepth }: SceneProps) {
  const material = useIridescentMaterial({
    palette: controls.palette,
    intensity: 1.1,
    fresnelPower: 2.6,
    rimBoost: 1.7,
    innerWash: 0.35,
    alphaBase: 0.04,
  });

  // Audio drives uTime + uMirage + uLevel + uTreble on the shared material.
  useAudioUniforms(material, {
    bandsRef,
    reactivity: controls.reactivity,
    pause: reduceMotion,
    timeScale: 1.0,
  });

  // Treble drives a global hue shift uniform written here so audio influences
  // colour even without a beat (uMirage handles transients separately).
  useFrame(() => {
    const b = bandsRef.current;
    const target = b.treble * 0.35 * controls.reactivity;
    const u = material.uniforms.uHueShift;
    u.value += (target - u.value) * 0.05;
  });

  return (
    <FractalNode
      level={0}
      maxDepth={maxDepth}
      branchCount={controls.branchCount}
      ringRadius={controls.ringRadius}
      childScale={controls.childScale}
      spinBase={controls.spinBase}
      material={material}
      bandsRef={bandsRef}
      reactivity={controls.reactivity}
      reduceMotion={reduceMotion}
      spinSign={1}
    />
  );
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------
interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function Slider({ label, min, max, step, value, onChange, format }: SliderProps) {
  const display = format ? format(value) : value.toFixed(2);
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{display}</span>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prismata — exported component
// ---------------------------------------------------------------------------
function Prismata({ width, height }: ProjectComponentProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const audio = useAudioAnalyser();
  const meterRef = useRef<HTMLDivElement>(null);

  // Viewport-aware recursion depth — smaller phones get a shallower tree.
  const maxDepth = width < 480 ? 2 : width < 1024 ? 3 : 3;

  // Camera pulls back on narrow screens so the whole structure fits.
  const camZ = width < 480 ? 5.6 : width < 1024 ? 4.8 : 4.2;

  useEffect(() => {
    audio.setGain(controls.audioGain);
  }, [audio, controls.audioGain]);
  useEffect(() => {
    audio.setSmoothing(controls.smoothing);
  }, [audio, controls.smoothing]);

  // Drive the level meters in the panel.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const root = meterRef.current;
      if (root) {
        const b = audio.bands.current;
        const bars = root.querySelectorAll<HTMLElement>(`.${styles.meterFill}`);
        const values = [b.bass, b.mid, b.treble, b.level];
        bars.forEach((bar, i) => {
          bar.style.width = `${Math.min(100, values[i] * 130)}%`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audio.bands]);

  const onFile: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) void audio.loadFile(file);
    event.target.value = '';
  };

  return (
    <div className={styles.root} style={{ width, height }}>
      <Canvas
        className={styles.canvasHost}
        camera={{ position: [0, 1.0, camZ], fov: 38, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      >
        <Scene
          bandsRef={audio.bands}
          controls={controls}
          reduceMotion={reduceMotion}
          maxDepth={maxDepth}
        />
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2.5}
          maxDistance={10}
        />
        <EffectComposer>
          <Bloom
            intensity={controls.bloomIntensity}
            luminanceThreshold={0.18}
            luminanceSmoothing={0.6}
            mipmapBlur
            radius={0.7}
          />
        </EffectComposer>
      </Canvas>

      <aside className={styles.panel} aria-label="Prismata controls">
        <h3 className={styles.panelTitle}>Prismata · Audio Fractal</h3>
        <p className={styles.subtitle}>
          Recursive iridescent spire built from shared line, polygon, and solid
          primitives. Bass beats drive the mirage envelope, mid energy sets
          rotation speed, treble shifts the palette.
        </p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Audio Source</p>
          <div className={styles.audioGrid}>
            <button
              type="button"
              className={`${styles.button} ${audio.source === 'demo' ? styles.buttonActive : ''}`}
              onClick={() => void audio.loadDemo()}
            >
              Demo Pad
            </button>
            <button
              type="button"
              className={`${styles.button} ${audio.source === 'mic' ? styles.buttonActive : ''}`}
              onClick={() => void audio.enableMic()}
            >
              Microphone
            </button>
            <button
              type="button"
              className={`${styles.button} ${audio.source === 'tab' ? styles.buttonActive : ''}`}
              onClick={() => {
                audio.captureTab().catch((err: unknown) => {
                  const message = err instanceof Error ? err.message : String(err);
                  // eslint-disable-next-line no-alert
                  window.alert(`Tab audio capture failed:\n\n${message}`);
                });
              }}
            >
              Tab Audio
            </button>
            <label
              className={`${styles.button} ${styles.fileLabel} ${audio.source === 'file' ? styles.buttonActive : ''}`}
            >
              Load File
              <input
                className={styles.fileInput}
                type="file"
                accept="audio/*"
                onChange={onFile}
              />
            </label>
            <button
              type="button"
              className={styles.button}
              onClick={() => audio.stop()}
              disabled={!audio.isActive}
            >
              Stop
            </button>
          </div>
          <div className={styles.meters} ref={meterRef}>
            {(['BASS', 'MID', 'TREBLE', 'LEVEL'] as const).map((m) => (
              <div key={m} className={styles.meter}>
                <span className={styles.meterLabel}>{m}</span>
                <span className={styles.meterBar}>
                  <span className={styles.meterFill} />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Palette</p>
          <div className={styles.audioGrid}>
            <button
              type="button"
              className={`${styles.button} ${controls.palette === 'cosine' ? styles.buttonActive : ''}`}
              onClick={() => setControls((c) => ({ ...c, palette: 'cosine' }))}
            >
              Cosine
            </button>
            <button
              type="button"
              className={`${styles.button} ${controls.palette === 'colorField' ? styles.buttonActive : ''}`}
              onClick={() => setControls((c) => ({ ...c, palette: 'colorField' }))}
            >
              Color Field
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Audio Mix</p>
          <Slider
            label="Audio Gain"
            min={0}
            max={1.5}
            step={0.01}
            value={controls.audioGain}
            onChange={(v) => setControls((c) => ({ ...c, audioGain: v }))}
          />
          <Slider
            label="Smoothing"
            min={0}
            max={0.96}
            step={0.01}
            value={controls.smoothing}
            onChange={(v) => setControls((c) => ({ ...c, smoothing: v }))}
          />
          <Slider
            label="Reactivity"
            min={0}
            max={1.5}
            step={0.01}
            value={controls.reactivity}
            onChange={(v) => setControls((c) => ({ ...c, reactivity: v }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Geometry</p>
          <Slider
            label="Branches"
            min={3}
            max={7}
            step={1}
            value={controls.branchCount}
            onChange={(v) => setControls((c) => ({ ...c, branchCount: v }))}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="Ring Radius"
            min={1.0}
            max={2.4}
            step={0.05}
            value={controls.ringRadius}
            onChange={(v) => setControls((c) => ({ ...c, ringRadius: v }))}
          />
          <Slider
            label="Child Scale"
            min={0.3}
            max={0.6}
            step={0.01}
            value={controls.childScale}
            onChange={(v) => setControls((c) => ({ ...c, childScale: v }))}
          />
          <Slider
            label="Spin Base"
            min={0}
            max={1.0}
            step={0.01}
            value={controls.spinBase}
            onChange={(v) => setControls((c) => ({ ...c, spinBase: v }))}
          />
          <Slider
            label="Bloom"
            min={0}
            max={1.5}
            step={0.01}
            value={controls.bloomIntensity}
            onChange={(v) => setControls((c) => ({ ...c, bloomIntensity: v }))}
          />
        </section>
      </aside>
    </div>
  );
}

export default Prismata;
