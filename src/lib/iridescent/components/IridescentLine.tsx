import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useIridescentMaterial } from '../useIridescentMaterial';
import type { IridescentMaterialOptions } from '../types';

export interface IridescentLineProps extends IridescentMaterialOptions {
  /** Polyline points in local space. At least 2. */
  points: ReadonlyArray<THREE.Vector3 | [number, number, number]>;
  /** Tube radius (world units). Default 0.02. */
  width?: number;
  /** Cross-section segments. Default 8. */
  radialSegments?: number;
  /** Tessellation segments along the curve. Default = points.length * 6. */
  tubularSegments?: number;
  /** Close the curve into a loop. */
  closed?: boolean;
  /**
   * If supplied, the line uses this material directly (skipping internal
   * material creation). Useful for sharing one material across a fractal tree.
   */
  material?: THREE.ShaderMaterial;
  /** Optional override for the rendered mesh's local transform. */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

function toVec3(p: THREE.Vector3 | [number, number, number]): THREE.Vector3 {
  return p instanceof THREE.Vector3 ? p : new THREE.Vector3(p[0], p[1], p[2]);
}

/**
 * Iridescent polyline rendered as a TubeGeometry so fresnel-based palettes
 * have a meaningful surface normal. Width is a tube radius in world units.
 */
export function IridescentLine({
  points,
  width = 0.02,
  radialSegments = 8,
  tubularSegments,
  closed = false,
  material: externalMaterial,
  position,
  rotation,
  scale,
  ...materialOpts
}: IridescentLineProps) {
  const internalMaterial = useIridescentMaterial(externalMaterial ? {} : materialOpts);
  const material = externalMaterial ?? internalMaterial;

  const geometry = useMemo(() => {
    if (points.length < 2) return new THREE.BufferGeometry();
    const pts = points.map(toVec3);
    const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.0);
    const segs = tubularSegments ?? Math.max(8, pts.length * 6);
    return new THREE.TubeGeometry(curve, segs, width, radialSegments, closed);
  }, [points, width, radialSegments, tubularSegments, closed]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
