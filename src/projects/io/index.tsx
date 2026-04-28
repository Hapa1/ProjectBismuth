import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import styles from './Io.module.css';
import { useAudioAnalyser, type AudioBands } from '../../lib/useAudioAnalyser';

import skyVert from './shaders/sky.vert.glsl?raw';
import skyFrag from './shaders/sky.frag.glsl?raw';
import groundVert from './shaders/ground.vert.glsl?raw';
import groundFrag from './shaders/ground.frag.glsl?raw';
import crystalVert from './shaders/crystal.vert.glsl?raw';
import crystalFrag from './shaders/crystal.frag.glsl?raw';
import beamVert from './shaders/beam.vert.glsl?raw';
import beamFrag from './shaders/beam.frag.glsl?raw';
import wispVert from './shaders/wisp.vert.glsl?raw';
import wispFrag from './shaders/wisp.frag.glsl?raw';

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

interface Palette {
  name: string;
  skyTop: THREE.Color;
  skyMid: THREE.Color;
  skyHorizon: THREE.Color;
  groundBase: THREE.Color;
  groundRune: THREE.Color;
  crystalCool: THREE.Color;
  crystalIce: THREE.Color;
  crystalGold: THREE.Color;
  beamCore: THREE.Color;
  beamGlow: THREE.Color;
  wisp: THREE.Color;
}

const PALETTES: Palette[] = [
  {
    name: 'io · cyan',
    skyTop: new THREE.Color('#1a0d4d'),
    skyMid: new THREE.Color('#5b2da8'),
    skyHorizon: new THREE.Color('#c9b3ff'),
    groundBase: new THREE.Color('#dcd2ff'),
    groundRune: new THREE.Color('#ff5cc8'),
    crystalCool: new THREE.Color('#1f6dff'),
    crystalIce: new THREE.Color('#cdf3ff'),
    crystalGold: new THREE.Color('#ffd07b'),
    beamCore: new THREE.Color('#aef6ff'),
    beamGlow: new THREE.Color('#3aa0ff'),
    wisp: new THREE.Color('#6cf6ff'),
  },
  {
    name: 'amaranth',
    skyTop: new THREE.Color('#240a3d'),
    skyMid: new THREE.Color('#a32d8a'),
    skyHorizon: new THREE.Color('#ffc1e6'),
    groundBase: new THREE.Color('#f0d8ee'),
    groundRune: new THREE.Color('#ffe27a'),
    crystalCool: new THREE.Color('#7d2bff'),
    crystalIce: new THREE.Color('#ffd6f3'),
    crystalGold: new THREE.Color('#ffb04a'),
    beamCore: new THREE.Color('#ffd6f9'),
    beamGlow: new THREE.Color('#ff5cc8'),
    wisp: new THREE.Color('#ff85e0'),
  },
  {
    name: 'aurora',
    skyTop: new THREE.Color('#04203a'),
    skyMid: new THREE.Color('#0e7a8c'),
    skyHorizon: new THREE.Color('#a8ffe0'),
    groundBase: new THREE.Color('#cdf0e3'),
    groundRune: new THREE.Color('#ff7ab8'),
    crystalCool: new THREE.Color('#0fa3a3'),
    crystalIce: new THREE.Color('#dffff5'),
    crystalGold: new THREE.Color('#ffe07a'),
    beamCore: new THREE.Color('#c8ffec'),
    beamGlow: new THREE.Color('#3ce0a0'),
    wisp: new THREE.Color('#7af0c0'),
  },
  {
    name: 'ember',
    skyTop: new THREE.Color('#3d0820'),
    skyMid: new THREE.Color('#a8341a'),
    skyHorizon: new THREE.Color('#ffd098'),
    groundBase: new THREE.Color('#ffe7d0'),
    groundRune: new THREE.Color('#7d3aff'),
    crystalCool: new THREE.Color('#ff5a2a'),
    crystalIce: new THREE.Color('#ffe7c0'),
    crystalGold: new THREE.Color('#fff1a8'),
    beamCore: new THREE.Color('#fff0c8'),
    beamGlow: new THREE.Color('#ff7a3c'),
    wisp: new THREE.Color('#ffb86c'),
  },
];

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

