import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import vertexShader from './shaders/prism.vert.glsl?raw';
import fragmentShader from './shaders/prism.frag.glsl?raw';

function Scene() {
  const meshRef = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 2, 4, 1);
    // Rotate apex to point downward
    geo.rotateX(Math.PI);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 } },
        side: THREE.FrontSide,
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
    material.uniforms.uTime.value += delta;
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
      meshRef.current.rotation.x = Math.sin(material.uniforms.uTime.value * 0.3) * 0.06;
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

function Prism({ width, height }: ProjectComponentProps) {
  return (
    <Canvas
      style={{ width, height, display: 'block' }}
      camera={{ position: [0, 0.5, 4], fov: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
    >
      <Scene />
    </Canvas>
  );
}

export default Prism;
