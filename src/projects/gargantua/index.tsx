import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { Slider } from '../../lib/controls';
import styles from './Gargantua.module.css';
import diskVert from './shaders/disk.vert.glsl?raw';
import diskFrag from './shaders/disk.frag.glsl?raw';
import lensingVert from './shaders/lensing.vert.glsl?raw';
import lensingFrag from './shaders/lensing.frag.glsl?raw';
import starsVert from './shaders/stars.vert.glsl?raw';
import starsFrag from './shaders/stars.frag.glsl?raw';

// ============================================================
// Types & Defaults
// ============================================================

interface Controls {
  // Event horizon
  eventHorizonRadius: number;
  // Accretion disk
  diskInnerRadius: number;
  diskOuterRadius: number;
  diskBrightness: number;
  diskOpacity: number;
  diskRotationSpeed: number;
  diskColorTemperature: number;
  diskTilt: number; // degrees
  turbulenceStrength: number;
  // Lensing halo
  lensingStrength: number;
  lensingRadius: number;
  lensingOpacity: number;
  lensingGlowIntensity: number;
  // Bloom
  bloomIntensity: number;
  bloomRadius: number;
  bloomThreshold: number;
  // Stars
  starCount: number;
  starBrightness: number;
  starFieldRadius: number;
  // Animation / camera
  animationSpeed: number;
  cameraDistance: number;
  autoRotate: boolean;
}

const DEFAULTS: Controls = {
  eventHorizonRadius: 1.0,
  diskInnerRadius: 1.35,
  diskOuterRadius: 3.6,
  diskBrightness: 1.4,
  diskOpacity: 0.92,
  diskRotationSpeed: 0.28,
  diskColorTemperature: 0.65,
  diskTilt: 22,
  turbulenceStrength: 0.72,
  lensingStrength: 0.75,
  lensingRadius: 1.55,
  lensingOpacity: 0.58,
  lensingGlowIntensity: 0.85,
  bloomIntensity: 1.6,
  bloomRadius: 0.75,
  bloomThreshold: 0.08,
  starCount: 4000,
  starBrightness: 0.82,
  starFieldRadius: 90,
  animationSpeed: 1.0,
  cameraDistance: 9,
  autoRotate: false,
};

// ============================================================
// Helpers
// ============================================================

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

/** Build a BufferGeometry for the star field. */
function createStarfieldGeometry(count: number, fieldRadius: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Uniform distribution on a sphere surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = fieldRadius * (0.85 + 0.15 * Math.random());
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    seeds[i] = Math.random();
    sizes[i] = 0.7 + Math.random() * 2.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds,     1));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1));
  return geo;
}

// ============================================================
// Event Horizon — perfectly black sphere
// ============================================================

interface BlackHoleProps { controls: Controls }

function BlackHole({ controls }: BlackHoleProps) {
  const { eventHorizonRadius } = controls;

  const geometry = useMemo(
    () => new THREE.SphereGeometry(eventHorizonRadius, 64, 40),
    [eventHorizonRadius],
  );

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x000000 }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} renderOrder={1} />;
}

// ============================================================
// Accretion Disk — ring geometry with hot-band shader
// ============================================================

interface AccretionDiskProps { controls: Controls; reduceMotion: boolean }