interface Controls {
  paletteIndex: number;
  crystalCount: number;
  fieldRadius: number;
  beamCount: number;
  beamHeight: number;
  beamScrollSpeed: number;
  reactivity: number;
  wispDensity: number;
  bloomIntensity: number;
  reflections: boolean;
  audioGain: number;
  smoothing: number;
}

const DEFAULTS: Controls = {
  paletteIndex: 0,
  crystalCount: 60,
  fieldRadius: 9,
  beamCount: 8,
  beamHeight: 32,
  beamScrollSpeed: 0.55,
  reactivity: 1.0,
  wispDensity: 1.0,
  bloomIntensity: 1.1,
  reflections: true,
  audioGain: 0.9,
  smoothing: 0.82,
};

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let v = s;
    v = Math.imul(v ^ (v >>> 15), v | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

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
// Sky
// ---------------------------------------------------------------------------

interface SkyProps {
  palette: Palette;
  bandsRef: React.MutableRefObject<AudioBands>;
  reduceMotion: boolean;
}

function Sky({ palette, bandsRef, reduceMotion }: SkyProps) {
  const { scene } = useThree();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uLevel: { value: 0 },
          uTop: { value: palette.skyTop.clone() },
          uMid: { value: palette.skyMid.clone() },
          uHorizon: { value: palette.skyHorizon.clone() },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uTop.value.copy(palette.skyTop);
    material.uniforms.uMid.value.copy(palette.skyMid);
    material.uniforms.uHorizon.value.copy(palette.skyHorizon);
  }, [material, palette]);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(palette.skyTop.getHex(), 0.018);
    return () => {
      scene.fog = null;
    };
  }, [scene, palette]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (!reduceMotion) material.uniforms.uTime.value += delta;
    material.uniforms.uLevel.value = bandsRef.current.level;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-2}>
      <sphereGeometry args={[120, 48, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Ground (reflective base + procedural rune overlay)
// ---------------------------------------------------------------------------

interface GroundProps {
  palette: Palette;
  bandsRef: React.MutableRefObject<AudioBands>;
  reflections: boolean;
  reduceMotion: boolean;
}

function Ground({ palette, bandsRef, reflections, reduceMotion }: GroundProps) {
  const overlayMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: groundVert,
        fragmentShader: groundFrag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uBase: { value: palette.groundBase.clone() },
          uRune: { value: palette.groundRune.clone() },
          uBleed: { value: palette.beamCore.clone() },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    overlayMat.uniforms.uBase.value.copy(palette.groundBase);
    overlayMat.uniforms.uRune.value.copy(palette.groundRune);
    overlayMat.uniforms.uBleed.value.copy(palette.beamCore);
  }, [overlayMat, palette]);

  useEffect(() => () => overlayMat.dispose(), [overlayMat]);

  useFrame((_, delta) => {
    if (!reduceMotion) overlayMat.uniforms.uTime.value += delta;
    const b = bandsRef.current;
    overlayMat.uniforms.uBass.value = b.bass;
    overlayMat.uniforms.uMid.value = b.mid;
    overlayMat.uniforms.uTreble.value = b.treble;
  });

  return (
    <group>
      {reflections && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <circleGeometry args={[80, 64]} />
          <MeshReflectorMaterial
            blur={[300, 80]}
            resolution={512}
            mixBlur={1.4}
            mixStrength={0.35}
            mirror={0.4}
            depthScale={0.5}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.2}
            color={palette.groundBase.clone().multiplyScalar(0.18)}
            metalness={0.4}
            roughness={0.95}
          />
        </mesh>
      )}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} renderOrder={1}>
        <circleGeometry args={[80, 96]} />
        <primitive object={overlayMat} attach="material" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Crystals (instanced jagged shards)
// ---------------------------------------------------------------------------

interface CrystalLayout {
  matrices: Float32Array;
  heights: Float32Array;
  widths: Float32Array;
  seeds: Float32Array;
  bands: Float32Array;
  anchors: { x: number; z: number; baseY: number; size: number }[];
}

