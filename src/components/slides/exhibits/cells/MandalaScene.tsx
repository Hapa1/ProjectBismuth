import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { IridescentPolygon } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import { usePrefersReducedMotion } from '../../../../lib/iridescent';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

/**
 * Mandala — concentric rings of small circles around a central disc.
 */
export function MandalaScene({ params }: SceneProps) {
  const reduce = usePrefersReducedMotion();
  const rootRef = useRef<THREE.Group>(null);

  const petals = Math.round(params.petals ?? 12);
  const rings = Math.round(params.rings ?? 3);
  const spin = params.spin ?? 0.15;

  const material = useExhibitMaterial({
    intensity: 1.2,
    pulseTravel: 3.0,
    pointerRadius: 1.8,
  });

  useFrame((_, delta) => {
    if (reduce) return;
    if (rootRef.current) rootRef.current.rotation.z += delta * spin;
  });

  const layout = useMemo(() => {
    const items: { x: number; y: number; r: number }[] = [];
    items.push({ x: 0, y: 0, r: 0.18 });
    for (let k = 1; k <= rings; k += 1) {
      const ringR = (k / rings) * 1.2;
      const petalR = (1.2 / rings) * 0.45;
      for (let i = 0; i < petals; i += 1) {
        const a = (i / petals) * Math.PI * 2 + (k % 2 === 0 ? Math.PI / petals : 0);
        items.push({ x: Math.cos(a) * ringR, y: Math.sin(a) * ringR, r: petalR });
      }
    }
    return items;
  }, [petals, rings]);

  return (
    <ExhibitFrame>
      <group ref={rootRef}>
        {layout.map((p, i) => (
          <IridescentPolygon
            key={i}
            sides={64}
            radius={p.r}
            outlineWidth={0.012}
            radialSegments={16}
            material={material}
            position={[p.x, p.y, 0]}
          />
        ))}
      </group>
    </ExhibitFrame>
  );
}
