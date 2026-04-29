import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { CollapsiblePanel } from '../../lib/controls';
import styles from './Moonlight.module.css';
import crystalVert from './shaders/crystal.vert.glsl?raw';
import crystalFrag from './shaders/crystal.frag.glsl?raw';
import skyVert from './shaders/sky.vert.glsl?raw';
import skyFrag from './shaders/sky.frag.glsl?raw';

interface Controls {
  count: number;
  spread: number;
  baseHeight: number;
  heightVariance: number;
  reactivity: number;
  bandCount: number;
  paletteIndex: number;
  cameraDrift: number;
  fogDensity: number;
  moonHeight: number;
}

interface Palette {
  name: string;
  a: THREE.Color;
  b: THREE.Color;
  c: THREE.Color;
  fog: THREE.Color;
}

const PALETTES: Palette[] = [
  {
    name: 'midnight bloom',
    a: new THREE.Color('#3a1f6b'),
    b: new THREE.Color('#c84db0'),
    c: new THREE.Color('#ffd07b'),
    fog: new THREE.Color('#0a0820'),
  },
  {
    name: 'glacier',
    a: new THREE.Color('#0e2a4d'),
    b: new THREE.Color('#3ec0ff'),
    c: new THREE.Color('#e0f7ff'),
    fog: new THREE.Color('#04101f'),
  },
  {
    name: 'ember',
    a: new THREE.Color('#3b0a14'),
    b: new THREE.Color('#ff6b3d'),
    c: new THREE.Color('#ffe07a'),
    fog: new THREE.Color('#150607'),
  },
  {
    name: 'aurora',
    a: new THREE.Color('#0c2230'),
    b: new THREE.Color('#36e0a8'),
    c: new THREE.Color('#a86bff'),
    fog: new THREE.Color('#040c11'),
  },
];

const DEFAULT_CONTROLS: Controls = {
  count: 600,
  spread: 24,
  baseHeight: 0.4,
  heightVariance: 1.5,
  reactivity: 0.9,
  bandCount: 6,
  paletteIndex: 0,
  cameraDrift: 0.4,
  fogDensity: 0.05,
  moonHeight: 0.65,
};

interface SceneProps {
  controls: Controls;
}

function Scene({ controls }: SceneProps) {
  const { scene } = useThree();
  const palette = PALETTES[controls.paletteIndex] ?? PALETTES[0];

  // Fog (sky dome paints the background; only fog tint here)
  useEffect(() => {
    scene.fog = new THREE.FogExp2(palette.fog.getHex(), controls.fogDensity);
    scene.background = null;
    return () => {
      scene.fog = null;
    };
  }, [scene, palette, controls.fogDensity]);

  return (
    <>
      <Sky controls={controls} palette={palette} />
      <Crystals controls={controls} palette={palette} />
      <Ground palette={palette} />
      <Moon controls={controls} palette={palette} />
      <CameraRig drift={controls.cameraDrift} />
    </>
  );
}

interface SkyProps {
  controls: Controls;
  palette: Palette;
}