function buildCrystalGeometry(): THREE.BufferGeometry {
  // Faceted shard: 6-sided base ring at y=0, narrow ring at y=0.7, asymmetric tip at y=1.05
  const sides = 6;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const baseRing: THREE.Vector3[] = [];
  const midRing: THREE.Vector3[] = [];
  const rng = mulberry32(0xfaceaa);

  for (let i = 0; i < sides; i += 1) {
    const a = (i / sides) * Math.PI * 2;
    const rb = 0.5 * (0.85 + rng() * 0.3);
    const rm = 0.22 * (0.7 + rng() * 0.6);
    baseRing.push(new THREE.Vector3(Math.cos(a) * rb, 0, Math.sin(a) * rb));
    midRing.push(new THREE.Vector3(Math.cos(a) * rm, 0.72, Math.sin(a) * rm));
  }
  const tip = new THREE.Vector3((rng() - 0.5) * 0.1, 1.05, (rng() - 0.5) * 0.1);

  const pushFace = (verts: THREE.Vector3[]) => {
    const n = new THREE.Vector3()
      .subVectors(verts[1], verts[0])
      .cross(new THREE.Vector3().subVectors(verts[2], verts[0]))
      .normalize();
    const start = positions.length / 3;
    for (const v of verts) {
      positions.push(v.x, v.y, v.z);
      normals.push(n.x, n.y, n.z);
    }
    if (verts.length === 3) {
      indices.push(start, start + 1, start + 2);
    } else {
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  };

  for (let i = 0; i < sides; i += 1) {
    const j = (i + 1) % sides;
    pushFace([baseRing[i], baseRing[j], midRing[j], midRing[i]]);
    pushFace([midRing[i], midRing[j], tip]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function buildCrystalLayout(count: number, fieldRadius: number): CrystalLayout {
  const matrices = new Float32Array(count * 16);
  const heights = new Float32Array(count);
  const widths = new Float32Array(count);
  const seeds = new Float32Array(count);
  const bands = new Float32Array(count);
  const anchors: CrystalLayout['anchors'] = [];

  const dummy = new THREE.Object3D();
  const rng = mulberry32(0x10c0a);

  for (let i = 0; i < count; i += 1) {
    let x: number;
    let z: number;
    let height: number;
    let width: number;

    if (i === 0) {
      // Hero crystal in center
      x = 0;
      z = -0.5;
      height = 5.2;
      width = 1.4;
    } else {
      const r = Math.sqrt(rng()) * fieldRadius;
      const theta = rng() * Math.PI * 2;
      x = Math.cos(theta) * r;
      z = Math.sin(theta) * r * 0.75;
      height = 1.4 + rng() * 3.2 + (1 - r / fieldRadius) * 1.2;
      width = 0.45 + rng() * 0.7;
    }

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    dummy.matrix.toArray(matrices, i * 16);

    heights[i] = height;
    widths[i] = width;
    seeds[i] = rng();
    bands[i] = i === 0 ? 0 : Math.floor(rng() * 3);
    anchors.push({ x, z, baseY: 0, size: width });
  }

  return { matrices, heights, widths, seeds, bands, anchors };
}

interface CrystalsProps {
  controls: Controls;
  palette: Palette;
  bandsRef: React.MutableRefObject<AudioBands>;
  reduceMotion: boolean;
  onLayout: (layout: CrystalLayout) => void;
}

function Crystals({ controls, palette, bandsRef, reduceMotion, onLayout }: CrystalsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const geometry = useMemo(buildCrystalGeometry, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: crystalVert,
        fragmentShader: crystalFrag,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uReactivity: { value: controls.reactivity },
          uTintCool: { value: palette.crystalCool.clone() },
          uTintIce: { value: palette.crystalIce.clone() },
          uTintGold: { value: palette.crystalGold.clone() },
          uCelSteps: { value: 4 },
          uAuraStrength: { value: 1 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uReactivity.value = controls.reactivity;
    material.uniforms.uTintCool.value.copy(palette.crystalCool);
    material.uniforms.uTintIce.value.copy(palette.crystalIce);
    material.uniforms.uTintGold.value.copy(palette.crystalGold);
  }, [material, controls.reactivity, palette]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const layout = buildCrystalLayout(controls.crystalCount, controls.fieldRadius);

    mesh.count = controls.crystalCount;
    const m = new THREE.Matrix4();
    for (let i = 0; i < controls.crystalCount; i += 1) {
      m.fromArray(layout.matrices, i * 16);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line no-console
    console.log('[io] crystals laid out', {
      count: mesh.count,
      sample0: [layout.matrices[12], layout.matrices[13], layout.matrices[14]],
      sample5: [layout.matrices[5 * 16 + 12], layout.matrices[5 * 16 + 13], layout.matrices[5 * 16 + 14]],
      heights: Array.from(layout.heights).slice(0, 6),
      instanceMatrixLen: mesh.instanceMatrix.array.length,
    });

    const geo = mesh.geometry as THREE.BufferGeometry;
    geo.setAttribute('aHeight', new THREE.InstancedBufferAttribute(layout.heights, 1));
    geo.setAttribute('aWidth', new THREE.InstancedBufferAttribute(layout.widths, 1));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(layout.seeds, 1));
    geo.setAttribute('aBand', new THREE.InstancedBufferAttribute(layout.bands, 1));

    onLayout(layout);
  }, [controls.crystalCount, controls.fieldRadius, onLayout]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!reduceMotion) material.uniforms.uTime.value += delta;
    const b = bandsRef.current;
    material.uniforms.uBass.value = b.bass;
    material.uniforms.uMid.value = b.mid;
    material.uniforms.uTreble.value = b.treble;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, controls.crystalCount]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

// ---------------------------------------------------------------------------
// Beams (instanced billboard quads, additive, scrolling upward)
// ---------------------------------------------------------------------------

interface BeamsProps {
  controls: Controls;
  palette: Palette;
  bandsRef: React.MutableRefObject<AudioBands>;
  reduceMotion: boolean;
  anchors: { x: number; z: number }[];
}

function Beams({ controls, palette, bandsRef, reduceMotion, anchors }: BeamsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 1);
    g.translate(0, 0.5, 0); // y in [0..1]
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVert,
        fragmentShader: beamFrag,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uScrollSpeed: { value: controls.beamScrollSpeed },
          uCore: { value: palette.beamCore.clone() },
          uGlow: { value: palette.beamGlow.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uScrollSpeed.value = reduceMotion ? 0 : controls.beamScrollSpeed;
    material.uniforms.uCore.value.copy(palette.beamCore);
    material.uniforms.uGlow.value.copy(palette.beamGlow);
  }, [material, controls.beamScrollSpeed, palette, reduceMotion]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const count = controls.beamCount;
    mesh.count = count;

    const offsets = new Float32Array(count * 3);
    const heights = new Float32Array(count);
    const widths = new Float32Array(count);
    const phases = new Float32Array(count);
    const bands = new Float32Array(count);

    const rng = mulberry32(0xbea301);
    // Place beams: prefer behind crystals — pick from anchor positions or rng fallback
    for (let i = 0; i < count; i += 1) {
      let x: number;
      let z: number;
      if (anchors.length > 0 && i < anchors.length) {
        const a = anchors[Math.floor(rng() * anchors.length)];
        x = a.x + (rng() - 0.5) * 1.5;
        z = a.z + (rng() - 0.5) * 1.5 - 0.5;
      } else {
        const r = 2 + rng() * (controls.fieldRadius - 1);
        const theta = rng() * Math.PI * 2;
        x = Math.cos(theta) * r;
        z = Math.sin(theta) * r * 0.7;
      }
      offsets[i * 3 + 0] = x;
      offsets[i * 3 + 1] = 0;
      offsets[i * 3 + 2] = z;
      heights[i] = controls.beamHeight * (0.7 + rng() * 0.6);
      widths[i] = 0.55 + rng() * 0.9;
      phases[i] = rng();
      bands[i] = Math.floor(rng() * 3);
    }
    // Identity matrix per instance — shader handles world placement via aOffset
    const identity = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) mesh.setMatrixAt(i, identity);
    mesh.instanceMatrix.needsUpdate = true;

    const geo = mesh.geometry as THREE.BufferGeometry;
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aHeight', new THREE.InstancedBufferAttribute(heights, 1));
    geo.setAttribute('aWidth', new THREE.InstancedBufferAttribute(widths, 1));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geo.setAttribute('aBand', new THREE.InstancedBufferAttribute(bands, 1));
  }, [controls.beamCount, controls.beamHeight, controls.fieldRadius, anchors]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!reduceMotion) material.uniforms.uTime.value += delta;
    const b = bandsRef.current;
    material.uniforms.uBass.value = b.bass;
    material.uniforms.uMid.value = b.mid;
    material.uniforms.uTreble.value = b.treble;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, controls.beamCount]}
      frustumCulled={false}
      renderOrder={3}
    />
  );
}

