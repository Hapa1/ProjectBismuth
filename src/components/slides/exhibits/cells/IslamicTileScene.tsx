import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { IridescentPolygon } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

/**
 * Islamic-tile-inspired star polygons tessellated across a square grid.
 * Each tile draws two rotated n-gons whose outlines form an n-pointed star.
 */
export function IslamicTileScene({ params }: SceneProps) {
  const rootRef = useRef<THREE.Group>(null);

  const points = Math.max(5, Math.round(params.points ?? 8));
  const density = Math.max(1, Math.round(params.density ?? 2));
  const rotation = params.rotation ?? 0;

  const material = useExhibitMaterial({
    pulseTravel: 4.5,
    pointerRadius: 2.6,
  });

  useEffect(() => {
    if (rootRef.current) rootRef.current.rotation.z = rotation;
  }, [rotation]);

  const tiles = useMemo(() => {
    const out: { x: number; y: number; size: number }[] = [];
    const span = 2.4;
    const step = span / density;
    const tileR = step * 0.45;
    const start = -span / 2 + step / 2;
    for (let i = 0; i < density; i += 1) {
      for (let j = 0; j < density; j += 1) {
        out.push({ x: start + i * step, y: start + j * step, size: tileR });
      }
    }
    return out;
  }, [density]);

  return (
    <ExhibitFrame>
      <group ref={rootRef}>
        {tiles.map((t, i) => (
          <group key={i} position={[t.x, t.y, 0]}>
            <IridescentPolygon
              sides={points}
              radius={t.size}
              outlineWidth={0.012}
              radialSegments={16}
              material={material}
            />
            <IridescentPolygon
              sides={points}
              radius={t.size}
              rotationZ={Math.PI / points}
              outlineWidth={0.012}
              radialSegments={16}
              material={material}
            />
            <IridescentPolygon
              sides={points * 2}
              radius={t.size * 0.45}
              outlineWidth={0.01}
              radialSegments={14}
              material={material}
            />
          </group>
        ))}
      </group>
    </ExhibitFrame>
  );
}
