import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { buildBismuth } from './geometry';
import vertexShader from './shaders/iridescent.vert.glsl?raw';
import fragmentShader from './shaders/iridescent.frag.glsl?raw';

// ---------------------------------------------------------------------------
// Scene — lives inside <Canvas>, owns the crystal group lifecycle
// ---------------------------------------------------------------------------
interface SceneProps {
  width: number;
}

function Scene({ width }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const levels = width < 480 ? 9 : 16;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 } },
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => {
    const crystalGroup = buildBismuth(levels);

    // Assign the single shared material to every mesh
    crystalGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).material = material;
      }
    });

    groupRef.current.add(crystalGroup);

    return () => {
      crystalGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });
      groupRef.current?.remove(crystalGroup);
    };
  }, [levels, material]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  return <group ref={groupRef} />;
}

// ---------------------------------------------------------------------------
// BismuthSimulator — the exported project component
// ---------------------------------------------------------------------------
function BismuthSimulator({ width, height }: ProjectComponentProps) {
  const camZ = width < 480 ? 6.5 : 5.6;

  return (
    <Canvas
      style={{ width, height, display: 'block' }}
      camera={{ position: [3.3, 4.1, camZ], fov: 36 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
    >
      <ambientLight intensity={0.1} />
      <Scene width={width} />
      <OrbitControls enablePan={false} makeDefault target={[0, 1.7, 0]} />
    </Canvas>
  );
}

export default BismuthSimulator;
