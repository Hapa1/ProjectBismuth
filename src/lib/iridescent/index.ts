export { IridescentLine, type IridescentLineProps } from './components/IridescentLine';
export { IridescentPolygon, type IridescentPolygonProps } from './components/IridescentPolygon';
export { IridescentSolid, type IridescentSolidProps, type IridescentSolidKind } from './components/IridescentSolid';
export { useIridescentMaterial } from './useIridescentMaterial';
export { useAudioUniforms, type UseAudioUniformsOptions } from './audioBus';
export { BeatDetector, type BeatDetectorOptions, type BeatStep } from './beatDetector';
export { usePrefersReducedMotion } from './usePrefersReducedMotion';
export {
  DEFAULT_PALETTE_OFFSET,
  type Pulse,
  type IridescentPaletteMode,
  type IridescentMaterialOptions,
  type AudioReactiveProps,
} from './types';
export { IRIDESCENT_VERT, IRIDESCENT_FRAG } from './shaders.glsl';
export {
  HSV2RGB_GLSL,
  COSINE_SPECTRUM_GLSL,
  COLOR_FIELD_GLSL,
} from './palettes.glsl';
