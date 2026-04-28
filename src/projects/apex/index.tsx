import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import type { AudioBands } from '../../lib/useAudioAnalyser';
import { useAudioController } from '../../state/AudioProvider';
import styles from './Apex.module.css';
import vertexShader from './shaders/apex.vert.glsl?raw';
import mirageFragmentShader from './shaders/apex.frag.glsl?raw';
import bleedFragmentShader from './shaders/apex_bleed.frag.glsl?raw';

const MAX_PULSES = 8;

type Mode = 'mirage' | 'bleed';
type BleedEffect = 'rings' | 'bloom' | 'streaks' | 'sparkle';

const BLEED_EFFECTS: { id: BleedEffect; label: string }[] = [
  { id: 'rings', label: 'Rings' },
  { id: 'bloom', label: 'Bloom' },
  { id: 'streaks', label: 'Streaks' },
  { id: 'sparkle', label: 'Sparkle' },
];

const BLEED_EFFECT_INDEX: Record<BleedEffect, number> = {
  rings: 0,
  bloom: 1,
  streaks: 2,
  sparkle: 3,
};

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
  mode: Mode;
  bleedEffect: BleedEffect;
  audioGain: number;
  smoothing: number;
  rotationSpeed: number;
  reactivity: number;
  bloomIntensity: number;
  zoom: number;
  beatThreshold: number;
  fadeDecay: number;
  mirageFloor: number;
  pulseRadius: number;
  pulseDecay: number;
  pointerRadius: number;
}

const DEFAULTS: Controls = {
  mode: 'bleed',
  bleedEffect: 'rings',
  audioGain: 1.2,
  smoothing: 0.34,
  rotationSpeed: 0.25,
  reactivity: 1.0,
  bloomIntensity: 0.7,
  zoom: 12,
  beatThreshold: 1.32,
  fadeDecay: 1.3,
  mirageFloor: 0.06,
  pulseRadius: 2.6,
  pulseDecay: 1.2,
  pointerRadius: 1.6,
};

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
// Scene
// ---------------------------------------------------------------------------
interface SceneProps {
  bandsRef: React.MutableRefObject<AudioBands>;
  controls: Controls;
  reduceMotion: boolean;
}

// ---------------------------------------------------------------------------
// Shared pulse + pointer state (bleed mode)
// ---------------------------------------------------------------------------
interface Pulse {
  pos: THREE.Vector3;
  intensity: number;
  hue: number;
  age: number;
  lifetime: number;
}

interface SharedState {
  pointer: { world: THREE.Vector3; strength: number; targetStrength: number };
  pulses: Pulse[];
}

type SharedRef = React.MutableRefObject<SharedState>;

function makeShared(): SharedState {
  return {
    pointer: { world: new THREE.Vector3(), strength: 0, targetStrength: 0 },
    pulses: [],
  };
}

// ---------------------------------------------------------------------------
// PointerTracker — raycasts pointer into the pyramid mesh (bleed mode)
// ---------------------------------------------------------------------------
function PointerTracker({
  sharedRef,
  meshRef,
}: {
  sharedRef: SharedRef;
  meshRef: React.MutableRefObject<THREE.Mesh | null>;
}) {
  const { camera, gl } = useThree();
  const ndc = useRef(new THREE.Vector2(0, 0));
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

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
    const mesh = meshRef.current;
    if (mesh) {
      const hits = raycaster.intersectObject(mesh, false);
      if (hits.length > 0) {
        sharedRef.current.pointer.world.copy(hits[0].point);
      }
    }
    const k = 1 - Math.exp(-delta * 6);
    const p = sharedRef.current.pointer;
    p.strength += (p.targetStrength - p.strength) * k;
  });

  return null;
}

// ---------------------------------------------------------------------------
// Camera rig
// ---------------------------------------------------------------------------
function CameraRig({ zoom }: { zoom: number }) {
  useFrame((state, delta) => {
    const k = 1 - Math.exp(-delta * 6);
    const cam = state.camera;
    cam.position.x += (0 - cam.position.x) * k;
    cam.position.y += (0.6 - cam.position.y) * k;
    cam.position.z += (zoom - cam.position.z) * k;
    cam.lookAt(0, 0, 0);
  });
  return null;
}

