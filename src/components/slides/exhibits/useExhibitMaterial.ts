import { useEffect } from 'react';
import {
  useIridescentMaterial,
  useBleedDriver,
  usePrefersReducedMotion,
} from '../../../lib/iridescent';
import type * as THREE from 'three';

interface ExhibitMaterialOptions {
  /** Hue shift (radians-ish; 0..2π loop). */
  hueShift?: number;
  /** World-space radius pulses travel from spawn. */
  pulseTravel?: number;
  /** World-space radius of the cursor spotlight. */
  pointerRadius?: number;
  /** Bleed effect family. Default 'rings'. */
  effect?: 'rings' | 'bloom' | 'streaks' | 'sparkle';
  /** Overall intensity multiplier (uIntensity). */
  intensity?: number;
}

/**
 * Shared material + cursor driver for slide exhibits. Uses the iridescent
 * library's bleed palette (the same look used in lattice/voronoi/prismata)
 * so the cursor casts a moving spotlight on the geometry. The driver also
 * advances `uTime` itself, so callers don't need their own time tick.
 */
export function useExhibitMaterial(options: ExhibitMaterialOptions = {}): THREE.ShaderMaterial {
  const reduce = usePrefersReducedMotion();
  const material = useIridescentMaterial({
    palette: 'bleed',
    intensity: options.intensity ?? 1.2,
  });

  useBleedDriver(material, {
    pause: reduce,
    pulseTravel: options.pulseTravel ?? 3.5,
    pointerRadius: options.pointerRadius ?? 2.0,
    pulseDecay: 0.55,
    effect: options.effect ?? 'rings',
    beat: false, // no audio in slide exhibits
  });

  useEffect(() => {
    if (typeof options.hueShift === 'number') {
      material.uniforms.uHueShift.value = options.hueShift;
    }
  }, [material, options.hueShift]);

  useEffect(() => {
    if (typeof options.intensity === 'number') {
      material.uniforms.uIntensity.value = options.intensity;
    }
  }, [material, options.intensity]);

  return material;
}
