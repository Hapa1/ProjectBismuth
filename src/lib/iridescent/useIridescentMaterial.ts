import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { IRIDESCENT_FRAG, IRIDESCENT_VERT } from './shaders.glsl';
import {
  BLEED_EFFECT_INDEX,
  DEFAULT_PALETTE_OFFSET,
  type IridescentMaterialOptions,
  type IridescentPaletteMode,
} from './types';

const MAX_PULSES = 8;

const PALETTE_MODE_INDEX: Record<IridescentPaletteMode, number> = {
  cosine: 0,
  colorField: 1,
  bleed: 2,
};

/**
 * Builds a single iridescent ShaderMaterial. The material is memoized so
 * fractal trees can share one material instance across many meshes — the
 * recommended pattern for this library. Disposes itself on unmount.
 *
 * Audio uniforms (`uMirage`, `uLevel`, `uTreble`) start at neutral values;
 * drive them from `useFrame` if you want audio reactivity. Non-audio
 * uniforms reflect the props passed in and are kept up to date on change.
 */
export function useIridescentMaterial(options: IridescentMaterialOptions = {}): THREE.ShaderMaterial {
  const material = useMemo(() => {
    const offset = options.paletteOffset ?? DEFAULT_PALETTE_OFFSET;
    const palette = options.palette ?? 'cosine';
    const isBleed = palette === 'bleed';
    const pulsePos = Array.from({ length: MAX_PULSES }, () => new THREE.Vector3());
    const pulseI = new Float32Array(MAX_PULSES);
    const pulseHue = new Float32Array(MAX_PULSES);
    const pulseAge = new Float32Array(MAX_PULSES);
    return new THREE.ShaderMaterial({
      vertexShader: IRIDESCENT_VERT,
      fragmentShader: IRIDESCENT_FRAG,
      // Bleed mode wants opaque crystals so the spotlights read as surface
      // illumination; the other modes render as additive iridescent veils.
      transparent: !isBleed,
      depthWrite: isBleed,
      blending: isBleed ? THREE.NormalBlending : THREE.AdditiveBlending,
      side: options.side ?? THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: options.intensity ?? 1.0 },
        uHueShift: { value: options.hueShift ?? 0 },
        uPaletteOffset: { value: new THREE.Vector3(offset[0], offset[1], offset[2]) },
        uPaletteMode: { value: PALETTE_MODE_INDEX[palette] },
        uMirage: { value: 0.5 },
        uLevel: { value: 0 },
        uTreble: { value: 0 },
        uFresnelPower: { value: options.fresnelPower ?? 3.0 },
        uRimBoost: { value: options.rimBoost ?? 1.6 },
        uInnerWash: { value: options.innerWash ?? 0.35 },
        uAlphaBase: { value: options.alphaBase ?? 0.0 },
        // Bleed-only uniforms; declared always so the shader compiles regardless of mode.
        uPointer: { value: new THREE.Vector3() },
        uPointerStrength: { value: 0 },
        uPointerRadius: { value: 1.5 },
        uPulseCount: { value: 0 },
        uPulsePos: { value: pulsePos },
        uPulseI: { value: pulseI },
        uPulseHue: { value: pulseHue },
        uPulseAge: { value: pulseAge },
        uPulseTravel: { value: 4.0 },
        uEffect: { value: BLEED_EFFECT_INDEX.rings },
      },
    });
    // Material is rebuilt only on palette/side changes, which require a
    // different uniform shape. Other props are mirrored via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.palette, options.side]);

  useEffect(() => {
    const offset = options.paletteOffset ?? DEFAULT_PALETTE_OFFSET;
    const u = material.uniforms;
    u.uIntensity.value = options.intensity ?? 1.0;
    u.uHueShift.value = options.hueShift ?? 0;
    (u.uPaletteOffset.value as THREE.Vector3).set(offset[0], offset[1], offset[2]);
    u.uFresnelPower.value = options.fresnelPower ?? 3.0;
    u.uRimBoost.value = options.rimBoost ?? 1.6;
    u.uInnerWash.value = options.innerWash ?? 0.35;
    u.uAlphaBase.value = options.alphaBase ?? 0.0;
  }, [
    material,
    options.intensity,
    options.hueShift,
    options.paletteOffset,
    options.fresnelPower,
    options.rimBoost,
    options.innerWash,
    options.alphaBase,
  ]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return material;
}
