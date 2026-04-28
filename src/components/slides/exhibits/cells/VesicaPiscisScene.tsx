import { IridescentPolygon } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

/**
 * Vesica Piscis — two intersecting circles whose centres are separated by
 * `separation` units. The right circle's radius can be scaled by `ratio`.
 */
export function VesicaPiscisScene({ params }: SceneProps) {
  const separation = params.separation ?? 0.7;
  const ratio = params.ratio ?? 1.0;
  const hue = params.hue ?? 0;

  const material = useExhibitMaterial({
    hueShift: hue,
    pulseTravel: 3.5,
    pointerRadius: 2.2,
  });

  const r = 0.9;

  return (
    <ExhibitFrame>
      <IridescentPolygon
        sides={128}
        radius={r}
        outlineWidth={0.02}
        radialSegments={20}
        material={material}
        position={[-separation / 2, 0, 0]}
      />
      <IridescentPolygon
        sides={128}
        radius={r * ratio}
        outlineWidth={0.02}
        radialSegments={20}
        material={material}
        position={[separation / 2, 0, 0]}
      />
    </ExhibitFrame>
  );
}