// ---------------------------------------------------------------------------
// Aura wisps (GPU points around crystal bases, curl-noise drift)
// ---------------------------------------------------------------------------

interface WispsProps {
  controls: Controls;
  palette: Palette;
  bandsRef: React.MutableRefObject<AudioBands>;
  reduceMotion: boolean;
  anchors: { x: number; z: number; baseY: number; size: number }[];
}

function Wisps({ controls, palette, bandsRef, reduceMotion, anchors }: WispsProps) {
  const pointsRef = useRef<THREE.Points>(null!);

  const geometry = useMemo(() => new THREE.BufferGeometry(), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: wispVert,
        fragmentShader: wispFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uReactivity: { value: controls.reactivity },
          uPixelScale: { value: window.devicePixelRatio || 1 },
          uColor: { value: palette.wisp.clone() },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uReactivity.value = controls.reactivity;
    material.uniforms.uColor.value.copy(palette.wisp);
  }, [material, controls.reactivity, palette]);

  useEffect(() => {
    if (anchors.length === 0) return;
    const perAnchor = Math.max(2, Math.round(14 * controls.wispDensity));
    const count = anchors.length * perAnchor;
    const aAnchor = new Float32Array(count * 3);
    const aSeed = new Float32Array(count);
    const aLife = new Float32Array(count);
    const rng = mulberry32(0xa0f1);
    let idx = 0;
    for (const a of anchors) {
      for (let i = 0; i < perAnchor; i += 1) {
        aAnchor[idx * 3 + 0] = a.x;
        aAnchor[idx * 3 + 1] = a.baseY;
        aAnchor[idx * 3 + 2] = a.z;
        aSeed[idx] = rng();
        aLife[idx] = rng();
        idx += 1;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aAnchor', new THREE.BufferAttribute(aAnchor, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    geometry.setAttribute('aLife', new THREE.BufferAttribute(aLife, 1));
    geometry.setDrawRange(0, count);
    geometry.computeBoundingSphere = () => {
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 80);
    };
    geometry.computeBoundingSphere();
  }, [geometry, anchors, controls.wispDensity]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!reduceMotion) material.uniforms.uTime.value += delta;
    const b = bandsRef.current;
    material.uniforms.uBass.value = b.bass;
    material.uniforms.uMid.value = b.mid;
  });

  return <points ref={pointsRef} args={[geometry, material]} frustumCulled={false} renderOrder={2} />;
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

