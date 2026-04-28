import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useIridescentMaterial } from '../useIridescentMaterial';
import type { IridescentMaterialOptions } from '../types';

export type IridescentSolidKind =
  | 'tetra'
  | 'octa'
  | 'icosa'
  | 'dodeca'
  | 'box'
  | 'cone'
  | 'prism';

export interface IridescentSolidProps extends IridescentMaterialOptions {
  kind: IridescentSolidKind;
  /** Base size. Default 1. */
  size?: number;
  /** Subdivisions for cone/prism. Default 4 (square cone like Apex). */
  segments?: number;
  /** Render as wireframe. */
  wireframe?: boolean;
  /**
   * If supplied, this material is used directly. Use it to share one
   * material across many nodes in a fractal tree.
   */
  material?: THREE.ShaderMaterial;
  /** Forwarded ref to the underlying mesh — useful for collecting world positions. */
  meshRef?: React.Ref<THREE.Mesh>;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

function buildGeometry(kind: IridescentSolidKind, size: number, segments: number): THREE.BufferGeometry {
  switch (kind) {
    case 'tetra':
      return new THREE.TetrahedronGeometry(size);
    case 'octa':
      return new THREE.OctahedronGeometry(size);
    case 'icosa':
      return new THREE.IcosahedronGeometry(size);
    case 'dodeca':
      return new THREE.DodecahedronGeometry(size);
    case 'box':
      return new THREE.BoxGeometry(size, size, size);
    case 'cone': {
      const g = new THREE.ConeGeometry(size * 0.5, size, segments, 1);
      return g;
    }
    case 'prism': {
      // Apex-style inverted square pyramid.
      const g = new THREE.ConeGeometry(size * 0.5, size, segments, 1);
      g.rotateX(Math.PI);
      return g;
    }
    default:
      return new THREE.BoxGeometry(size, size, size);
  }
}

/**
 * 3D solid primitive (regular polyhedra and Apex-style pyramids) rendered
 * with the iridescent material. Each node owns its geometry; share the
 * `material` prop to dedupe ShaderMaterial across recursive trees.
 */
export function IridescentSolid({
  kind,
  size = 1,
  segments = 4,
  wireframe = false,
  material: externalMaterial,
  meshRef,
  position,
  rotation,
  scale,
  ...materialOpts
}: IridescentSolidProps) {
  const internalMaterial = useIridescentMaterial(externalMaterial ? {} : materialOpts);
  const material = externalMaterial ?? internalMaterial;

  // The wireframe flag is a per-mesh material concern, but our shared material
  // shouldn't be mutated. Clone the material when wireframe is requested.
  const renderMaterial = useMemo(() => {
    if (!wireframe) return material;
    const clone = material.clone();
    clone.wireframe = true;
    return clone;
  }, [material, wireframe]);

  useEffect(() => {
    if (renderMaterial !== material) {
      return () => renderMaterial.dispose();
    }
    return undefined;
  }, [renderMaterial, material]);

  const geometry = useMemo(() => buildGeometry(kind, size, segments), [kind, size, segments]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={renderMaterial}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