function AccretionDisk({ controls, reduceMotion }: AccretionDiskProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const timeRef  = useRef(0);

  const {
    diskInnerRadius, diskOuterRadius, diskBrightness, diskOpacity,
    diskColorTemperature, turbulenceStrength, diskTilt,
    diskRotationSpeed, animationSpeed, eventHorizonRadius,
  } = controls;

  // Rebuild ring geometry when radii change
  const mainGeo = useMemo(
    () => new THREE.RingGeometry(diskInnerRadius, diskOuterRadius, 128, 8),
    [diskInnerRadius, diskOuterRadius],
  );

  // Narrower secondary arc — represents the far side of the disk lensed above
  const topGeo = useMemo(
    () => new THREE.RingGeometry(
      diskInnerRadius,
      diskInnerRadius + (diskOuterRadius - diskInnerRadius) * 0.45,
      128, 4,
    ),
    [diskInnerRadius, diskOuterRadius],
  );

  // Photon ring — thin bright torus hugging the event horizon
  const photonGeo = useMemo(
    () => new THREE.TorusGeometry(eventHorizonRadius * 1.18, eventHorizonRadius * 0.028, 32, 128),
    [eventHorizonRadius],
  );

  // Shared disk ShaderMaterial
  const diskMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: diskVert,
        fragmentShader: diskFrag,
        uniforms: {
          uTime:               { value: 0 },
          uInnerRadius:        { value: diskInnerRadius },
          uOuterRadius:        { value: diskOuterRadius },
          uBrightness:         { value: diskBrightness },
          uOpacity:            { value: diskOpacity },
          uColorTemperature:   { value: diskColorTemperature },
          uTurbulenceStrength: { value: turbulenceStrength },
        },
        transparent:   true,
        depthWrite:    false,
        blending:      THREE.AdditiveBlending,
        side:          THREE.DoubleSide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Separate material for the top arc (dimmer, slightly cooler)
  const topMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: diskVert,
        fragmentShader: diskFrag,
        uniforms: {
          uTime:               { value: 0 },
          uInnerRadius:        { value: diskInnerRadius },
          uOuterRadius:        { value: diskInnerRadius + (diskOuterRadius - diskInnerRadius) * 0.45 },
          uBrightness:         { value: diskBrightness * 0.6 },
          uOpacity:            { value: diskOpacity * 0.5 },
          uColorTemperature:   { value: diskColorTemperature * 0.85 },
          uTurbulenceStrength: { value: turbulenceStrength * 0.8 },
        },
        transparent:   true,
        depthWrite:    false,
        blending:      THREE.AdditiveBlending,
        side:          THREE.DoubleSide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Photon ring material — constant warm glow, no shader needed
  const photonMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color:       new THREE.Color(1.0, 0.75, 0.25),
        transparent: true,
        opacity:     0.85,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      }),
    [],
  );

  // Sync uniform values when controls change
  useEffect(() => {
    diskMat.uniforms.uInnerRadius.value        = diskInnerRadius;
    diskMat.uniforms.uOuterRadius.value        = diskOuterRadius;
    diskMat.uniforms.uBrightness.value         = diskBrightness;
    diskMat.uniforms.uOpacity.value            = diskOpacity;
    diskMat.uniforms.uColorTemperature.value   = diskColorTemperature;
    diskMat.uniforms.uTurbulenceStrength.value = turbulenceStrength;

    const topOuter = diskInnerRadius + (diskOuterRadius - diskInnerRadius) * 0.45;
    topMat.uniforms.uInnerRadius.value        = diskInnerRadius;
    topMat.uniforms.uOuterRadius.value        = topOuter;
    topMat.uniforms.uBrightness.value         = diskBrightness * 0.6;
    topMat.uniforms.uOpacity.value            = diskOpacity * 0.5;
    topMat.uniforms.uColorTemperature.value   = diskColorTemperature * 0.85;
    topMat.uniforms.uTurbulenceStrength.value = turbulenceStrength * 0.8;
  }, [diskMat, topMat, diskInnerRadius, diskOuterRadius, diskBrightness, diskOpacity, diskColorTemperature, turbulenceStrength]);

  // Cleanup
  useEffect(() => () => { mainGeo.dispose(); topGeo.dispose(); photonGeo.dispose(); }, [mainGeo, topGeo, photonGeo]);
  useEffect(() => () => { diskMat.dispose(); topMat.dispose(); photonMat.dispose(); }, [diskMat, topMat, photonMat]);

  useFrame((_, delta) => {
    if (reduceMotion) return;
    const dt = delta * animationSpeed;
    timeRef.current += dt;
    if (groupRef.current) {
      groupRef.current.rotation.y += diskRotationSpeed * dt;
    }
    diskMat.uniforms.uTime.value = timeRef.current;
    topMat.uniforms.uTime.value  = timeRef.current;
  });

  const tiltRad = (diskTilt * Math.PI) / 180;

  return (
    // The group holds tilt (X axis); rotation.y is animated per-frame
    <group ref={groupRef} rotation={[tiltRad, 0, 0]}>
      {/* Main accretion disk */}
      <mesh geometry={mainGeo} material={diskMat} renderOrder={2} />

      {/* Top arc — disk far side lensed above the event horizon.
          Tilted ~75° further than the main disk so it arcs over the top. */}
      <mesh
        geometry={topGeo}
        material={topMat}
        rotation={[Math.PI * 0.42, 0.15, 0]}
        renderOrder={2}
      />

      {/* Photon ring — thin torus at ~1.18× event-horizon radius */}
      <mesh geometry={photonGeo} material={photonMat} renderOrder={3} />
    </group>
  );
}

// ============================================================
// Lensing Halo — transparent sphere with Fresnel rim glow
// ============================================================

interface LensingHaloProps { controls: Controls }

