import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Voronoi.module.css';
import type { AudioBands } from '../../lib/useAudioAnalyser';
import { useAudioController } from '../../state/AudioProvider';

import voronoiVert from './shaders/voronoi.vert.glsl?raw';
import voronoiFrag from './shaders/voronoi.frag.glsl?raw';

const MAX_PULSES = 8;

// ---------------------------------------------------------------------------
// usePrefersReducedMotion
// ---------------------------------------------------------------------------
function usePrefersReducedMotion(): boolean {
  const [prm, setPrm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const set = () => setPrm(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);
  return prm;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

interface Controls {
  audioGain: number;
  smoothing: number;
  reactivity: number;
  beatThreshold: number;
  pulseRadius: number;
  pulseDecay: number;
  pointerRadius: number;
  bloomIntensity: number;
  seed: number;
  density: number;
  parallax: number;
  seamWidth: number;
}

const DEFAULTS: Controls = {
  audioGain: 0.95,
  smoothing: 0.82,
  reactivity: 0.62,
  beatThreshold: 1.62,
  pulseRadius: 4.1,
  pulseDecay: 0.9,
  pointerRadius: 2.8,
  bloomIntensity: 0.0,
  seed: 137,
  density: 0.45,
  parallax: 0.08,
  seamWidth: 0.012,
};

// ---------------------------------------------------------------------------
// Pointer / pulse state
// ---------------------------------------------------------------------------

interface Pulse {
  pos: THREE.Vector2;
  intensity: number;
  hue: number;
  age: number;       // 0..1 — how far the wave has traveled
  lifetime: number;  // seconds for the wave to expand fully
}

interface PointerState {
  world: THREE.Vector2;
  strength: number;
  targetStrength: number;
}

interface SharedState {
  pointer: PointerState;
  pulses: Pulse[];
}

type SharedRef = React.MutableRefObject<SharedState>;

interface Dims {
  worldHalfW: number;
  worldHalfH: number;
}

function dimsFor(width: number, height: number, fovDeg: number, distance: number): Dims {
  const fovRad = (fovDeg * Math.PI) / 180;
  const halfH = Math.tan(fovRad / 2) * distance;
  const aspect = Math.max(0.0001, width / height);
  const halfW = halfH * aspect;
  return { worldHalfW: halfW, worldHalfH: halfH };
}

// ---------------------------------------------------------------------------
// PointerTracker
// ---------------------------------------------------------------------------

function PointerTracker({ sharedRef }: { sharedRef: SharedRef }) {
  const { camera, gl } = useThree();
  const ndc = useRef(new THREE.Vector2(0, 0));
  const raycastPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [],
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tmpVec3 = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      );
      sharedRef.current.pointer.targetStrength = 1;
    };
    const onLeave = () => {
      sharedRef.current.pointer.targetStrength = 0;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onLeave);
    };
  }, [gl, sharedRef]);

  useFrame((_, delta) => {
    raycaster.setFromCamera(ndc.current, camera);
    if (raycaster.ray.intersectPlane(raycastPlane, tmpVec3)) {
      sharedRef.current.pointer.world.set(tmpVec3.x, tmpVec3.y);
    }
    const k = 1 - Math.exp(-delta * 6);
    const p = sharedRef.current.pointer;
    p.strength += (p.targetStrength - p.strength) * k;
  });

  return null;
}

// ---------------------------------------------------------------------------
// VoronoiSurface
// ---------------------------------------------------------------------------

interface SurfaceProps {
  dims: Dims;
  reduceMotion: boolean;
  sharedRef: SharedRef;
  controls: Controls;
  pulseDecayRef: React.MutableRefObject<number>;
}

