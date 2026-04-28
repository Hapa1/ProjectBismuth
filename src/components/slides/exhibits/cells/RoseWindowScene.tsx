import { useMemo } from 'react';
import * as THREE from 'three';
import { IridescentLine, IridescentPolygon } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

/**
 * Rose Window — outer rim, inner ring, central hub, radial spokes, and a
 * ring of petal circles between inner and outer.
 */
export function RoseWindowScene({ params }: SceneProps) {
  const spokes = Math.max(4, Math.round(params.spokes ?? 12));
  const innerRadius = params.innerRadius ?? 0.4;
  const hue = params.hue ?? 0;
  const outerRadius = 1.3;

  const material = useExhibitMaterial({
    hueShift: hue,
    pulseTravel: 4.0,
    pointerRadius: 2.4,
  });

  const spokePoints = useMemo(() => {
    return Array.from({ length: spokes }, (_, i) => {
      const a = (i / spokes) * Math.PI * 2;
      return [
        new THREE.Vector3(Math.cos(a) * innerRadius, Math.sin(a) * innerRadius, 0),
        new THREE.Vector3(Math.cos(a) * outerRadius, Math.sin(a) * outerRadius, 0),
      ];
    });
  }, [spokes, innerRadius]);

  const petalCircles = useMemo(() => {
    const ringR = (innerRadius + outerRadius) / 2;
    const r = ((outerRadius - innerRadius) / 2) * 0.85;
    return Array.from({ length: spokes }, (_, i) => {
      const a = (i / spokes) * Math.PI * 2 + Math.PI / spokes;
      return { x: Math.cos(a) * ringR, y: Math.sin(a) * ringR, r };
    });
  }, [spokes, innerRadius]);

  return (
    <ExhibitFrame>
      <IridescentPolygon
        sides={128}
        radius={outerRadius}
        outlineWidth={0.022}
        radialSegments={20}
        material={material}
      />
      <IridescentPolygon
        sides={Math.max(48, spokes * 4)}
        radius={innerRadius}
        outlineWidth={0.018}
        radialSegments={16}
        material={material}
      />
      <IridescentPolygon
        sides={48}
        radius={innerRadius * 0.35}
        outlineWidth={0.014}
        radialSegments={16}
        material={material}
      />
      {spokePoints.map((pts, i) => (
        <IridescentLine
          key={`spoke-${i}`}
          points={pts}
          width={0.012}
          radialSegments={12}
          material={material}
        />
      ))}
      {petalCircles.map((p, i) => (
        <IridescentPolygon
          key={`petal-${i}`}
          sides={64}
          radius={p.r}
          outlineWidth={0.012}
          radialSegments={16}
          material={material}
          position={[p.x, p.y, 0]}
        />
      ))}
    </ExhibitFrame>
  );
}
