import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Prismata.module.css';
import { useAudioAnalyser, type AudioBands } from '../../lib/useAudioAnalyser';
import {
  IridescentSolid,
  useIridescentMaterial,
  useAudioUniforms,
  useBleedDriver,
  usePrefersReducedMotion,
  type BleedEffect,
  type IridescentPaletteMode,
  type IridescentSolidKind,
} from '../../lib/iridescent';

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
interface Controls {
  audioGain: number;
  smoothing: number;
  reactivity: number;
  avgOrbitCount: number;
  ringRadius: number;
  childScale: number;
  spinBase: number;
  bloomIntensity: number;
  palette: IridescentPaletteMode;
  bleedEffect: BleedEffect;
  seed: number;
}

const DEFAULTS: Controls = {
  audioGain: 0.95,
  smoothing: 0.88,
  reactivity: 0.25,
  avgOrbitCount: 5,
  ringRadius: 1.7,
  childScale: 0.5,
  spinBase: 0.18,
  bloomIntensity: 0.7,
  palette: 'bleed',
  bleedEffect: 'rings',
  seed: 137,
};

// ---------------------------------------------------------------------------
// Deterministic per-node variation
// ---------------------------------------------------------------------------
// xmur3 + splitmix-flavored hash so a single integer seed yields stable
// pseudo-random per-node values across renders.
function hash01(seed: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}
function hashInt(seed: number, loInclusive: number, hiInclusive: number): number {
  return loInclusive + Math.floor(hash01(seed) * (hiInclusive - loInclusive + 1));
}

const KINDS: IridescentSolidKind[] = ['tetra', 'box', 'octa', 'icosa', 'prism'];

// ---------------------------------------------------------------------------
// RegisteredCrystal—IridescentSolid that registers its mesh on mount so the
// bleed driver can read live world positions when spawning per-crystal pulses.
// ---------------------------------------------------------------------------
type RegisterCrystal = (mesh: THREE.Mesh) => () => void;

interface RegisteredCrystalProps {
  register: RegisterCrystal | null;
  kind: IridescentSolidKind;
  size: number;
  material: THREE.ShaderMaterial;
  rotation?: [number, number, number];
}

function RegisteredCrystal({ register, kind, size, material, rotation }: RegisteredCrystalProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (!register || !meshRef.current) return;
    return register(meshRef.current);
  }, [register]);
  return (
    <IridescentSolid
      kind={kind}
      size={size}
      material={material}
      rotation={rotation}
      meshRef={meshRef}
    />
  );
}

// ---------------------------------------------------------------------------
// FractalNode — orbiting iridescent crystals
// ---------------------------------------------------------------------------
interface NodeProps {
  level: number;
  maxDepth: number;
  /** Mean orbit count at this level; per-node varies ±1. */
  avgOrbitCount: number;
  ringRadius: number;
  childScale: number;
  spinBase: number;
  material: THREE.ShaderMaterial;
  bandsRef: React.MutableRefObject<AudioBands>;
  reactivity: number;
  reduceMotion: boolean;
  spinSign: number;
  /** Seed used to derive deterministic per-node variation. */
  seed: number;
  /** Mount/unmount registrar so the bleed driver can read live crystal positions. */
  register: RegisterCrystal | null;
}