function VoronoiSurface({
  dims,
  reduceMotion,
  sharedRef,
  controls,
  pulseDecayRef,
}: SurfaceProps) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    const pulsePos = new Array(MAX_PULSES).fill(0).map(() => new THREE.Vector2(0, 0));
    const pulseI = new Float32Array(MAX_PULSES);
    const pulseHue = new Float32Array(MAX_PULSES);
    const pulseAge = new Float32Array(MAX_PULSES);
    return new THREE.ShaderMaterial({
      vertexShader: voronoiVert,
      fragmentShader: voronoiFrag,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: controls.reactivity },
        uSeed: { value: controls.seed },
        uDensity: { value: controls.density },
        uParallax: { value: controls.parallax },
        uSeamWidth: { value: controls.seamWidth },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerStrength: { value: 0 },
        uPointerRadius: { value: controls.pointerRadius },
        uPulseCount: { value: 0 },
        uPulsePos: { value: pulsePos },
        uPulseI: { value: pulseI },
        uPulseHue: { value: pulseHue },
        uPulseAge: { value: pulseAge },
        uPulseTravel: { value: controls.pulseRadius },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    material.uniforms.uIntensity.value = controls.reactivity;
    material.uniforms.uSeed.value = controls.seed;
    material.uniforms.uDensity.value = controls.density;
    material.uniforms.uParallax.value = controls.parallax;
    material.uniforms.uSeamWidth.value = controls.seamWidth;
    material.uniforms.uPointerRadius.value = controls.pointerRadius;
    material.uniforms.uPulseTravel.value = controls.pulseRadius;
  }, [controls, material]);

  useEffect(() => {
    pulseDecayRef.current = controls.pulseDecay;
  }, [controls.pulseDecay, pulseDecayRef]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!reduceMotion) {
      material.uniforms.uTime.value += dt * 0.55;
    }

    const shared = sharedRef.current;
    material.uniforms.uPointer.value.copy(shared.pointer.world);
    material.uniforms.uPointerStrength.value = shared.pointer.strength;

    const decay = pulseDecayRef.current;
    const pulses = shared.pulses;
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const p = pulses[i];
      // Age the wave from 0 → 1 over its lifetime; decay slider controls fade.
      p.age += dt / Math.max(p.lifetime, 0.05);
      p.intensity -= decay * dt * 0.4;
      if (p.age >= 1.0 || p.intensity <= 0) pulses.splice(i, 1);
    }

    const count = Math.min(pulses.length, MAX_PULSES);
    const posArr = material.uniforms.uPulsePos.value as THREE.Vector2[];
    const iArr = material.uniforms.uPulseI.value as Float32Array;
    const hueArr = material.uniforms.uPulseHue.value as Float32Array;
    const ageArr = material.uniforms.uPulseAge.value as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const p = pulses[i];
      posArr[i].copy(p.pos);
      iArr[i] = p.intensity;
      hueArr[i] = p.hue;
      ageArr[i] = Math.min(1.0, p.age);
    }
    material.uniforms.uPulseCount.value = count;
  });

  // Plane is sized to match the visible area so the shader covers the viewport.
  const planeW = dims.worldHalfW * 2.2;
  const planeH = dims.worldHalfH * 2.2;

  return (
    <mesh geometry={geometry} material={material} scale={[planeW, planeH, 1]} />
  );
}

// ---------------------------------------------------------------------------
// BeatDriver (same logic as Lattice)
// ---------------------------------------------------------------------------

interface BeatDriverProps {
  bandsRef: React.MutableRefObject<AudioBands>;
  sharedRef: SharedRef;
  dims: Dims;
  controls: Controls;
}

function BeatDriver({ bandsRef, sharedRef, dims, controls }: BeatDriverProps) {
  const slowEnv = useRef(0);
  const fastEnv = useRef(0);
  const lastBeat = useRef(999);
  const sinceAnyPulse = useRef(0);
  const hueSeed = useRef(Math.random());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const b = bandsRef.current;

    if (b.bass > fastEnv.current) {
      fastEnv.current = b.bass;
    } else {
      fastEnv.current = Math.max(b.bass, fastEnv.current - dt * 4.5);
    }
    slowEnv.current = slowEnv.current * 0.985 + b.bass * 0.015;

    lastBeat.current += dt;
    sinceAnyPulse.current += dt;

    const threshold = controls.beatThreshold;
    const refractory = 0.28;

    const transient =
      b.bass > 0.08 &&
      fastEnv.current > slowEnv.current * threshold &&
      lastBeat.current > refractory;
    const heartbeat =
      !transient && sinceAnyPulse.current > 1.6 && b.level > 0.08;

    if (transient || heartbeat) {
      lastBeat.current = transient ? 0 : lastBeat.current;
      sinceAnyPulse.current = 0;

      const pulses = sharedRef.current.pulses;
      if (pulses.length >= MAX_PULSES) pulses.shift();

      const x = (Math.random() * 2 - 1) * dims.worldHalfW * 0.85;
      const y = (Math.random() * 2 - 1) * dims.worldHalfH * 0.85;
      const energy = transient
        ? Math.max(b.bass, fastEnv.current - slowEnv.current)
        : b.level * 0.7;
      const intensity = Math.min(1.35, 0.32 + energy * 0.95);
      hueSeed.current = (hueSeed.current + 0.31 + b.treble * 0.25) % 1;

      pulses.push({
        pos: new THREE.Vector2(x, y),
        intensity,
        hue: hueSeed.current,
        age: 0,
        // Longer traversal keeps motion calmer and less twitchy.
        lifetime: 2.1 + Math.random() * 0.9,
      });
    }
  });

  return null;
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
// Voronoi — exported component
// ---------------------------------------------------------------------------

