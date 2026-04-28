import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { Slider } from '../../lib/controls';
import styles from './Polyhedra.module.css';

type Shape =
  | 'tetrahedron'
  | 'cube'
  | 'octahedron'
  | 'dodecahedron'
  | 'icosahedron';

const SHAPE_OPTIONS: { value: Shape; label: string }[] = [
  { value: 'tetrahedron', label: 'Tetrahedron' },
  { value: 'cube', label: 'Cube' },
  { value: 'octahedron', label: 'Octahedron' },
  { value: 'dodecahedron', label: 'Dodecahedron' },
  { value: 'icosahedron', label: 'Icosahedron' },
];

function buildGeometry(shape: Shape, size: number): THREE.BufferGeometry {
  switch (shape) {
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(size);
    case 'cube':
      return new THREE.BoxGeometry(size * 1.4, size * 1.4, size * 1.4);
    case 'octahedron':
      return new THREE.OctahedronGeometry(size);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(size);
    case 'icosahedron':
    default:
      return new THREE.IcosahedronGeometry(size);
  }
}

interface SceneProps {
  shape: Shape;
  size: number;
  rotationSpeed: number;
  wireframe: boolean;
  hue: number;
}

function Scene({ shape, size, rotationSpeed, wireframe, hue }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => buildGeometry(shape, size), [shape, size]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue / 360, 0.55, 0.6),
        metalness: 0.4,
        roughness: 0.25,
        wireframe,
        flatShading: true,
      }),
    // material is created once; mutated below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.color.setHSL(hue / 360, 0.55, 0.6);
  }, [hue, material]);

  useEffect(() => {
    material.wireframe = wireframe;
    material.needsUpdate = true;
  }, [wireframe, material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * rotationSpeed;
    meshRef.current.rotation.x += delta * rotationSpeed * 0.45;
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#9bb6ff" />
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
}

function Polyhedra(_props: ProjectComponentProps) {
  const [shape, setShape] = useState<Shape>('icosahedron');
  const [size, setSize] = useState(1.2);
  const [rotationSpeed, setRotationSpeed] = useState(0.4);
  const [wireframe, setWireframe] = useState(false);
  const [hue, setHue] = useState(265);
  const shapeId = useId();
  const wireId = useId();

  const dpr = useMemo<[number, number]>(
    () => [1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)],
    [],
  );

  return (
    <div className={styles.root}>
      <div className={styles.canvasHost}>
        <Canvas
          camera={{ position: [0, 0.4, 4.2], fov: 42 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={dpr}
        >
          <Scene
            shape={shape}
            size={size}
            rotationSpeed={rotationSpeed}
            wireframe={wireframe}
            hue={hue}
          />
        </Canvas>
      </div>

      <div className={styles.panel} data-interactive="true">
        <div className={styles.panelTitle}>Polyhedron</div>

        <div className={styles.shapeRow}>
          <label htmlFor={shapeId} className={styles.shapeLabel}>
            Shape
          </label>
          <select
            id={shapeId}
            className={styles.select}
            value={shape}
            onChange={(e) => setShape(e.target.value as Shape)}
          >
            {SHAPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Slider
          label="Size"
          min={0.5}
          max={2.5}
          step={0.05}
          value={size}
          onChange={setSize}
          format={(v) => v.toFixed(2)}
        />

        <Slider
          label="Rotation"
          min={0}
          max={2}
          step={0.05}
          value={rotationSpeed}
          onChange={setRotationSpeed}
          format={(v) => v.toFixed(2)}
        />

        <Slider
          label="Hue"
          min={0}
          max={360}
          step={1}
          value={hue}
          onChange={setHue}
          format={(v) => `${Math.round(v)}°`}
        />

        <div className={styles.checkRow}>
          <input
            id={wireId}
            type="checkbox"
            className={styles.check}
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
          />
          <label htmlFor={wireId} className={styles.checkLabel}>
            Wireframe
          </label>
        </div>
      </div>
    </div>
  );
}

export default Polyhedra;
