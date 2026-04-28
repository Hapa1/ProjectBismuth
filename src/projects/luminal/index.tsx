import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { useAudioAnalyser, type AudioBands } from '../../lib/useAudioAnalyser';
import styles from './Luminal.module.css';
import ringsVert from './shaders/floor-rings.vert.glsl?raw';
import ringsFrag from './shaders/floor-rings.frag.glsl?raw';

// ---------------------------------------------------------------------------
// Scene sub-components
// ---------------------------------------------------------------------------

interface SceneProps {
  bandsRef: React.MutableRefObject<AudioBands>;
  width: number;
}

function Scene({ bandsRef, width }: SceneProps) {
  return (
    <>
      <Lighting />
      <ForestBackground />
      <Columns />
      <ReflectiveFloor />
      <RingLayer bandsRef={bandsRef} />
      <CeilingBlobs bandsRef={bandsRef} />
      <RibbonBeams />
      <CameraRig width={width} />
      <OrbitControls
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3}
        maxDistance={16}
        enablePan={false}
        target={[0, 1.5, -2]}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------

function Lighting() {
  return (
    <>
      <ambientLight color="#ffe0c0" intensity={0.6} />
      <directionalLight
        color="#fff8e8"
        intensity={1.8}
        position={[-6, 8, -4]}
        castShadow={false}
      />
      <pointLight color="#ffddaa" intensity={0.8} position={[0, 0.5, 0]} />
      <rectAreaLight
        color="#fff6e6"
        intensity={2.0}
        width={12}
        height={4}
        position={[0, 3.6, -4]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Forest Background — static plane behind columns
// ---------------------------------------------------------------------------

function ForestBackground() {
  const texture = useMemo(() => {
    // Generate a procedural gradient texture as placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Sky gradient (top)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 200);
    skyGrad.addColorStop(0, '#87ceeb');
    skyGrad.addColorStop(1, '#c8e8f0');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 200);

    // Mountain layer
    const mtnGrad = ctx.createLinearGradient(0, 160, 0, 320);
    mtnGrad.addColorStop(0, '#6b8f71');
    mtnGrad.addColorStop(1, '#3a6b42');
    ctx.fillStyle = mtnGrad;
    ctx.beginPath();
    ctx.moveTo(0, 220);
    ctx.lineTo(200, 180);
    ctx.lineTo(400, 200);
    ctx.lineTo(600, 160);
    ctx.lineTo(800, 190);
    ctx.lineTo(1024, 170);
    ctx.lineTo(1024, 320);
    ctx.lineTo(0, 320);
    ctx.closePath();
    ctx.fill();

    // Forest layer (darker)
    const forestGrad = ctx.createLinearGradient(0, 250, 0, 512);
    forestGrad.addColorStop(0, '#2d5a3a');
    forestGrad.addColorStop(1, '#1a3d26');
    ctx.fillStyle = forestGrad;
    ctx.fillRect(0, 280, 1024, 232);

    // Add some tree-like shapes
    ctx.fillStyle = '#1f4a2e';
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * 1024;
      const h = 40 + Math.random() * 80;
      const w = 8 + Math.random() * 12;
      ctx.beginPath();
      ctx.moveTo(x, 300);
      ctx.lineTo(x + w / 2, 300 - h);
      ctx.lineTo(x + w, 300);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, 2, -10]} frustumCulled={false}>
      <planeGeometry args={[40, 20]} />
      <meshBasicMaterial
        map={texture}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Window columns
// ---------------------------------------------------------------------------

function Columns() {
  const positions = useMemo(() => {
    const cols: [number, number, number][] = [];
    for (let i = -3; i <= 3; i++) {
      cols.push([i * 3.5, 2, -6]);
    }
    return cols;
  }, []);

  return (
    <>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.2, 4, 0.2]} />
          <meshStandardMaterial color="#f2ede8" roughness={0.4} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reflective floor — drei MeshReflectorMaterial
// ---------------------------------------------------------------------------

function ReflectiveFloor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
      <planeGeometry args={[24, 24]} />
      <MeshReflectorMaterial
        color="#f5d0b8"
        blur={[512, 128]}
        mixBlur={0.7}
        mixStrength={0.8}
        roughness={0.05}
        resolution={1024}
        mirror={0.6}
        depthScale={0.8}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Audio-reactive ring layer (additive shader overlay)
// ---------------------------------------------------------------------------

interface RingLayerProps {
  bandsRef: React.MutableRefObject<AudioBands>;
}

function RingLayer({ bandsRef }: RingLayerProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringsVert,
        fragmentShader: ringsFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uLevel: { value: 0 },
          uRingColor: { value: new THREE.Color('#ffd37a') },
        },
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    const b = bandsRef.current;
    material.uniforms.uBass.value = b.bass;
    material.uniforms.uMid.value = b.mid;
    material.uniforms.uTreble.value = b.treble;
    material.uniforms.uLevel.value = b.level;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
      <planeGeometry args={[24, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Ceiling blobs (flattened spheres, audio-modulated emissive)
// ---------------------------------------------------------------------------

interface CeilingBlobsProps {
  bandsRef: React.MutableRefObject<AudioBands>;
}

function CeilingBlobs({ bandsRef }: CeilingBlobsProps) {
  const meshRefs = useRef<THREE.Mesh[]>([]);

  const blobData = useMemo(() => {
    const rng = mulberry32(0xfade);
    const blobs: { pos: [number, number, number]; scale: [number, number, number] }[] = [];
    for (let i = 0; i < 20; i++) {
      const x = (rng() - 0.5) * 18;
      const z = (rng() - 0.5) * 14 - 2;
      const r = 1.0 + rng() * 2.0;
      blobs.push({
        pos: [x, 3.8 + rng() * 0.4, z],
        scale: [r, r * 0.25, r],
      });
    }
    return blobs;
  }, []);

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 16), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffd7b0',
        emissive: '#ffe8c8',
        emissiveIntensity: 0.4,
        roughness: 0.9,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const bass = bandsRef.current.bass;
    material.emissiveIntensity = 0.4 + bass * 0.6;
  });

  return (
    <>
      {blobData.map((blob, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshRefs.current[i] = el;
          }}
          position={blob.pos}
          scale={blob.scale}
          geometry={geometry}
          material={material}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ribbon beams (TubeGeometry along spline curves)
// ---------------------------------------------------------------------------

function RibbonBeams() {
  const { geometries, material } = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#a04010',
      metalness: 0.3,
      roughness: 0.5,
    });

    const curves = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-10, 3.6, -6),
        new THREE.Vector3(-4, 3.9, -3),
        new THREE.Vector3(2, 3.5, -5),
        new THREE.Vector3(8, 3.8, -2),
        new THREE.Vector3(11, 3.7, -6),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-9, 3.8, -2),
        new THREE.Vector3(-3, 3.5, -5),
        new THREE.Vector3(3, 3.9, -1),
        new THREE.Vector3(9, 3.6, -4),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7, 3.7, -7),
        new THREE.Vector3(0, 4.0, -4),
        new THREE.Vector3(6, 3.6, -7),
        new THREE.Vector3(10, 3.9, -3),
      ]),
    ];

    const geos = curves.map(
      (curve) => new THREE.TubeGeometry(curve, 48, 0.12, 8, false),
    );

    return { geometries: geos, material: mat };
  }, []);

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose());
      material.dispose();
    },
    [geometries, material],
  );

  return (
    <>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo} material={material} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Camera rig — adjusts for viewport width
