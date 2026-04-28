import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Lattice.module.css';
import { useAudioAnalyser, type AudioBands } from '../../lib/useAudioAnalyser';

import seamVert from './shaders/seam.vert.glsl?raw';
import seamFrag from './shaders/seam.frag.glsl?raw';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CELL_SIZE = 1.0;
const SEAM_THICKNESS = 0.06;
const MAX_PULSES = 8;

// ---------------------------------------------------------------------------
// Reduced-motion hook
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
}

const DEFAULTS: Controls = {
  audioGain: 0.9,
  smoothing: 0.82,
  reactivity: 1.1,
  beatThreshold: 1.12,
  pulseRadius: 3.2,
  pulseDecay: 1.4,
  pointerRadius: 2.6,
  bloomIntensity: 1.25,
};

// ---------------------------------------------------------------------------
// Pulse / pointer state shared across frames
// ---------------------------------------------------------------------------

interface Pulse {
  pos: THREE.Vector2;
  intensity: number;
  hue: number;
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

interface GridDims {
  cols: number;
  rows: number;
  worldHalfW: number;
  worldHalfH: number;
}

function gridDimsFor(width: number, height: number): GridDims {
  const cellPx = width < 480 ? 110 : 130;
  const cols = Math.max(3, Math.ceil(width / cellPx) + 1);
  const rows = Math.max(3, Math.ceil(height / cellPx) + 1);
  return {
    cols,
    rows,
    worldHalfW: (cols * CELL_SIZE) / 2,
    worldHalfH: (rows * CELL_SIZE) / 2,
  };
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
// Seams
// ---------------------------------------------------------------------------

interface SeamsProps {
  dims: GridDims;
  reduceMotion: boolean;
  sharedRef: SharedRef;
  controls: Controls;
  pulseDecayRef: React.MutableRefObject<number>;
}

function Seams({ dims, reduceMotion, sharedRef, controls, pulseDecayRef }: SeamsProps) {
  const hRef = useRef<THREE.InstancedMesh>(null!);
  const vRef = useRef<THREE.InstancedMesh>(null!);

  const seamGeometry = useMemo(
    () => new THREE.PlaneGeometry(CELL_SIZE * 1.02, SEAM_THICKNESS),
    [],
  );

  const makeSeamMaterial = () => {
    const pulsePos = new Array(MAX_PULSES).fill(0).map(() => new THREE.Vector2(0, 0));
    const pulseI = new Float32Array(MAX_PULSES);
    const pulseHue = new Float32Array(MAX_PULSES);
    return new THREE.ShaderMaterial({
      vertexShader: seamVert,
      fragmentShader: seamFrag,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1.0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerStrength: { value: 0 },
        uPointerRadius: { value: controls.pointerRadius },
        uPulseCount: { value: 0 },
        uPulsePos: { value: pulsePos },
        uPulseI: { value: pulseI },
        uPulseHue: { value: pulseHue },
        uPulseRadius: { value: controls.pulseRadius },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hMaterial = useMemo(makeSeamMaterial, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vMaterial = useMemo(makeSeamMaterial, []);

  useEffect(() => {
    hMaterial.uniforms.uPointerRadius.value = controls.pointerRadius;
    vMaterial.uniforms.uPointerRadius.value = controls.pointerRadius;
    hMaterial.uniforms.uPulseRadius.value = controls.pulseRadius;
    vMaterial.uniforms.uPulseRadius.value = controls.pulseRadius;
    hMaterial.uniforms.uIntensity.value = controls.reactivity;
    vMaterial.uniforms.uIntensity.value = controls.reactivity;
  }, [controls, hMaterial, vMaterial]);

  useEffect(() => {
    pulseDecayRef.current = controls.pulseDecay;
  }, [controls.pulseDecay, pulseDecayRef]);

  useEffect(() => {
    const h = hRef.current;
    const v = vRef.current;
    if (!h || !v) return;

    const dummy = new THREE.Object3D();
    const cx = (dims.cols - 1) * 0.5;
    const cy = (dims.rows - 1) * 0.5;

    let i = 0;
    for (let y = 0; y < dims.rows; y += 1) {
      for (let x = 0; x < dims.cols; x += 1) {
        dummy.position.set(
          (x - cx) * CELL_SIZE,
          (y - cy) * CELL_SIZE - CELL_SIZE * 0.5,
          0,
        );
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        h.setMatrixAt(i, dummy.matrix);

        dummy.position.set(
          (x - cx) * CELL_SIZE + CELL_SIZE * 0.5,
          (y - cy) * CELL_SIZE,
          0,
        );
        dummy.rotation.set(0, 0, Math.PI * 0.5);
        dummy.updateMatrix();
        v.setMatrixAt(i, dummy.matrix);

        i += 1;
      }
    }
    h.instanceMatrix.needsUpdate = true;
    v.instanceMatrix.needsUpdate = true;
  }, [dims]);

  useEffect(() => {
    return () => {
      seamGeometry.dispose();
      hMaterial.dispose();
      vMaterial.dispose();
    };
  }, [seamGeometry, hMaterial, vMaterial]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!reduceMotion) {
      hMaterial.uniforms.uTime.value += dt;
      vMaterial.uniforms.uTime.value += dt;
    }

    const shared = sharedRef.current;

    // Pointer uniforms
    hMaterial.uniforms.uPointer.value.copy(shared.pointer.world);
    vMaterial.uniforms.uPointer.value.copy(shared.pointer.world);
    hMaterial.uniforms.uPointerStrength.value = shared.pointer.strength;
    vMaterial.uniforms.uPointerStrength.value = shared.pointer.strength;

    // Pulse decay
    const decay = pulseDecayRef.current;
    const pulses = shared.pulses;
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      pulses[i].intensity -= decay * dt;
      if (pulses[i].intensity <= 0) {
        pulses.splice(i, 1);
      }
    }

    // Push pulses to uniforms (both materials reference the same arrays via copy).
    const count = Math.min(pulses.length, MAX_PULSES);
    const hPosArr = hMaterial.uniforms.uPulsePos.value as THREE.Vector2[];
    const hIArr = hMaterial.uniforms.uPulseI.value as Float32Array;
    const hHueArr = hMaterial.uniforms.uPulseHue.value as Float32Array;
    const vPosArr = vMaterial.uniforms.uPulsePos.value as THREE.Vector2[];
    const vIArr = vMaterial.uniforms.uPulseI.value as Float32Array;
    const vHueArr = vMaterial.uniforms.uPulseHue.value as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const p = pulses[i];
      hPosArr[i].copy(p.pos);
      vPosArr[i].copy(p.pos);
      hIArr[i] = p.intensity;
      vIArr[i] = p.intensity;
      hHueArr[i] = p.hue;
      vHueArr[i] = p.hue;
    }
    hMaterial.uniforms.uPulseCount.value = count;
    vMaterial.uniforms.uPulseCount.value = count;
  });

  const count = dims.cols * dims.rows;

  return (
    <>
      <instancedMesh
        ref={hRef}
        args={[seamGeometry, hMaterial, count]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={vRef}
        args={[seamGeometry, vMaterial, count]}
        frustumCulled={false}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Beat detector — spawns pulses on bass transients
// ---------------------------------------------------------------------------

interface BeatDriverProps {
  bandsRef: React.MutableRefObject<AudioBands>;
  sharedRef: SharedRef;
  dims: GridDims;
  controls: Controls;
}

function BeatDriver({ bandsRef, sharedRef, dims, controls }: BeatDriverProps) {
  const slowEnv = useRef(0); // long-term bass average
  const fastEnv = useRef(0); // fast attack peak follower
  const lastBeat = useRef(999);
  const sinceAnyPulse = useRef(0);
  const hueSeed = useRef(Math.random());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const b = bandsRef.current;

    // Fast attack / slow release envelope (transient follower).
    if (b.bass > fastEnv.current) {
      fastEnv.current = b.bass; // instant attack
    } else {
      fastEnv.current = Math.max(b.bass, fastEnv.current - dt * 4.5);
    }
    // Long-term moving average — slower than 0.95 so steady pads still allow
    // their fluctuations to peek above the average.
    slowEnv.current = slowEnv.current * 0.985 + b.bass * 0.015;

    lastBeat.current += dt;
    sinceAnyPulse.current += dt;

    const threshold = controls.beatThreshold;
    const refractory = 0.14;

    const transient =
      b.bass > 0.08 &&
      fastEnv.current > slowEnv.current * threshold &&
      lastBeat.current > refractory;

    // Heartbeat fallback: if we haven't fired a pulse in a while but there IS
    // signal, emit a softer pulse so continuous sources (pads, drones) still
    // animate the lattice.
    const heartbeat =
      !transient &&
      sinceAnyPulse.current > 0.9 &&
      b.level > 0.06;

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
      const intensity = Math.min(2.2, 0.5 + energy * 1.8);
      hueSeed.current = (hueSeed.current + 0.31 + b.treble * 0.25) % 1;

      pulses.push({
        pos: new THREE.Vector2(x, y),
        intensity,
        hue: hueSeed.current,
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
// Lattice — exported component
// ---------------------------------------------------------------------------

function Lattice({ width, height }: ProjectComponentProps) {
  const reduceMotion = usePrefersReducedMotion();
  const dims = useMemo(() => gridDimsFor(width, height), [width, height]);
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const audio = useAudioAnalyser();
  const meterRef = useRef<HTMLDivElement>(null);
  const pulseDecayRef = useRef(controls.pulseDecay);

  // Long lens for a flat front-on view.
  const fovDeg = 18;
  const baseZ = useMemo(() => {
    const fovRad = (fovDeg * Math.PI) / 180;
    const fitH = (dims.rows * CELL_SIZE * 0.5) / Math.tan(fovRad / 2);
    const aspect = Math.max(0.0001, width / height);
    const fitW = (dims.cols * CELL_SIZE * 0.5) / (Math.tan(fovRad / 2) * aspect);
    return Math.max(fitH, fitW) * 0.98;
  }, [dims, width, height]);

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

  // Update meters from audio bands.
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
        camera={{ position: [0, 0, baseZ], fov: fovDeg, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      >
        <PointerTracker sharedRef={sharedRef} />
        <Seams
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

      <aside className={styles.panel} aria-label="Lattice controls">
        <h3 className={styles.panelTitle}>Lattice · Beat Glow</h3>
        <p className={styles.subtitle}>
          A grid that lights only where it&rsquo;s touched. Hover to paint with the cursor;
          every audio beat emits a pulse with intensity proportional to the bass hit.
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
            label="Pulse Radius"
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

export default Lattice;
