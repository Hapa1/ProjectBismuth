import { useMemo } from 'react';
import { IridescentPolygon } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

/**
 * Flower of Life — hex-packed overlapping circles on a triangular lattice
 * with spacing equal to circle radius. `rings = 2` is the classical motif.
 */
export function FlowerOfLifeScene({ params }: SceneProps) {
  const rings = Math.round(params.rings ?? 2);
  const radius = params.radius ?? 1.0;
  const hue = params.hue ?? 0;

  const material = useExhibitMaterial({
    hueShift: hue,
    pulseTravel: Math.max(2.5, radius * 4),
    pointerRadius: Math.max(1.5, radius * 2),
  });

  const points = useMemo(() => {
    const out: [number, number][] = [];
    for (let q = -rings; q <= rings; q += 1) {
      for (let r = -rings; r <= rings; r += 1) {
        const s = -q - r;
        if (Math.abs(s) > rings) continue;
        const x = radius * (q + r / 2);
        const y = radius * (Math.sqrt(3) / 2) * r;
        out.push([x, y]);
      }
    }
    return out;
  }, [rings, radius]);

  const fit = 1.5 / (rings + 1);
  const tubeWidth = 0.02 / Math.max(1, rings * 0.6);

  return (
    <ExhibitFrame>
      <group scale={[fit, fit, fit]}>
        {points.map(([x, y], i) => (
          <IridescentPolygon
            key={i}
            sides={96}
            radius={radius}
            outlineWidth={tubeWidth}
            radialSegments={20}
            material={material}
            position={[x, y, 0]}
          />
        ))}
      </group>
    </ExhibitFrame>
  );
}