// ---------------------------------------------------------------------------

interface CameraRigProps {
  width: number;
}

function CameraRig({ width }: CameraRigProps) {
  const { camera } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const z = width < 480 ? 9 : 7;
      camera.position.set(0, 1.2, z);
      camera.lookAt(0, 1.5, -4);
      initialized.current = true;
    }
  }, [camera, width]);

  return null;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let v = state;
    v = Math.imul(v ^ (v >>> 15), v | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Slider control component
// ---------------------------------------------------------------------------

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  const id = `luminal-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <span className={styles.value}>
        {step >= 1 ? value.toFixed(0) : value.toFixed(2)}
      </span>
      <input
        id={id}
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
// Main exported component
// ---------------------------------------------------------------------------

interface Controls {
  audioGain: number;
  smoothing: number;
}

const DEFAULT_CONTROLS: Controls = {
  audioGain: 0.9,
  smoothing: 0.82,
};

function Luminal({ width, height }: ProjectComponentProps) {
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const audio = useAudioAnalyser();
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audio.setGain(controls.audioGain);
  }, [audio, controls.audioGain]);

  useEffect(() => {
    audio.setSmoothing(controls.smoothing);
  }, [audio, controls.smoothing]);

  // Update meter bars imperatively (no React re-render per frame)
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
      <div className={styles.canvasHost}>
        <Canvas
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          camera={{ fov: 55, position: [0, 1.2, 7], near: 0.1, far: 100 }}
        >
          <Scene bandsRef={audio.bands} width={width} />
        </Canvas>
      </div>

      <aside className={styles.panel} aria-label="Luminal controls">
        <h3 className={styles.panelTitle}>Luminal Pavilion</h3>
        <p className={styles.subtitle}>
          Audio-reactive reflective pavilion. Pick an audio source below.
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
                  window.alert(`Tab audio capture failed:\n\n${message}`);
                });
              }}
              title="Pick another tab (e.g. Spotify Web, YouTube) and tick 'Share tab audio'"
            >
              Tab Audio
            </button>
            <label className={`${styles.button} ${styles.fileLabel} ${audio.source === 'file' ? styles.buttonActive : ''}`}>
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
            onChange={(v) => setControls((p) => ({ ...p, audioGain: v }))}
          />
          <Slider
            label="Smoothing"
            min={0}
            max={0.96}
            step={0.01}
            value={controls.smoothing}
            onChange={(v) => setControls((p) => ({ ...p, smoothing: v }))}
          />
        </section>
      </aside>
    </div>
  );
}

export default Luminal;