// ---------------------------------------------------------------------------
// Scene props
// ---------------------------------------------------------------------------
interface SceneProps {
  bandsRef: React.MutableRefObject<AudioBands>;
  controls: Controls;
  reduceMotion: boolean;
}

// ---------------------------------------------------------------------------
// MirageScene — fading luminescent mirage that pulses on every beat
// ---------------------------------------------------------------------------
function MirageScene({ bandsRef, controls, reduceMotion }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const slowEnv = useRef(0);
  const fastEnv = useRef(0);
  const lastBeat = useRef(999);
  const sinceAnyBeat = useRef(0);
  const mirageEnv = useRef(0.0);

  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 2, 4, 1);
    geo.rotateX(Math.PI);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: mirageFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uMirage: { value: 0 },
          uTreble: { value: 0 },
          uMid: { value: 0 },
          uLevel: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const b = bandsRef.current;
    const r = controls.reactivity;

    if (b.bass > fastEnv.current) {
      fastEnv.current = b.bass;
    } else {
      fastEnv.current = Math.max(b.bass, fastEnv.current - dt * 4.5);
    }
    slowEnv.current = slowEnv.current * 0.985 + b.bass * 0.015;

    lastBeat.current += dt;
    sinceAnyBeat.current += dt;

    const refractory = 0.16;
    const transient =
      b.bass > 0.08 &&
      fastEnv.current > slowEnv.current * controls.beatThreshold &&
      lastBeat.current > refractory;
    const heartbeat =
      !transient && sinceAnyBeat.current > 1.1 && b.level > 0.05;

    if (transient || heartbeat) {
      lastBeat.current = transient ? 0 : lastBeat.current;
      sinceAnyBeat.current = 0;
      const energy = transient
        ? Math.max(b.bass, fastEnv.current - slowEnv.current)
        : b.level * 0.7;
      const target = Math.min(1.3, 0.7 + energy * r * 1.6);
      mirageEnv.current = Math.max(mirageEnv.current, target);
    }

    const floor = controls.mirageFloor;
    const above = Math.max(0, mirageEnv.current - floor);
    mirageEnv.current = floor + above * Math.exp(-dt * controls.fadeDecay);

    material.uniforms.uTime.value += dt;
    material.uniforms.uMirage.value = mirageEnv.current;
    material.uniforms.uTreble.value = b.treble * r;
    material.uniforms.uMid.value = b.mid * r;
    material.uniforms.uLevel.value = b.level * r;

    if (!reduceMotion && meshRef.current) {
      const speedBoost = 1.0 + b.level * 1.4;
      meshRef.current.rotation.y += dt * controls.rotationSpeed * speedBoost;
      meshRef.current.rotation.x =
        Math.sin(material.uniforms.uTime.value * 0.3) * 0.06;
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

// ---------------------------------------------------------------------------
// BleedScene — voronoi-style pointer + audio-pulse spotlights on the pyramid
// ---------------------------------------------------------------------------
function BleedScene({ bandsRef, controls, reduceMotion }: SceneProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Beat detector
  const slowEnv = useRef(0);
  const fastEnv = useRef(0);
  const lastBeat = useRef(999);
  const sinceAnyBeat = useRef(0);
  const hueSeed = useRef(Math.random());

  const sharedRef = useRef<SharedState>(makeShared());

  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 2, 4, 1);
    geo.rotateX(Math.PI);
    return geo;
  }, []);

  const material = useMemo(() => {
    const pulsePos = new Array(MAX_PULSES).fill(0).map(() => new THREE.Vector3());
    const pulseI = new Float32Array(MAX_PULSES);
    const pulseHue = new Float32Array(MAX_PULSES);
    const pulseAge = new Float32Array(MAX_PULSES);
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: bleedFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: controls.reactivity },
        uPointer: { value: new THREE.Vector3() },
        uPointerStrength: { value: 0 },
        uPointerRadius: { value: controls.pointerRadius },
        uPulseCount: { value: 0 },
        uPulsePos: { value: pulsePos },
        uPulseI: { value: pulseI },
        uPulseHue: { value: pulseHue },
        uPulseAge: { value: pulseAge },
        uPulseTravel: { value: controls.pulseRadius },
        uEffect: { value: BLEED_EFFECT_INDEX[controls.bleedEffect] },
      },
      side: THREE.DoubleSide,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    material.uniforms.uIntensity.value = controls.reactivity;
    material.uniforms.uPointerRadius.value = controls.pointerRadius;
    material.uniforms.uPulseTravel.value = controls.pulseRadius;
    material.uniforms.uEffect.value = BLEED_EFFECT_INDEX[controls.bleedEffect];
  }, [controls, material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Spawn a pulse at a random point on the cone surface (in mesh-local space,
  // then transform to world).
  const spawnPulse = (intensity: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const angle = Math.random() * Math.PI * 2;
    // Bias t toward the wider top half — bigger surface area there.
    const t = Math.pow(Math.random(), 0.7);
    // Cone, apex-down: y ∈ [-1, 1] where +1 is the wide top, radius scales with t.
    const radius = t;
    const yLocal = -1 + 2 * t;
    const local = new THREE.Vector3(
      Math.cos(angle) * radius,
      yLocal,
      Math.sin(angle) * radius,
    );
    const world = local.applyMatrix4(mesh.matrixWorld);

    const pulses = sharedRef.current.pulses;
    if (pulses.length >= MAX_PULSES) pulses.shift();
    hueSeed.current = (hueSeed.current + 0.31) % 1;
    pulses.push({
      pos: world,
      intensity,
      hue: hueSeed.current,
      age: 0,
      lifetime: 0.85 + Math.random() * 0.4,
    });
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const b = bandsRef.current;

    // ---- Beat detection ----
    if (b.bass > fastEnv.current) {
      fastEnv.current = b.bass;
    } else {
      fastEnv.current = Math.max(b.bass, fastEnv.current - dt * 4.5);
    }
    slowEnv.current = slowEnv.current * 0.985 + b.bass * 0.015;
    lastBeat.current += dt;
    sinceAnyBeat.current += dt;

    const refractory = 0.14;
    const transient =
      b.bass > 0.08 &&
      fastEnv.current > slowEnv.current * controls.beatThreshold &&
      lastBeat.current > refractory;
    const heartbeat =
      !transient && sinceAnyBeat.current > 0.9 && b.level > 0.06;

    if (transient || heartbeat) {
      lastBeat.current = transient ? 0 : lastBeat.current;
      sinceAnyBeat.current = 0;
      const energy = transient
        ? Math.max(b.bass, fastEnv.current - slowEnv.current)
        : b.level * 0.7;
      const intensity = Math.min(2.2, 0.5 + energy * 1.8);
      spawnPulse(intensity);
    }

    // ---- Age + decay pulses ----
    const decay = controls.pulseDecay;
    const pulses = sharedRef.current.pulses;
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const p = pulses[i];
      p.age += dt / Math.max(p.lifetime, 0.05);
      p.intensity -= decay * dt * 0.4;
      if (p.age >= 1.0 || p.intensity <= 0) pulses.splice(i, 1);
    }

    // ---- Push uniforms ----
    const count = Math.min(pulses.length, MAX_PULSES);
    const posArr = material.uniforms.uPulsePos.value as THREE.Vector3[];
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

    material.uniforms.uTime.value += dt;
    material.uniforms.uPointer.value.copy(sharedRef.current.pointer.world);
    material.uniforms.uPointerStrength.value = sharedRef.current.pointer.strength;

    // ---- Rotation ----
    if (!reduceMotion && meshRef.current) {
      const speedBoost = 1.0 + b.level * 1.4;
      meshRef.current.rotation.y += dt * controls.rotationSpeed * speedBoost;
      meshRef.current.rotation.x =
        Math.sin(material.uniforms.uTime.value * 0.3) * 0.06;
    }
  });

  return (
    <>
      <PointerTracker sharedRef={sharedRef} meshRef={meshRef} />
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Apex — exported component
// ---------------------------------------------------------------------------
function Apex({ width, height }: ProjectComponentProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const audio = useAudioController();
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audio.setGain(controls.audioGain);
  }, [audio, controls.audioGain]);

  useEffect(() => {
    audio.setSmoothing(controls.smoothing);
  }, [audio, controls.smoothing]);

  // Update meter bars each RAF tick (DOM-side, outside the R3F loop).
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
        camera={{ position: [0, 0.6, DEFAULTS.zoom], fov: 35 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      >
        <CameraRig zoom={controls.zoom} />
        {controls.mode === 'mirage' ? (
          <MirageScene
            bandsRef={audio.bands}
            controls={controls}
            reduceMotion={reduceMotion}
          />
        ) : (
          <BleedScene
            bandsRef={audio.bands}
            controls={controls}
            reduceMotion={reduceMotion}
          />
        )}
        <EffectComposer>
          <Bloom
            intensity={controls.bloomIntensity}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.6}
            mipmapBlur
            radius={0.7}
          />
        </EffectComposer>
      </Canvas>

      <aside className={styles.panel} aria-label="Apex controls">
        <h3 className={styles.panelTitle}>Apex · Inverted Pyramid</h3>
        <p className={styles.subtitle}>
          {controls.mode === 'mirage'
            ? 'A luminescent iridescent mirage. The pyramid surfaces from the dark on every beat, then fades back into haze.'
            : 'Voronoi-style pointer + audio-pulse spotlights bleed iridescent light across the pyramid surface.'}
        </p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Mode</p>
          <div className={styles.audioGrid}>
            <button
              type="button"
              className={`${styles.button} ${controls.mode === 'mirage' ? styles.buttonActive : ''}`}
              onClick={() => setControls((c) => ({ ...c, mode: 'mirage' }))}
            >
              Mirage
            </button>
            <button
              type="button"
              className={`${styles.button} ${controls.mode === 'bleed' ? styles.buttonActive : ''}`}
              onClick={() => setControls((c) => ({ ...c, mode: 'bleed' }))}
            >
              Bleed Lights
            </button>
          </div>
        </section>

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
          <p className={styles.sectionTitle}>Audio</p>
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
            max={2.5}
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
          <p className={styles.sectionTitle}>Visuals</p>
          <Slider
            label="Zoom"
            min={3}
            max={30}
            step={0.1}
            value={controls.zoom}
            onChange={(v) => setControls((c) => ({ ...c, zoom: v }))}
            format={(v) => v.toFixed(1)}
          />
          <Slider
            label="Rotation Speed"
            min={0}
            max={1.0}
            step={0.01}
            value={controls.rotationSpeed}
            onChange={(v) => setControls((c) => ({ ...c, rotationSpeed: v }))}
          />
          {controls.mode === 'mirage' && (
            <>
              <Slider
                label="Fade Decay"
                min={0.3}
                max={4.0}
                step={0.05}
                value={controls.fadeDecay}
                onChange={(v) => setControls((c) => ({ ...c, fadeDecay: v }))}
              />
              <Slider
                label="Mirage Floor"
                min={0}
                max={0.4}
                step={0.01}
                value={controls.mirageFloor}
                onChange={(v) => setControls((c) => ({ ...c, mirageFloor: v }))}
              />
            </>
          )}
          {controls.mode === 'bleed' && (
            <>
              <div className={styles.row}>
                <span className={styles.label}>Effect</span>
              </div>
              <div className={styles.audioGrid}>
                {BLEED_EFFECTS.map((eff) => (
                  <button
                    key={eff.id}
                    type="button"
                    className={`${styles.button} ${controls.bleedEffect === eff.id ? styles.buttonActive : ''}`}
                    onClick={() => setControls((c) => ({ ...c, bleedEffect: eff.id }))}
                  >
                    {eff.label}
                  </button>
                ))}
              </div>
              <Slider
                label="Pulse Radius"
                min={0.5}
                max={6.0}
                step={0.05}
                value={controls.pulseRadius}
                onChange={(v) => setControls((c) => ({ ...c, pulseRadius: v }))}
              />
              <Slider
                label="Pulse Decay"
                min={0.2}
                max={4.0}
                step={0.05}
                value={controls.pulseDecay}
                onChange={(v) => setControls((c) => ({ ...c, pulseDecay: v }))}
              />
              <Slider
                label="Pointer Radius"
                min={0.3}
                max={4.0}
                step={0.05}
                value={controls.pointerRadius}
                onChange={(v) => setControls((c) => ({ ...c, pointerRadius: v }))}
              />
            </>
          )}
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

export default Apex;
