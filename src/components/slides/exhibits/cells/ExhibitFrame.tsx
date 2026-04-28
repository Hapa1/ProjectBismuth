import type { ReactNode } from 'react';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

/**
 * Shared camera + lighting + bloom postprocessing for slide exhibits.
 * The bloom pass produces the "bleeding light" glow seen in the lattice
 * and voronoi projects — additive iridescent veils only read as light if
 * bright fragments smear into their neighbours.
 */
export function ExhibitFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 3]} intensity={0.8} />
      {children}
      <EffectComposer>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.7}
          mipmapBlur
          radius={0.8}
        />
      </EffectComposer>
    </>
  );
}
