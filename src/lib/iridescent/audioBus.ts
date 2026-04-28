import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { AudioBands } from '../useAudioAnalyser';
import { BeatDetector, type BeatDetectorOptions } from './beatDetector';

export interface UseAudioUniformsOptions {
  /** Optional. Without it, audio uniforms stay at their neutral defaults. */
  bandsRef?: React.MutableRefObject<AudioBands>;
  /** Multiplier applied to the band values before writing uniforms. */
  reactivity?: number;
  /** Per-frame time multiplier. Defaults to 1.0. */
  timeScale?: number;
  /** Set true to freeze `uTime` (e.g. when prefers-reduced-motion is on). */
  pause?: boolean;
  /** Beat-driven envelope decay (1/sec). Higher = snappier fade. */
  mirageDecay?: number;
  /** Floor below which the envelope settles between beats. */
  mirageFloor?: number;
  /** Beat detector settings. Pass false to disable beat-driven mirage. */
  beat?: BeatDetectorOptions | false;
}

/**
 * Drives the iridescent material's audio uniforms (`uMirage`, `uLevel`,
 * `uTreble`) and advances `uTime`. Internally runs a beat detector that
 * snaps `uMirage` up on transients and decays it back to a floor — same
 * envelope used by Apex's mirage scene.
 *
 * Pass an array of materials to drive a fractal tree from one hook.
 */
export function useAudioUniforms(
  target: THREE.ShaderMaterial | THREE.ShaderMaterial[] | null | undefined,
  options: UseAudioUniformsOptions = {},
): void {
  const reactivity = options.reactivity ?? 1.0;
  const timeScale = options.timeScale ?? 1.0;
  const decay = options.mirageDecay ?? 2.4;
  const floor = options.mirageFloor ?? 0.45;

  const detectorRef = useRef<BeatDetector | null>(null);
  if (options.beat !== false && detectorRef.current === null) {
    detectorRef.current = new BeatDetector(options.beat || undefined);
  }

  useEffect(() => {
    if (options.beat === false) {
      detectorRef.current = null;
      return;
    }
    if (detectorRef.current && options.beat) {
      detectorRef.current.setOptions(options.beat);
    }
  }, [options.beat]);

  const envRef = useRef(floor);

  useFrame((_, delta) => {
    if (!target) return;
    const dt = Math.min(delta, 0.05);
    const materials = Array.isArray(target) ? target : [target];

    const bands = options.bandsRef?.current;
    let level = 0;
    let treble = 0;
    if (bands) {
      level = bands.level * reactivity;
      treble = bands.treble * reactivity;
      const det = detectorRef.current;
      if (det) {
        const beat = det.step(dt, bands);
        if (beat.fired) {
          const target = Math.min(1.3, 0.7 + beat.energy * reactivity * 1.6);
          envRef.current = Math.max(envRef.current, target);
        }
      }
    }

    const above = Math.max(0, envRef.current - floor);
    envRef.current = floor + above * Math.exp(-dt * decay);

    for (const m of materials) {
      const u = m.uniforms;
      if (!options.pause) u.uTime.value += dt * timeScale;
      u.uMirage.value = envRef.current;
      u.uLevel.value = level;
      u.uTreble.value = treble;
    }
  });
}