function FractalNode({
  level,
  maxDepth,
  avgOrbitCount,
  ringRadius,
  childScale,
  spinBase,
  material,
  bandsRef,
  reactivity,
  reduceMotion,
  spinSign,
  seed,
  register,
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

  // Per-node variation derived from the seed. Memoised so the structure is
  // stable across re-renders unless seed/avgOrbitCount changes.
  const variation = useMemo(() => {
    const centerKind = KINDS[hashInt(seed * 7 + 1, 0, KINDS.length - 1)];
    const centerSize = 0.45 + hash01(seed * 11 + 3) * 0.4;
    // Orbit count varies ±1 from the requested average (clamped >= 2).
    const orbitCount = Math.max(2, avgOrbitCount + hashInt(seed * 13 + 5, -1, 1));
    // A common tilt for this node's orbit so children read as a ring rather
    // than a chaotic cloud.
    const tilt = (hash01(seed * 17 + 7) - 0.5) * 0.9;
    const yaw = hash01(seed * 19 + 11) * Math.PI * 2;

    const children = Array.from({ length: orbitCount }, (_, i) => {
      const cs = seed * 31 + i * 53 + 101;
      return {
        seed: cs,
        kind: KINDS[hashInt(cs * 23, 0, KINDS.length - 1)],
        size: 0.45 + hash01(cs * 29) * 0.7, // 0.45–1.15
        angleJitter: (hash01(cs * 37) - 0.5) * 0.5,
        radialJitter: 0.85 + hash01(cs * 41) * 0.3, // 0.85–1.15
        spinPhase: hash01(cs * 43) * Math.PI * 2,
      };
    });

    return { centerKind, centerSize, orbitCount, tilt, yaw, children };
  }, [seed, avgOrbitCount]);

  // Leaf — single crystal, no children.
  if (level >= maxDepth) {
    return (
      <RegisteredCrystal
        register={register}
        kind={variation.centerKind}
        size={variation.centerSize * 0.9}
        material={material}
        rotation={[variation.yaw, variation.tilt, 0]}
      />
    );
  }

  return (
    <group ref={groupRef}>
      {/* Central crystal */}
      <RegisteredCrystal
        register={register}
        kind={variation.centerKind}
        size={variation.centerSize}
        material={material}
        rotation={[variation.tilt * 0.5, variation.yaw, 0]}
      />

      {/* Orbiting children — laid out on a tilted ring with per-child variation. */}
      <group rotation={[variation.tilt, variation.yaw, 0]}>
        {variation.children.map((c, i) => {
          const a = (i / variation.children.length) * Math.PI * 2 + c.angleJitter;
          const r = ringRadius * c.radialJitter;
          const px = Math.cos(a) * r;
          const pz = Math.sin(a) * r;
          return (
            <group
              key={i}
              position={[px, 0, pz]}
              scale={childScale * c.size}
              rotation={[0, c.spinPhase, 0]}
            >
              <FractalNode
                level={level + 1}
                maxDepth={maxDepth}
                avgOrbitCount={Math.max(2, avgOrbitCount - 1)}
                ringRadius={ringRadius * 0.95}
                childScale={childScale}
                spinBase={spinBase * 1.15}
                material={material}
                bandsRef={bandsRef}
                reactivity={reactivity}
                reduceMotion={reduceMotion}
                spinSign={-spinSign}
                seed={c.seed}
                register={register}
              />
            </group>
          );
        })}
      </group>
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
    intensity: controls.palette === 'bleed' ? 2.1 : 0.85,
    fresnelPower: 2.6,
    rimBoost: 1.4,
    innerWash: 0.28,
    alphaBase: 0.04,
  });

  // Live mesh refs of every crystal in the scene; the bleed driver pulls a
  // random one for per-crystal pulse spawning. Stable identity so child
  // mounts/unmounts don't churn upstream effects.
  const crystalRefs = useRef<THREE.Object3D[]>([]);
  const register = useCallback<RegisterCrystal>((mesh) => {
    crystalRefs.current.push(mesh);
    return () => {
      const i = crystalRefs.current.indexOf(mesh);
      if (i >= 0) crystalRefs.current.splice(i, 1);
    };
  }, []);

  // Cosine / colorField driver — paused (no uTime advance) when bleed is active.
  useAudioUniforms(material, {
    bandsRef,
    reactivity: controls.reactivity,
    pause: reduceMotion || controls.palette === 'bleed',
    timeScale: 1.0,
    mirageFloor: 0.55,
    mirageCeiling: 0.95,
    mirageBase: 0.6,
    mirageGain: 0.9,
  });

  // Bleed driver — paused when not in bleed mode (writes to bleed-only uniforms
  // which other modes ignore, so leaving it active is harmless but wasteful).
  // Slower pulse travel + longer lifetime + lighter decay = calmer cadence.
  useBleedDriver(material, {
    bandsRef,
    crystalRefs,
    reactivity: controls.reactivity * 0.7,
    effect: controls.bleedEffect,
    pause: reduceMotion || controls.palette !== 'bleed',
    randomSpawnChance: 0.5,
    randomSpawnRadius: Math.max(controls.ringRadius * 1.4, 2.0),
    pulseTravel: Math.max(controls.ringRadius * 2.4, 3.5),
    pointerRadius: Math.max(controls.ringRadius * 1.8, 3.0),
    pulseDecay: 0.45,
    beat: { threshold: 1.85, refractory: 0.32, heartbeatGap: 1.8 },
  });

  // Treble drives a global hue shift uniform written here so audio influences
  // colour even without a beat (uMirage handles transients separately).
  useFrame(() => {
    const b = bandsRef.current;
    const target = b.treble * 0.2 * controls.reactivity;
    const u = material.uniforms.uHueShift;
    u.value += (target - u.value) * 0.04;
  });

  return (
    <FractalNode
      level={0}
      maxDepth={maxDepth}
      avgOrbitCount={controls.avgOrbitCount}
      ringRadius={controls.ringRadius}
      childScale={controls.childScale}
      spinBase={controls.spinBase}
      material={material}
      bandsRef={bandsRef}
      reactivity={controls.reactivity}
      reduceMotion={reduceMotion}
      spinSign={1}
      seed={controls.seed}
      register={register}
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

  const showControlsPanel = true;

  // Viewport-aware recursion depth — smaller phones get a shallower tree.
  const maxDepth = width < 480 ? 2 : 3;

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
    if (!showControlsPanel) return;

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
  }, [audio.bands, showControlsPanel]);

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
        {controls.bloomIntensity > 0.01 && (
          <EffectComposer>
            <Bloom
              intensity={controls.bloomIntensity}
              luminanceThreshold={0.18}
              luminanceSmoothing={0.6}
              mipmapBlur
              radius={0.7}
            />
          </EffectComposer>
        )}
      </Canvas>

      {showControlsPanel && (
        <aside className={styles.panel} aria-label="Prismata controls">
        <h3 className={styles.panelTitle}>Prismata · Audio Crystals</h3>
        <p className={styles.subtitle}>
          Recursive cloud of orbiting iridescent crystals — orbit count, kind,
          and size vary per node. Bass beats drive the mirage envelope, mid
          energy sets rotation speed, treble shifts the palette.
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
              className={`${styles.button} ${controls.palette === 'bleed' ? styles.buttonActive : ''}`}
              onClick={() => setControls((c) => ({ ...c, palette: 'bleed' }))}
            >
              Bleed
            </button>
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
          {controls.palette === 'bleed' && (
            <div className={styles.audioGrid} style={{ marginTop: '0.5rem' }}>
              {(['rings', 'bloom', 'streaks', 'sparkle'] as const).map((fx) => (
                <button
                  key={fx}
                  type="button"
                  className={`${styles.button} ${controls.bleedEffect === fx ? styles.buttonActive : ''}`}
                  onClick={() => setControls((c) => ({ ...c, bleedEffect: fx }))}
                >
                  {fx[0].toUpperCase() + fx.slice(1)}
                </button>
              ))}
            </div>
          )}
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
            label="Avg Orbits"
            min={2}
            max={7}
            step={1}
            value={controls.avgOrbitCount}
            onChange={(v) => setControls((c) => ({ ...c, avgOrbitCount: v }))}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="Ring Radius"
            min={1.0}
            max={2.6}
            step={0.05}
            value={controls.ringRadius}
            onChange={(v) => setControls((c) => ({ ...c, ringRadius: v }))}
          />
          <Slider
            label="Child Scale"
            min={0.3}
            max={0.65}
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
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              setControls((c) => ({ ...c, seed: Math.floor(Math.random() * 9999) }))
            }
          >
            Reshuffle
          </button>
        </section>
        </aside>
      )}
    </div>
  );
}

export default Prismata;
