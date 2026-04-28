import { useMemo } from 'react';
import * as THREE from 'three';
import { IridescentLine } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

/**
 * Logarithmic spiral r = a · exp(b · θ). Sampled densely as a tube and
 * scaled so the outer turn fits the framing box.
 */
export function SpiralScene({ params }: SceneProps) {
  const turns = params.turns ?? 3;
  const growth = params.growth ?? 0.18;
  const thickness = params.thickness ?? 0.025;

  const material = useExhibitMaterial({
    pulseTravel: 4.0,
    pointerRadius: 2.4,
  });

  const points = useMemo(() => {
    const total = Math.max(128, Math.round(turns * 96));
    const a = 0.05;
    const tEnd = turns * Math.PI * 2;
    const rMax = a * Math.exp(growth * tEnd);
    const scale = 1.2 / Math.max(0.001, rMax);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= total; i += 1) {
      const t = (i / total) * tEnd;
      const r = a * Math.exp(growth * t) * scale;
      pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0));
    }
    return pts;
  }, [turns, growth]);

  return (
    <ExhibitFrame>
      <IridescentLine
        points={points}
        width={thickness}
        radialSegments={20}
        material={material}
      />
    </ExhibitFrame>
  );
}
