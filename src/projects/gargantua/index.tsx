import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { Slider, CollapsiblePanel } from '../../lib/controls';
import styles from './Gargantua.module.css';
import bhVert from './shaders/blackhole.vert.glsl?raw';
import bhFrag from './shaders/blackhole.frag.glsl?raw';

// ============================================================
// Types & Defaults
// ============================================================

interface Controls {
  // Black hole
  mass: number;             // event horizon radius (Rs)
  lensStrength: number;     // gravitational pull multiplier
  photonIntensity: number;  // photon-ring brightness
  // Disk
  diskInner: number;
  diskOuter: number;
  diskBrightness: number;
  diskOpacity: number;
  diskRotationSpeed: number;
  diskTemp: number;
  diskTilt: number;          // degrees
  turbulence: number;
  dopplerStrength: number;
  // Stars
  starBrightness: number;
  starDensity: number;
  // Bloom
  bloomIntensity: number;
  bloomRadius: number;
  bloomThreshold: number;
  // Camera / animation
  cameraDistance: number;
  animationSpeed: number;
  autoRotate: boolean;
  // Performance
  rayMarchSteps: number;
}

const DEFAULTS: Controls = {
  mass: 1.0,
  lensStrength: 1.0,
  photonIntensity: 1.0,
  diskInner: 1.6,
  diskOuter: 6.0,
  diskBrightness: 1.5,
  diskOpacity: 0.95,
  diskRotationSpeed: 0.45,
  diskTemp: 0.65,
  diskTilt: 18,
  turbulence: 0.85,
  dopplerStrength: 0.55,
  starBrightness: 0.95,
  starDensity: 0.55,
  bloomIntensity: 1.4,
  bloomRadius: 0.75,
  bloomThreshold: 0.1,
  cameraDistance: 14,
  animationSpeed: 1.0,
  autoRotate: false,
  rayMarchSteps: 90,
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

// ============================================================
// Black Hole Quad — full-screen raymarched mesh
// ============================================================

interface QuadProps {
  controls: Controls;
  width: number;
  height: number;
  reduceMotion: boolean;
}

function BlackHoleQuad({ controls, width, height, reduceMotion }: QuadProps) {
  const { camera } = useThree();
  const meshRef    = useRef<THREE.Mesh>(null!);
  const timeRef    = useRef(0);

  // 2x2 plane in NDC; the vertex shader emits gl_Position directly.
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader:   bhVert,
      fragmentShader: bhFrag,
      depthTest:      false,
      depthWrite:     false,
      uniforms: {
        // Camera
        uCamPos:        { value: new THREE.Vector3() },
        uCamBasis:      { value: new THREE.Matrix3() },
        uTanHalfFov:    { value: 0.5 },
        uAspect:        { value: 1.0 },
        uTime:          { value: 0 },
        // BH
        uMass:            { value: DEFAULTS.mass },
        uLensStrength:    { value: DEFAULTS.lensStrength },
        uPhotonIntensity: { value: DEFAULTS.photonIntensity },
        // Disk
        uDiskInner:       { value: DEFAULTS.diskInner },
        uDiskOuter:       { value: DEFAULTS.diskOuter },
        uDiskBrightness:  { value: DEFAULTS.diskBrightness },
        uDiskOpacity:     { value: DEFAULTS.diskOpacity },
        uDiskTemp:        { value: DEFAULTS.diskTemp },
        uDiskSpin:        { value: DEFAULTS.diskRotationSpeed },
        uTurbulence:      { value: DEFAULTS.turbulence },
        uDiskTilt:        { value: (DEFAULTS.diskTilt * Math.PI) / 180 },
        uDopplerStrength: { value: DEFAULTS.dopplerStrength },
        // Stars
        uStarBrightness:  { value: DEFAULTS.starBrightness },
        uStarDensity:     { value: DEFAULTS.starDensity },
        // Steps
        uSteps:           { value: DEFAULTS.rayMarchSteps },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push slider values into uniforms whenever controls change
  useEffect(() => {
    const u = material.uniforms;
    u.uMass.value            = controls.mass;
    u.uLensStrength.value    = controls.lensStrength;
    u.uPhotonIntensity.value = controls.photonIntensity;
    u.uDiskInner.value       = controls.diskInner;
    u.uDiskOuter.value       = Math.max(controls.diskOuter, controls.diskInner + 0.1);
    u.uDiskBrightness.value  = controls.diskBrightness;
    u.uDiskOpacity.value     = controls.diskOpacity;
    u.uDiskTemp.value        = controls.diskTemp;
    u.uDiskSpin.value        = controls.diskRotationSpeed;
    u.uTurbulence.value      = controls.turbulence;
    u.uDiskTilt.value        = (controls.diskTilt * Math.PI) / 180;
    u.uDopplerStrength.value = controls.dopplerStrength;
    u.uStarBrightness.value  = controls.starBrightness;
    u.uStarDensity.value     = controls.starDensity;
    u.uSteps.value           = Math.round(controls.rayMarchSteps);
  }, [material, controls]);

  // Cleanup
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // Per-frame: sync camera + time uniforms
  useFrame((_, delta) => {
    const u = material.uniforms;

    if (!reduceMotion) {
      timeRef.current += delta * controls.animationSpeed;
    }
    u.uTime.value = timeRef.current;

    // Camera position
    u.uCamPos.value.copy(camera.position);

    // 3x3 rotation basis from the camera's world matrix (upper-left of mat4).
    // Three.Matrix3 is row-major when using set(), and the same row indices
    // (0,4,8 / 1,5,9 / 2,6,10) give us the right/up/-forward columns.
    const m = camera.matrixWorld.elements;
    (u.uCamBasis.value as THREE.Matrix3).set(
      m[0], m[4], m[8],
      m[1], m[5], m[9],
      m[2], m[6], m[10],
    );

    // FOV / aspect — width and height are already CSS pixels
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    u.uTanHalfFov.value = Math.tan(fovRad / 2);
    u.uAspect.value     = width / Math.max(height, 1);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
  );
}

// ============================================================
// Camera Rig — drives camera distance and OrbitControls
// ============================================================

// The shader also applies `diskTilt`, so the camera starts slightly higher than
// a normal edge-on view to land at a cinematic angle after that transform.
const CAMERA_INITIAL_Y = -4;

interface CameraRigProps {
  cameraDistance: number;
  autoRotate: boolean;
}

function CameraRig({ cameraDistance, autoRotate }: CameraRigProps) {
  const { camera } = useThree();
  const target     = useRef(cameraDistance);

  // Explicitly set the camera position on mount so it survives HMR and
  // OrbitControls initialisation races.
  useEffect(() => {
    camera.position.set(0, CAMERA_INITIAL_Y, cameraDistance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { target.current = cameraDistance; }, [cameraDistance]);

  useFrame((_, delta) => {
    const cur = camera.position.length();
    if (Math.abs(cur - target.current) > 0.01) {
      const next = cur + (target.current - cur) * Math.min(delta * 2.5, 1);
      camera.position.setLength(next);
    }
  });

  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.06}
      minDistance={3.5}
      maxDistance={70}
      autoRotate={autoRotate}
      autoRotateSpeed={0.35}
      enablePan={false}
    />
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
    <CollapsiblePanel className={styles.panel} ariaLabel="Gargantua controls">
      <h3 className={styles.panelTitle}>Gargantua · Black Hole</h3>
      <p className={styles.subtitle}>Raymarched · drag to orbit · zoom with wheel</p>

      <section className={styles.section}>
        <p className={styles.sectionTitle}>Black Hole</p>
        <Slider label="Mass (Rs)"        min={0.4} max={2.5} step={0.05} value={controls.mass}            onChange={set('mass')} />
        <Slider label="Lensing Strength" min={0.0} max={2.0} step={0.05} value={controls.lensStrength}    onChange={set('lensStrength')} />
        <Slider label="Photon Ring"      min={0.0} max={3.0} step={0.05} value={controls.photonIntensity} onChange={set('photonIntensity')} />
      </section>

      <section className={styles.section}>
        <p className={styles.sectionTitle}>Accretion Disk</p>
        <Slider label="Inner Radius"   min={1.05} max={3.5}  step={0.05} value={controls.diskInner}         onChange={set('diskInner')} />
        <Slider label="Outer Radius"   min={2.0}  max={12.0} step={0.1}  value={controls.diskOuter}         onChange={set('diskOuter')} />
        <Slider label="Brightness"     min={0.2}  max={4.0}  step={0.05} value={controls.diskBrightness}    onChange={set('diskBrightness')} />
        <Slider label="Opacity"        min={0.1}  max={1.0}  step={0.05} value={controls.diskOpacity}       onChange={set('diskOpacity')} />
        <Slider label="Rotation Speed" min={0.0}  max={2.5}  step={0.05} value={controls.diskRotationSpeed} onChange={set('diskRotationSpeed')} />
        <Slider label="Color Temp"     min={0.0}  max={1.0}  step={0.02} value={controls.diskTemp}          onChange={set('diskTemp')}      format={(v) => v.toFixed(2)} />
        <Slider label="Tilt (°)"       min={0}    max={75}   step={1}    value={controls.diskTilt}          onChange={set('diskTilt')}      format={(v) => `${v}°`} />
        <Slider label="Turbulence"     min={0.0}  max={2.0}  step={0.05} value={controls.turbulence}        onChange={set('turbulence')} />
        <Slider label="Doppler"        min={0.0}  max={1.5}  step={0.05} value={controls.dopplerStrength}   onChange={set('dopplerStrength')} />
      </section>

      <section className={styles.section}>
        <p className={styles.sectionTitle}>Stars</p>
        <Slider label="Brightness" min={0.0} max={2.5} step={0.05} value={controls.starBrightness} onChange={set('starBrightness')} />
        <Slider label="Density"    min={0.0} max={1.5} step={0.05} value={controls.starDensity}    onChange={set('starDensity')} />
      </section>

      <section className={styles.section}>
        <p className={styles.sectionTitle}>Bloom</p>
        <Slider label="Intensity" min={0.0} max={5.0} step={0.1}  value={controls.bloomIntensity} onChange={set('bloomIntensity')} />
        <Slider label="Radius"    min={0.1} max={1.5} step={0.05} value={controls.bloomRadius}    onChange={set('bloomRadius')} />
        <Slider label="Threshold" min={0.0} max={1.0} step={0.02} value={controls.bloomThreshold} onChange={set('bloomThreshold')} />
      </section>

      <section className={styles.section}>
        <p className={styles.sectionTitle}>Camera &amp; Animation</p>
        <Slider label="Distance"     min={4.0} max={60}  step={0.5}  value={controls.cameraDistance} onChange={set('cameraDistance')} />
        <Slider label="Anim Speed"   min={0.0} max={3.0} step={0.05} value={controls.animationSpeed} onChange={set('animationSpeed')} />
        <Slider label="Ray Steps"    min={40}  max={150} step={5}    value={controls.rayMarchSteps}  onChange={set('rayMarchSteps')}  format={(v) => v.toFixed(0)} />
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
    </CollapsiblePanel>
  );
}

// ============================================================
// Root export
// ============================================================

export default function Gargantua({ width, height }: ProjectComponentProps) {
  // Lower default ray steps on small / low-DPR devices
  const initialControls = useMemo<Controls>(() => {
    if (typeof window === 'undefined') return DEFAULTS;
    const small = width < 640;
    return {
      ...DEFAULTS,
      rayMarchSteps: small ? 60 : DEFAULTS.rayMarchSteps,
      starDensity:   small ? 0.4 : DEFAULTS.starDensity,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [controls, setControls] = useState<Controls>(initialControls);
  const reduceMotion = usePrefersReducedMotion();

  // Cinematic initial camera position — slightly elevated for Interstellar-style disk view
  const initialPos: [number, number, number] = [0.0, CAMERA_INITIAL_Y, controls.cameraDistance];

  return (
    <div className={styles.root} style={{ width, height }}>
      <Canvas
        className={styles.canvasHost}
        camera={{ position: initialPos, fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      >
        <BlackHoleQuad controls={controls} width={width} height={height} reduceMotion={reduceMotion} />
        <CameraRig    cameraDistance={controls.cameraDistance} autoRotate={controls.autoRotate} />

        <EffectComposer>
          <Bloom
            intensity={controls.bloomIntensity}
            radius={controls.bloomRadius}
            luminanceThreshold={controls.bloomThreshold}
            luminanceSmoothing={0.6}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <ControlPanel controls={controls} setControls={setControls} />
    </div>
  );
}