function Voronoi({ width, height }: ProjectComponentProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const audio = useAudioController();

  // Auto-start the silent demo synth so the visualizer reacts on mount.
  // The synth feeds the analyser tap only — no audible output.
  useEffect(() => {
    void audio.loadDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const meterRef = useRef<HTMLDivElement>(null);
  const pulseDecayRef = useRef(controls.pulseDecay);

  const fovDeg = 22;
  // Distance picked so density 1 yields a comfortable cell count on desktop.
  const baseZ = useMemo(() => {
    const aspect = Math.max(0.0001, width / height);
    const targetCellsAcross = width < 480 ? 4 : 6;
    const fovRad = (fovDeg * Math.PI) / 180;
    // worldHalfW = baseZ * tan(fov/2) * aspect; we want worldHalfW * density ≈ cellsAcross/2
    const halfW = targetCellsAcross / 2 / DEFAULTS.density;
    return halfW / (Math.tan(fovRad / 2) * aspect);
  }, [width, height]);

  const dims = useMemo(
    () => dimsFor(width, height, fovDeg, baseZ),
    [width, height, baseZ],
  );

  const sharedRef = useRef<SharedState>({
    pointer: {
      world: new THREE.Vector2(0, 0),
      strength: 0,
      targetStrength: 0,
    },
    pulses: [],
  });

  useEffect(() => {
    audio.setGain(controls.audioGain);
  }, [audio, controls.audioGain]);
  useEffect(() => {
    audio.setSmoothing(controls.smoothing);
  }, [audio, controls.smoothing]);

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

  const reseed = () =>
    setControls((c) => ({ ...c, seed: Math.floor(Math.random() * 9999) }));

  return (
    <div className={styles.root} style={{ width, height }}>
      <Canvas
        className={styles.canvasHost}
        camera={{ position: [0, 0, baseZ], fov: fovDeg, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      >
        <PointerTracker sharedRef={sharedRef} />
        <VoronoiSurface
          dims={dims}
          reduceMotion={reduceMotion}
          sharedRef={sharedRef}
          controls={controls}
          pulseDecayRef={pulseDecayRef}
        />
        <BeatDriver
          bandsRef={audio.bands}
          sharedRef={sharedRef}
          dims={dims}
          controls={controls}
        />
        <EffectComposer>
          <Bloom
            intensity={controls.bloomIntensity}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.6}
            mipmapBlur
            radius={0.7}
          />
        </EffectComposer>
      </Canvas>

      <aside className={styles.panel} aria-label="Voronoi controls">
        <h3 className={styles.panelTitle}>Voronoi · Beat Cells</h3>
        <p className={styles.subtitle}>
          Seeded voronoi tessellation with per-cell parallax. Hover to light edges with
          the cursor; every audio beat emits a pulse that ripples through the cells.
        </p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Audio Source</p>
          <div className={styles.audioGrid}>
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
            max={2}
            step={0.05}
            value={controls.reactivity}
            onChange={(v) => setControls((c) => ({ ...c, reactivity: v }))}
          />
          <Slider
            label="Beat Threshold"
            min={1.05}
            max={2.0}
            step={0.01}
            value={controls.beatThreshold}
            onChange={(v) => setControls((c) => ({ ...c, beatThreshold: v }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Cells</p>
          <div className={styles.row}>
            <span className={styles.label}>Seed</span>
            <span className={styles.value}>{controls.seed.toFixed(0)}</span>
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={9999}
              step={1}
              value={controls.seed}
              onChange={(e) =>
                setControls((c) => ({ ...c, seed: Number(e.target.value) }))
              }
            />
          </div>
          <button type="button" className={styles.button} onClick={reseed}>
            Randomize Seed
          </button>
          <Slider
            label="Density"
            min={0.3}
            max={3}
            step={0.05}
            value={controls.density}
            onChange={(v) => setControls((c) => ({ ...c, density: v }))}
          />
          <Slider
            label="Parallax"
            min={0}
            max={1.0}
            step={0.01}
            value={controls.parallax}
            onChange={(v) => setControls((c) => ({ ...c, parallax: v }))}
          />
          <Slider
            label="Seam Width"
            min={0.005}
            max={0.06}
            step={0.001}
            value={controls.seamWidth}
            onChange={(v) => setControls((c) => ({ ...c, seamWidth: v }))}
            format={(v) => v.toFixed(3)}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Light</p>
          <Slider
            label="Pointer Radius"
            min={0.5}
            max={6}
            step={0.05}
            value={controls.pointerRadius}
            onChange={(v) => setControls((c) => ({ ...c, pointerRadius: v }))}
          />
          <Slider
            label="Pulse Travel"
            min={0.5}
            max={8}
            step={0.05}
            value={controls.pulseRadius}
            onChange={(v) => setControls((c) => ({ ...c, pulseRadius: v }))}
          />
          <Slider
            label="Pulse Decay"
            min={0.3}
            max={4}
            step={0.05}
            value={controls.pulseDecay}
            onChange={(v) => setControls((c) => ({ ...c, pulseDecay: v }))}
          />
          <Slider
            label="Bloom"
            min={0}
            max={2.5}
            step={0.05}
            value={controls.bloomIntensity}
            onChange={(v) => setControls((c) => ({ ...c, bloomIntensity: v }))}
          />
        </section>
      </aside>
    </div>
  );
}

export default Voronoi;
