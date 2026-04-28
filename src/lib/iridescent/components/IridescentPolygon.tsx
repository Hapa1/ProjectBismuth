import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { IridescentLine } from './IridescentLine';
import { useIridescentMaterial } from '../useIridescentMaterial';
import type { IridescentMaterialOptions } from '../types';

export interface IridescentPolygonProps extends IridescentMaterialOptions {
  /** Number of sides. Min 3. */
  sides: number;
  /** Circumradius in local units. Default 1. */
  radius?: number;
  /** 'outline' uses tube; 'filled' uses ShapeGeometry. */
  variant?: 'outline' | 'filled';
  /** Outline tube radius (world units). Only used when variant='outline'. */
  outlineWidth?: number;
  /** Rotation about local Z (radians). Default 0. */
  rotationZ?: number;
  /**
   * If supplied, this material is used directly. Recommended for fractal
   * trees so all nodes share one ShaderMaterial.
   */
  material?: THREE.ShaderMaterial;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

/**
 * Regular n-gon rendered with the iridescent material. `outline` variant
 * delegates to `IridescentLine` (closed tube); `filled` builds a ShapeGeometry.
 */
export function IridescentPolygon({
  sides,
  radius = 1,
  variant = 'outline',
  outlineWidth = 0.03,
  rotationZ = 0,
  material: externalMaterial,
  position,
  rotation,
  scale,
  ...materialOpts
}: IridescentPolygonProps) {
  const internalMaterial = useIridescentMaterial(externalMaterial ? {} : materialOpts);
  const material = externalMaterial ?? internalMaterial;

  const points = useMemo(() => {
    const n = Math.max(3, Math.floor(sides));
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < n; i += 1) {
      const a = rotationZ + (i / n) * Math.PI * 2;
      out.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return out;
  }, [sides, radius, rotationZ]);

  const filledGeometry = useMemo(() => {
    if (variant !== 'filled') return null;
    const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y)));
    return new THREE.ShapeGeometry(shape);
  }, [variant, points]);

  useEffect(() => {
    return () => {
      filledGeometry?.dispose();
    };
  }, [filledGeometry]);

  if (variant === 'filled' && filledGeometry) {
    return (
      <mesh
        geometry={filledGeometry}
        material={material}
        position={position}
        rotation={rotation}
        scale={scale}
      />
    );
  }

  return (
    <IridescentLine
      points={points}
      width={outlineWidth}
      closed
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
