import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { CollapsiblePanel } from '../../lib/controls';
import styles from './Sierpinski3D.module.css';

interface Controls {
  depth: number;
  scale: number;
  rotationSpeed: number;
  autoRotate: boolean;
  wireframe: boolean;
}

const DEFAULTS: Controls = {
  depth: 5,
  scale: 1.5,
  rotationSpeed: 0.3,
  autoRotate: true,
  wireframe: false,
};

/**
 * Generate tetrahedron vertices for a Sierpinski tetrahedron fractal.
 * Uses recursive subdivision: at each level, replace each tetrahedron
 * with 4 smaller tetrahedra at the vertices of the original.
 */
function generateSierpinskiTetrahedron(
  depth: number,
  scale: number,
): { positions: number[]; indices: number[] } {
  const positions: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  // Base tetrahedron vertices
  const baseVertices = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ];

  function recur(v: number[][], d: number, s: number) {
    if (d === 0) {
      // Leaf: add the four vertices and six edges as triangles
      const offset = vertexIndex;
      for (const vert of v) {
        positions.push(vert[0] * s, vert[1] * s, vert[2] * s);
        vertexIndex++;
      }
      // Four faces of tetrahedron
      indices.push(offset + 0, offset + 1, offset + 2);
      indices.push(offset + 0, offset + 1, offset + 3);
      indices.push(offset + 0, offset + 2, offset + 3);
      indices.push(offset + 1, offset + 2, offset + 3);
      return;
    }

    // Midpoints of tetrahedron edges
    const mid = (p: number[], q: number[]): number[] => [
      (p[0] + q[0]) / 2,
      (p[1] + q[1]) / 2,
      (p[2] + q[2]) / 2,
    ];

    const m01 = mid(v[0], v[1]);
    const m02 = mid(v[0], v[2]);
    const m03 = mid(v[0], v[3]);
    const m12 = mid(v[1], v[2]);
    const m13 = mid(v[1], v[3]);
    const m23 = mid(v[2], v[3]);

    // Four smaller tetrahedra at each original vertex
    recur([v[0], m01, m02, m03], d - 1, s);
    recur([v[1], m01, m12, m13], d - 1, s);
    recur([v[2], m02, m12, m23], d - 1, s);
    recur([v[3], m03, m13, m23], d - 1, s);
  }

  recur(baseVertices, depth, scale);
  return { positions, indices };
}

function SierpinskiMesh({
  depth,
  scale,
  autoRotate,
  rotationSpeed,
  wireframe,
}: Omit<Controls, 'depth' | 'scale' | 'rotationSpeed' | 'autoRotate' | 'wireframe'> & {
  depth: number;
  scale: number;
  autoRotate: boolean;
  rotationSpeed: number;
  wireframe: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhongMaterial>(null);

  // Generate geometry once per depth/scale combo
  const geometry = useMemo(() => {
    const { positions, indices } = generateSierpinskiTetrahedron(depth, scale);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geo.computeVertexNormals();
    return geo;
  }, [depth, scale]);

  useFrame(() => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.x += rotationSpeed * 0.01;
      meshRef.current.rotation.y += rotationSpeed * 0.013;
    }
  });

  // Update wireframe without recreating material
  React.useEffect(() => {
    if (materialRef.current) {
      materialRef.current.wireframe = wireframe;
    }
  }, [wireframe]);

  // Cleanup geometry on unmount
  React.useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial
        ref={materialRef}
        color={0xa78bfa}
        wireframe={wireframe}
        emissive={0x5a4fa7}
        shininess={100}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function SliderControl({ label, min, max, step, value, onChange, format }: SliderProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {format ? format(value) : value.toFixed(step < 1 ? 2 : 0)}
      </span>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function Sierpinski3D({ }: ProjectComponentProps) {
  const [controls, setControls] = useState<Controls>(DEFAULTS);

  const setDepth = useCallback((depth: number) => {
    setControls((p) => ({ ...p, depth }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setControls((p) => ({ ...p, scale }));
  }, []);

  const setRotationSpeed = useCallback((rotationSpeed: number) => {
    setControls((p) => ({ ...p, rotationSpeed }));
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setControls((p) => ({ ...p, autoRotate: !p.autoRotate }));
  }, []);

  const toggleWireframe = useCallback(() => {
    setControls((p) => ({ ...p, wireframe: !p.wireframe }));
  }, []);

  const reset = useCallback(() => {
    setControls(DEFAULTS);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.canvasContainer}>
        <Canvas
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          camera={{ position: [0, 0, 5] }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <SierpinskiMesh
            depth={controls.depth}
            scale={controls.scale}
            autoRotate={controls.autoRotate}
            rotationSpeed={controls.rotationSpeed}
            wireframe={controls.wireframe}
          />
        </Canvas>
      </div>

      <CollapsiblePanel className={styles.panel} ariaLabel="Sierpinski 3D controls">
        <h3 className={styles.panelTitle}>Sierpinski Tetrahedron</h3>
        <p className={styles.tagline}>
          A fractal where each tetrahedron spawns four smaller copies. Self-similar at every scale.
        </p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Geometry</p>
          <SliderControl
            label="Depth"
            min={0}
            max={6}
            step={1}
            value={controls.depth}
            onChange={setDepth}
          />
          <SliderControl
            label="Scale"
            min={0.5}
            max={2.5}
            step={0.1}
            value={controls.scale}
            onChange={setScale}
          />
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Animation</p>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="autoRotate"
              checked={controls.autoRotate}
              onChange={toggleAutoRotate}
              aria-label="Auto-rotate"
            />
            <label htmlFor="autoRotate">Auto-rotate</label>
          </div>
          {controls.autoRotate && (
            <SliderControl
              label="Rotation speed"
              min={0.1}
              max={2}
              step={0.1}
              value={controls.rotationSpeed}
              onChange={setRotationSpeed}
            />
          )}
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Display</p>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="wireframe"
              checked={controls.wireframe}
              onChange={toggleWireframe}
              aria-label="Wireframe"
            />
            <label htmlFor="wireframe">Wireframe</label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.buttonRow}>
            <button className={styles.button} type="button" onClick={reset}>
              Reset
            </button>
          </div>
        </section>
      </CollapsiblePanel>
    </div>
  );
}

export default Sierpinski3D;