function LensingHalo({ controls }: LensingHaloProps) {
  const { eventHorizonRadius, lensingRadius, lensingStrength, lensingOpacity, lensingGlowIntensity } = controls;

  const radius = eventHorizonRadius * lensingRadius;

  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, 64, 40),
    [radius],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader:  lensingVert,
        fragmentShader: lensingFrag,
        uniforms: {
          uStrength:      { value: lensingStrength },
          uOpacity:       { value: lensingOpacity },
          uGlowIntensity: { value: lensingGlowIntensity },
        },
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        side:        THREE.FrontSide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uStrength.value      = lensingStrength;
    material.uniforms.uOpacity.value       = lensingOpacity;
    material.uniforms.uGlowIntensity.value = lensingGlowIntensity;
  }, [material, lensingStrength, lensingOpacity, lensingGlowIntensity]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} renderOrder={4} />;
}

// ============================================================
// Starfield — procedural point cloud
// ============================================================

interface StarfieldProps { controls: Controls; reduceMotion: boolean }

function Starfield({ controls, reduceMotion }: StarfieldProps) {
  const { starCount, starBrightness, starFieldRadius, animationSpeed } = controls;
  const timeRef = useRef(0);

  const geometry = useMemo(
    () => createStarfieldGeometry(starCount, starFieldRadius),
    [starCount, starFieldRadius],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader:   starsVert,
        fragmentShader: starsFrag,
        uniforms: {
          uTime:       { value: 0 },
          uBrightness: { value: starBrightness },
        },
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uBrightness.value = starBrightness;
  }, [material, starBrightness]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (reduceMotion) return;
    timeRef.current += delta * animationSpeed * 0.4;
    material.uniforms.uTime.value = timeRef.current;
  });

  return <points geometry={geometry} material={material} />;
}

// ============================================================
// Camera Rig — OrbitControls + smooth distance tracking
// ============================================================

interface CameraRigProps {
  cameraDistance: number;
  autoRotate: boolean;
}

function CameraRig({ cameraDistance, autoRotate }: CameraRigProps) {
  const { camera } = useThree();
  const targetDist = useRef(cameraDistance);

  useEffect(() => {
    targetDist.current = cameraDistance;
  }, [cameraDistance]);

  useFrame((_, delta) => {
    // Smoothly interpolate camera distance without fighting OrbitControls
    const current = camera.position.length();
    if (Math.abs(current - targetDist.current) > 0.01) {
      const next = current + (targetDist.current - current) * Math.min(delta * 2.5, 1);
      camera.position.setLength(next);
    }
  });

  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.06}
      minDistance={2.5}
      maxDistance={60}
      autoRotate={autoRotate}
      autoRotateSpeed={0.35}
    />
  );
}

// ============================================================
// Scene — all 3-D objects inside the Canvas
// ============================================================

interface SceneProps { controls: Controls; reduceMotion: boolean }

function Scene({ controls, reduceMotion }: SceneProps) {
  const { scene } = useThree();

  // Pure black background; the starfield and bloom provide the backdrop
  useEffect(() => {
    scene.background = new THREE.Color(0x000000);
  }, [scene]);

  return (
    <>
      <BlackHole    controls={controls} />
      <AccretionDisk controls={controls} reduceMotion={reduceMotion} />
      <LensingHalo  controls={controls} />
      <Starfield    controls={controls} reduceMotion={reduceMotion} />
      <CameraRig
        cameraDistance={controls.cameraDistance}
        autoRotate={controls.autoRotate}
      />
    </>
  );
}

// ============================================================
// Control Panel
// ============================================================

interface PanelProps {
  controls: Controls;
  setControls: React.Dispatch<React.SetStateAction<Controls>>;
}

