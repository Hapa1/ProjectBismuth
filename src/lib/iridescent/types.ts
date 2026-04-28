import * as THREE from 'three';
import type { AudioBands } from '../useAudioAnalyser';

export type IridescentPaletteMode = 'cosine' | 'colorField' | 'bleed';

export type BleedEffect = 'rings' | 'bloom' | 'streaks' | 'sparkle';

export const BLEED_EFFECT_INDEX: Record<BleedEffect, number> = {
  rings: 0,
  bloom: 1,
  streaks: 2,
  sparkle: 3,
};

/** Default cosine-spectrum offset — Apex's violet→cyan→pink palette. */
export const DEFAULT_PALETTE_OFFSET: readonly [number, number, number] = [0.55, 0.88, 1.22];

export interface Pulse {
  pos: THREE.Vector3;
  intensity: number;
  hue: number;
  age: number;       // 0..1
  lifetime: number;  // seconds
}

export interface IridescentMaterialOptions {
  palette?: IridescentPaletteMode;
  paletteOffset?: readonly [number, number, number];
  intensity?: number;
  hueShift?: number;
  fresnelPower?: number;
  rimBoost?: number;
  innerWash?: number;
  alphaBase?: number;
  side?: THREE.Side;
}

export interface AudioReactiveProps {
  bandsRef?: React.MutableRefObject<AudioBands>;
  /** Multiplier from band → uniforms. Defaults to 1. */
  reactivity?: number;
}