function Sky({ controls, palette }: SkyProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uLevel: { value: 0 },
          uReactivity: { value: controls.reactivity },
          uMoonY: { value: controls.moonHeight },
          uTintA: { value: palette.a.clone() },
          uTintB: { value: palette.b.clone() },
          uTintC: { value: palette.c.clone() },
          uFog: { value: palette.fog.clone() },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uReactivity.value = controls.reactivity;
    material.uniforms.uMoonY.value = controls.moonHeight;
    material.uniforms.uTintA.value.copy(palette.a);
    material.uniforms.uTintB.value.copy(palette.b);
    material.uniforms.uTintC.value.copy(palette.c);
    material.uniforms.uFog.value.copy(palette.fog);
  }, [material, controls.reactivity, controls.moonHeight, palette]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[120, 48, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface CrystalsProps {
  controls: Controls;
  palette: Palette;
}

// Threshold (relative to spread) at which crystals switch to the low-res LOD.
const LOD_FRACTION = 0.55;

function buildCrystalGeometry(highRes: boolean): THREE.BufferGeometry {
  const radius = 0.5;
  const sides = 6;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const baseRing: THREE.Vector3[] = [];
  const topRing: THREE.Vector3[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = (i / sides) * Math.PI * 2;
    baseRing.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    topRing.push(
      new THREE.Vector3(Math.cos(a) * radius * 0.35, 0.92, Math.sin(a) * radius * 0.35),
    );
  }
  const tip = new THREE.Vector3(0, 1.0, 0);

  if (highRes) {
    // Side faces (quad split into 2 triangles). CCW from outside:
    // b0 -> t0 -> t1 -> b1
    for (let i = 0; i < sides; i += 1) {
      const j = (i + 1) % sides;
      const b0 = baseRing[i];
      const b1 = baseRing[j];
      const t0 = topRing[i];
      const t1 = topRing[j];

      const n = new THREE.Vector3()
        .copy(t0).sub(b0)
        .cross(new THREE.Vector3().copy(t1).sub(b0))
        .normalize();

      const start = positions.length / 3;
      [b0, t0, t1, b1].forEach((v) => {
        positions.push(v.x, v.y, v.z);
        normals.push(n.x, n.y, n.z);
      });
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }

    // Top pyramid faces (top ring -> tip), CCW from outside: t0 -> tip -> t1
    for (let i = 0; i < sides; i += 1) {
      const j = (i + 1) % sides;
      const t0 = topRing[i];
      const t1 = topRing[j];
      const n = new THREE.Vector3()
        .copy(tip).sub(t0)
        .cross(new THREE.Vector3().copy(t1).sub(t0))
        .normalize();
      const start = positions.length / 3;
      [t0, tip, t1].forEach((v) => {
        positions.push(v.x, v.y, v.z);
        normals.push(n.x, n.y, n.z);
      });
      indices.push(start, start + 1, start + 2);
    }
  } else {
    // Low-res: side faces go directly base -> tip (6 tris). CCW from outside:
    // b0 -> tip -> b1
    for (let i = 0; i < sides; i += 1) {
      const j = (i + 1) % sides;
      const b0 = baseRing[i];
      const b1 = baseRing[j];
      const n = new THREE.Vector3()
        .copy(tip).sub(b0)
        .cross(new THREE.Vector3().copy(b1).sub(b0))
        .normalize();
      const start = positions.length / 3;
      [b0, tip, b1].forEach((v) => {
        positions.push(v.x, v.y, v.z);
        normals.push(n.x, n.y, n.z);
      });
      indices.push(start, start + 1, start + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function Crystals({ controls, palette }: CrystalsProps) {
  const nearRef = useRef<THREE.InstancedMesh>(null!);
  const farRef = useRef<THREE.InstancedMesh>(null!);

  const geometryNear = useMemo(() => buildCrystalGeometry(true), []);
  const geometryFar = useMemo(() => buildCrystalGeometry(false), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: crystalVert,
      fragmentShader: crystalFrag,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uLevel: { value: 0 },
        uReactivity: { value: controls.reactivity },
        uBands: { value: controls.bandCount },
        uMoonY: { value: controls.moonHeight },
        uTintA: { value: palette.a.clone() },
        uTintB: { value: palette.b.clone() },
        uTintC: { value: palette.c.clone() },
      },
      transparent: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update palette/uniforms when controls change without recreating material
  useEffect(() => {
    material.uniforms.uReactivity.value = controls.reactivity;
    material.uniforms.uBands.value = controls.bandCount;
    material.uniforms.uMoonY.value = controls.moonHeight;
    material.uniforms.uTintA.value.copy(palette.a);
    material.uniforms.uTintB.value.copy(palette.b);
    material.uniforms.uTintC.value.copy(palette.c);
  }, [material, controls.reactivity, controls.bandCount, controls.moonHeight, palette]);

  // Per-instance attributes recomputed when count/spread/heights change.
  // Crystals are split into a "near" set (full-detail geometry) and a "far"
  // set (low-poly geometry) based on radial distance from the camera origin.
  useEffect(() => {
    const near = nearRef.current;
    const far = farRef.current;
    if (!near || !far) return;

    const count = controls.count;
    const lodRadius = controls.spread * LOD_FRACTION;

    interface Slot {
      matrix: THREE.Matrix4;
      height: number;
      hue: number;
      seed: number;
      band: number;
    }
    const nearSlots: Slot[] = [];
    const farSlots: Slot[] = [];

    const dummy = new THREE.Object3D();
    const rng = mulberry32(0xc0ffee);

    for (let i = 0; i < count; i += 1) {
      const r = Math.sqrt(rng()) * controls.spread;
      const theta = rng() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r * 0.65; // depth-flatten

      const scale = 0.5 + rng() * 1.4;
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(scale, 1, scale);
      dummy.updateMatrix();

      const slot: Slot = {
        matrix: dummy.matrix.clone(),
        height: controls.baseHeight + rng() * controls.heightVariance + r * 0.05,
        hue: rng(),
        seed: rng(),
        band: Math.floor(rng() * 3),
      };

      if (r < lodRadius) nearSlots.push(slot);
      else farSlots.push(slot);
    }

    const writeSlots = (mesh: THREE.InstancedMesh, slots: Slot[]) => {
      const n = slots.length;
      const aHeight = new Float32Array(n);
      const aHue = new Float32Array(n);
      const aSeed = new Float32Array(n);
      const aBand = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        const s = slots[i];
        mesh.setMatrixAt(i, s.matrix);
        aHeight[i] = s.height;
        aHue[i] = s.hue;
        aSeed[i] = s.seed;
        aBand[i] = s.band;
      }
      mesh.instanceMatrix.needsUpdate = true;
      const geo = mesh.geometry as THREE.InstancedBufferGeometry & THREE.BufferGeometry;
      geo.setAttribute('aHeight', new THREE.InstancedBufferAttribute(aHeight, 1));
      geo.setAttribute('aHue', new THREE.InstancedBufferAttribute(aHue, 1));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
      geo.setAttribute('aBand', new THREE.InstancedBufferAttribute(aBand, 1));
      mesh.count = n;
    };

    writeSlots(near, nearSlots);
    writeSlots(far, farSlots);
  }, [controls.count, controls.spread, controls.baseHeight, controls.heightVariance]);

  useEffect(() => {
    return () => {
      geometryNear.dispose();
      geometryFar.dispose();
      material.dispose();
    };
  }, [geometryNear, geometryFar, material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  return (
    <>
      <instancedMesh
        ref={nearRef}
        args={[geometryNear, material, controls.count]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={farRef}
        args={[geometryFar, material, controls.count]}
        frustumCulled={false}
      />
    </>
  );
}

interface GroundProps {
  palette: Palette;
}

function Ground({ palette }: GroundProps) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: palette.fog.clone().lerp(palette.a, 0.35),
      }),
    [palette],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
      <circleGeometry args={[80, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface MoonProps {
  controls: Controls;
  palette: Palette;
}

function Moon({ controls, palette }: MoonProps) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#fff5dc').lerp(palette.c, 0.4),
        transparent: true,
        opacity: 0.95,
      }),
    [palette],
  );

  useEffect(() => () => material.dispose(), [material]);

  const distance = 38;
  const y = 6 + controls.moonHeight * 14;

  return (
    <mesh position={[6, y, -distance]}>
      <sphereGeometry args={[3.4, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface CameraRigProps {
  drift: number;
}

function CameraRig({ drift }: CameraRigProps) {
  const { camera } = useThree();
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * (0.15 + drift * 0.4);
    const radius = 14 + Math.sin(t.current * 0.7) * 2;
    const angle = t.current * 0.25;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 7.5 + Math.sin(t.current * 0.5) * 0.8;
    camera.lookAt(0, 2.6, 0);
  });

  return null;
}

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
// Component shell — controls panel + Canvas
// ---------------------------------------------------------------------------

function Moonlight({ width, height }: ProjectComponentProps) {
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);

  return (
    <div className={styles.root} style={{ width, height }}>
      <div className={styles.canvasHost}>
        <Canvas
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          camera={{ fov: 55, position: [0, 8, 14], near: 0.1, far: 200 }}
        >
          <Scene controls={controls} />
        </Canvas>
      </div>

      <CollapsiblePanel className={styles.panel} ariaLabel="Moonlight controls">
        <h3 className={styles.panelTitle}>Moonlight</h3>
        <p className={styles.subtitle}>
          Tune the crystal field.
        </p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Crystal Field</p>
          <Slider
            label="Crystal Count"
            min={40}
            max={600}
            step={10}
            value={controls.count}
            onChange={(v) => setControls((p) => ({ ...p, count: v }))}
          />
          <Slider
            label="Spread"
            min={6}
            max={45}
            step={0.5}
            value={controls.spread}
            onChange={(v) => setControls((p) => ({ ...p, spread: v }))}
          />
          <Slider
            label="Base Height"
            min={0.4}
            max={5}
            step={0.05}
            value={controls.baseHeight}
            onChange={(v) => setControls((p) => ({ ...p, baseHeight: v }))}
          />
          <Slider
            label="Height Variance"
            min={0}
            max={6}
            step={0.05}
            value={controls.heightVariance}
            onChange={(v) => setControls((p) => ({ ...p, heightVariance: v }))}
          />
          <Slider
            label="Color Bands"
            min={1}
            max={14}
            step={1}
            value={controls.bandCount}
            onChange={(v) => setControls((p) => ({ ...p, bandCount: v }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Sky &amp; Camera</p>
          <Slider
            label="Camera Drift"
            min={0}
            max={1.5}
            step={0.01}
            value={controls.cameraDrift}
            onChange={(v) => setControls((p) => ({ ...p, cameraDrift: v }))}
          />
          <Slider
            label="Fog Density"
            min={0}
            max={0.18}
            step={0.005}
            value={controls.fogDensity}
            onChange={(v) => setControls((p) => ({ ...p, fogDensity: v }))}
          />
          <Slider
            label="Moon Height"
            min={0}
            max={1.4}
            step={0.01}
            value={controls.moonHeight}
            onChange={(v) => setControls((p) => ({ ...p, moonHeight: v }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Palette</p>
          <div className={styles.audioGrid}>
            {PALETTES.map((p, i) => (
              <button
                key={p.name}
                type="button"
                className={`${styles.button} ${controls.paletteIndex === i ? styles.buttonActive : ''}`}
                onClick={() => setControls((prev) => ({ ...prev, paletteIndex: i }))}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>
      </CollapsiblePanel>
    </div>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  const id = `mlight-${label.toLowerCase().replace(/\s+/g, '-')}`;
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

export default Moonlight;