function ControlPanel({ controls, setControls }: PanelProps) {
  const set = (key: keyof Controls) => (v: number) =>
    setControls((c) => ({ ...c, [key]: v }));

  return (
    <aside className={styles.panel} aria-label="Gargantua controls">
      <h3 className={styles.panelTitle}>Gargantua · Black Hole</h3>
      <p className={styles.subtitle}>Cinematic black hole · adjust parameters below</p>

      {/* ---- Black Hole ---- */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Event Horizon</p>
        <Slider label="Radius"  min={0.4} max={2.0} step={0.05} value={controls.eventHorizonRadius} onChange={set('eventHorizonRadius')} />
        <Slider label="Lensing ϕ" min={1.0} max={2.5} step={0.05} value={controls.lensingRadius}    onChange={set('lensingRadius')} />
      </section>

      {/* ---- Accretion Disk ---- */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Accretion Disk</p>
        <Slider label="Inner Radius"    min={1.05} max={2.5}  step={0.05} value={controls.diskInnerRadius}      onChange={set('diskInnerRadius')} />
        <Slider label="Outer Radius"    min={2.0}  max={7.0}  step={0.1}  value={controls.diskOuterRadius}      onChange={set('diskOuterRadius')} />
        <Slider label="Brightness"      min={0.2}  max={3.0}  step={0.05} value={controls.diskBrightness}       onChange={set('diskBrightness')} />
        <Slider label="Opacity"         min={0.1}  max={1.0}  step={0.05} value={controls.diskOpacity}          onChange={set('diskOpacity')} />
        <Slider label="Rotation Speed"  min={0.0}  max={1.5}  step={0.02} value={controls.diskRotationSpeed}    onChange={set('diskRotationSpeed')} />
        <Slider label="Color Temp"      min={0.0}  max={1.0}  step={0.05} value={controls.diskColorTemperature} onChange={set('diskColorTemperature')} format={(v) => v.toFixed(2)} />
        <Slider label="Disk Tilt (°)"   min={0}    max={60}   step={1}    value={controls.diskTilt}             onChange={set('diskTilt')}    format={(v) => `${v}°`} />
        <Slider label="Turbulence"      min={0.0}  max={2.0}  step={0.05} value={controls.turbulenceStrength}   onChange={set('turbulenceStrength')} />
      </section>

      {/* ---- Lensing ---- */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Gravitational Lensing</p>
        <Slider label="Strength"   min={0.0} max={1.5} step={0.05} value={controls.lensingStrength}      onChange={set('lensingStrength')} />
        <Slider label="Opacity"    min={0.0} max={1.0} step={0.05} value={controls.lensingOpacity}       onChange={set('lensingOpacity')} />
        <Slider label="Glow"       min={0.0} max={2.0} step={0.05} value={controls.lensingGlowIntensity} onChange={set('lensingGlowIntensity')} />
      </section>

      {/* ---- Bloom ---- */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Bloom</p>
        <Slider label="Intensity"  min={0.0} max={5.0} step={0.1}  value={controls.bloomIntensity}  onChange={set('bloomIntensity')} />
        <Slider label="Radius"     min={0.1} max={1.5} step={0.05} value={controls.bloomRadius}     onChange={set('bloomRadius')} />
        <Slider label="Threshold"  min={0.0} max={1.0} step={0.02} value={controls.bloomThreshold}  onChange={set('bloomThreshold')} />
      </section>

      {/* ---- Stars ---- */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Starfield</p>
        <Slider label="Star Count"       min={500}  max={10000} step={100}  value={controls.starCount}       onChange={set('starCount')}       format={(v) => v.toFixed(0)} />
        <Slider label="Brightness"       min={0.1}  max={2.0}   step={0.05} value={controls.starBrightness}  onChange={set('starBrightness')} />
        <Slider label="Field Radius"     min={30}   max={200}   step={5}    value={controls.starFieldRadius}  onChange={set('starFieldRadius')} format={(v) => v.toFixed(0)} />
      </section>

      {/* ---- Animation ---- */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Animation &amp; Camera</p>
        <Slider label="Anim Speed"   min={0.0} max={3.0} step={0.05} value={controls.animationSpeed}  onChange={set('animationSpeed')} />
        <Slider label="Camera Dist"  min={3.0} max={40}  step={0.5}  value={controls.cameraDistance}  onChange={set('cameraDistance')} />
        <div className={styles.toggleRow}>
          <span className={styles.label}>Auto-Rotate</span>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={controls.autoRotate}
            onChange={(e) => setControls((c) => ({ ...c, autoRotate: e.target.checked }))}
            aria-label="Toggle camera auto-rotation"
          />
        </div>
      </section>
    </aside>
  );
}

// ============================================================
// Root export — wires up Canvas, post-processing, and the panel
// ============================================================

export default function Gargantua({ width, height }: ProjectComponentProps) {
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const reduceMotion = usePrefersReducedMotion();

  // Cinematic initial camera position: slightly above and to the side
  const initialPos: [number, number, number] = [3.5, 2.8, DEFAULTS.cameraDistance];

  return (
    <div className={styles.root} style={{ width, height }}>
      <Canvas
        className={styles.canvasHost}
        camera={{ position: initialPos, fov: 48, near: 0.1, far: 500 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      >
        <Scene controls={controls} reduceMotion={reduceMotion} />
        <EffectComposer>
          <Bloom
            intensity={controls.bloomIntensity}
            radius={controls.bloomRadius}
            luminanceThreshold={controls.bloomThreshold}
            luminanceSmoothing={0.55}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <ControlPanel controls={controls} setControls={setControls} />
    </div>
  );
}