interface CameraRigProps {
  bandsRef: React.MutableRefObject<AudioBands>;
  reduceMotion: boolean;
  width: number;
}

function CameraRig({ bandsRef, reduceMotion, width }: CameraRigProps) {
  const { camera } = useThree();
  const t = useRef(0);

  useEffect(() => {
    camera.position.set(0, 8, 30);
    camera.lookAt(0, 2.6, 0);
  }, [camera, width]);

  useFrame((_, delta) => {
    if (reduceMotion) return;
    t.current += delta * 0.18;
    const bass = bandsRef.current.bass;
    camera.position.x = Math.sin(t.current * 0.4) * 1.1;
    camera.position.y = 8 + Math.sin(t.current * 0.7) * 0.15 + bass * 0.4;
    camera.lookAt(0, 2.4 + bass * 0.3, 0);
  });

  return null;
}

// ---------------------------------------------------------------------------
// Scene composition
// ---------------------------------------------------------------------------

interface SceneProps {
  controls: Controls;
  bandsRef: React.MutableRefObject<AudioBands>;
  reduceMotion: boolean;
  width: number;
}

function Scene({ controls, bandsRef, reduceMotion, width }: SceneProps) {
  const palette = PALETTES[controls.paletteIndex] ?? PALETTES[0];
  const [layout, setLayout] = useState<CrystalLayout | null>(null);
  const anchors = layout?.anchors ?? [];

  return (
    <>
      <Sky palette={palette} bandsRef={bandsRef} reduceMotion={reduceMotion} />
      <Ground
        palette={palette}
        bandsRef={bandsRef}
        reflections={controls.reflections}
        reduceMotion={reduceMotion}
      />
      <Crystals
        controls={controls}
        palette={palette}
        bandsRef={bandsRef}
        reduceMotion={reduceMotion}
        onLayout={setLayout}
      />
      <Beams
        controls={controls}
        palette={palette}
        bandsRef={bandsRef}
        reduceMotion={reduceMotion}
        anchors={anchors}
      />
      <Wisps
        controls={controls}
        palette={palette}
        bandsRef={bandsRef}
        reduceMotion={reduceMotion}
        anchors={anchors}
      />
      <CameraRig bandsRef={bandsRef} reduceMotion={reduceMotion} width={width} />
      <EffectComposer>
        <Bloom
          intensity={controls.bloomIntensity}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </>
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
// Component shell
// ---------------------------------------------------------------------------

function Io({ width, height }: ProjectComponentProps) {
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const audio = useAudioAnalyser();
  const reduceMotion = usePrefersReducedMotion();
  const meterRef = useRef<HTMLDivElement>(null);

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

  const onFile: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) void audio.loadFile(file);
    event.target.value = '';
  };

  return (
    <div className={styles.root} style={{ width, height }}>
      <div className={styles.canvasHost}>
        <Canvas
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          camera={{ fov: 55, position: [0, 2.4, 11], near: 0.1, far: 220 }}
        >
          <Scene
            controls={controls}
            bandsRef={audio.bands}
            reduceMotion={reduceMotion}
            width={width}
          />
        </Canvas>
      </div>

      <aside className={styles.panel} aria-label="Io controls">
        <h3 className={styles.panelTitle}>Io · Crystal Resonance</h3>
        <p className={styles.subtitle}>
          Procedural crystal field with rising plasma beams. Pick an audio source to drive shimmer.
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
          <div className={styles.paletteGrid}>
            {PALETTES.map((p, i) => (
              <button
                key={p.name}
                type="button"
                className={`${styles.button} ${controls.paletteIndex === i ? styles.buttonActive : ''}`}
                onClick={() => setControls((c) => ({ ...c, paletteIndex: i }))}
              >
                {p.name}
              </button>
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
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Crystals &amp; Beams</p>
          <Slider
            label="Crystal Count"
            min={20}
            max={140}
            step={2}
            value={controls.crystalCount}
            onChange={(v) => setControls((c) => ({ ...c, crystalCount: v }))}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="Field Radius"
            min={4}
            max={18}
            step={0.5}
            value={controls.fieldRadius}
            onChange={(v) => setControls((c) => ({ ...c, fieldRadius: v }))}
          />
          <Slider
            label="Beam Count"
            min={2}
            max={16}
            step={1}
            value={controls.beamCount}
            onChange={(v) => setControls((c) => ({ ...c, beamCount: v }))}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="Beam Height"
            min={10}
            max={60}
            step={1}
            value={controls.beamHeight}
            onChange={(v) => setControls((c) => ({ ...c, beamHeight: v }))}
            format={(v) => v.toFixed(0)}
          />
          <Slider
            label="Beam Flow"
            min={0}
            max={1.6}
            step={0.02}
            value={controls.beamScrollSpeed}
            onChange={(v) => setControls((c) => ({ ...c, beamScrollSpeed: v }))}
          />
          <Slider
            label="Wisp Density"
            min={0}
            max={2}
            step={0.05}
            value={controls.wispDensity}
            onChange={(v) => setControls((c) => ({ ...c, wispDensity: v }))}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Post-FX</p>
          <Slider
            label="Bloom"
            min={0}
            max={2.5}
            step={0.05}
            value={controls.bloomIntensity}
            onChange={(v) => setControls((c) => ({ ...c, bloomIntensity: v }))}
          />
          <div className={styles.row}>
            <span className={styles.label}>Reflections</span>
            <input
              type="checkbox"
              checked={controls.reflections}
              onChange={(e) => setControls((c) => ({ ...c, reflections: e.target.checked }))}
              style={{ width: '1.1rem', height: '1.1rem', accentColor: '#6cf6ff' }}
            />
          </div>
        </section>
      </aside>
    </div>
  );
}

export default Io;
