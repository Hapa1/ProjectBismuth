import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioBands } from '../useAudioAnalyser';
import { BeatDetector, type BeatDetectorOptions } from './beatDetector';
import { BLEED_EFFECT_INDEX, type BleedEffect, type Pulse } from './types';

const MAX_PULSES = 8;

export interface UseBleedDriverOptions {
  /** Audio bands ref. Without it, no pulses spawn (pointer still works). */
  bandsRef?: React.MutableRefObject<AudioBands>;
  /** Multiplier applied to band values before driving pulse intensity. */
  reactivity?: number;
  /**
   * Live array of crystal meshes. Pulses can spawn at one of their world
   * positions. Pass an empty array (or omit) to spawn only at random points.
   */
  crystalRefs?: React.MutableRefObject<THREE.Object3D[]>;
  /** [0..1] probability of spawning at a random point vs at a crystal. Default 0.5. */
  randomSpawnChance?: number;
  /** World-space radius of the random-spawn sphere. Default 2.5. */
  randomSpawnRadius?: number;
  /** How far each pulse travels (world units). Default 4.0. */
  pulseTravel?: number;
  /** Pointer spotlight radius (world units). Default 1.5. */
  pointerRadius?: number;
  /** Pulse decay rate (1/sec). Higher = faster fade. Default 0.9. */
  pulseDecay?: number;
  /** Selectable bleed effect. Default 'rings'. */
  effect?: BleedEffect;
  /** Pause time + pulse aging (e.g. for prefers-reduced-motion). */
  pause?: boolean;
  /**
   * Plane the pointer raycaster intersects to derive a 3D pointer position.
   * Defaults to z = 0. Pass your own plane (or a different normal) to align
   * the pointer with a different scene layer.
   */
  pointerPlane?: THREE.Plane;
  /** Beat detector tuning. Pass false to disable beat-driven spawning. */
  beat?: BeatDetectorOptions | false;
}

/**
 * Drives the iridescent material's bleed-mode uniforms (pointer + audio
 * pulses) using the same pattern as Apex's bleed scene. Spawns pulses on
 * beats either at a random crystal world position (per-crystal bleed) or
 * at a random point in space.
 */
export function useBleedDriver(
  material: THREE.ShaderMaterial | null | undefined,
  options: UseBleedDriverOptions = {},
): void {
  const reactivity = options.reactivity ?? 1.0;
  const randomChance = options.randomSpawnChance ?? 0.5;
  const randomRadius = options.randomSpawnRadius ?? 2.5;
  const pulseTravel = options.pulseTravel ?? 4.0;
  const pointerRadius = options.pointerRadius ?? 1.5;
  const decayRate = options.pulseDecay ?? 0.9;
  const effect = options.effect ?? 'rings';

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

  // Sync simple bleed uniforms whenever the host changes effect/radii.
  useEffect(() => {
    if (!material) return;
    const u = material.uniforms;
    if (u.uPulseTravel) u.uPulseTravel.value = pulseTravel;
    if (u.uPointerRadius) u.uPointerRadius.value = pointerRadius;
    if (u.uEffect) u.uEffect.value = BLEED_EFFECT_INDEX[effect];
  }, [material, pulseTravel, pointerRadius, effect]);

  // Pointer tracking — raycast against a plane in world space.
  const { camera, gl } = useThree();
  const ndc = useRef(new THREE.Vector2());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tmpVec3 = useMemo(() => new THREE.Vector3(), []);
  const plane = useMemo(
    () => options.pointerPlane ?? new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [options.pointerPlane],
  );
  const pointerWorld = useRef(new THREE.Vector3());
  // Steady ambient spotlight near the origin so the bleed look has a constant
  // central light source even when the mouse isn't over the canvas. Hover
  // adds extra brightness on top and steers the spotlight toward the cursor.
  const pointerStrength = useRef(1.1);
  const pointerBaseline = 1.1;
  const pointerHoverBoost = 0.6;
  const pointerTarget = useRef(pointerBaseline);
  const hovering = useRef(false);

  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      );
      hovering.current = true;
      pointerTarget.current = pointerBaseline + pointerHoverBoost;
    };
    const onLeave = () => {
      hovering.current = false;
      pointerTarget.current = pointerBaseline;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onLeave);
    };
  }, [gl]);

  const pulses = useRef<Pulse[]>([]);
  const hueSeed = useRef(Math.random());
  const tmpScratch = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!material) return;
    const dt = Math.min(delta, 0.05);
    const u = material.uniforms;

    // Pointer follow. While hovering, raycast from the cursor onto the plane
    // and slew the spotlight toward the hit. While not hovering, ease the
    // spotlight back to the world origin so there's always a constant central
    // source of light.
    const k = 1 - Math.exp(-dt * 6);
    if (hovering.current) {
      raycaster.setFromCamera(ndc.current, camera);
      if (raycaster.ray.intersectPlane(plane, tmpVec3)) {
        pointerWorld.current.lerp(tmpVec3, k);
      }
    } else {
      pointerWorld.current.lerp(tmpScratch.set(0, 0, 0), k * 0.5);
    }
    pointerStrength.current += (pointerTarget.current - pointerStrength.current) * k;
    if (u.uPointer) (u.uPointer.value as THREE.Vector3).copy(pointerWorld.current);
    if (u.uPointerStrength) u.uPointerStrength.value = pointerStrength.current;

    // Time advance.
    if (!options.pause && u.uTime) u.uTime.value += dt;

    // Beat detection → spawn.
    const bands = options.bandsRef?.current;
    const det = detectorRef.current;
    if (bands && det && !options.pause) {
      const beat = det.step(dt, bands);
      if (beat.fired && pulses.current.length < MAX_PULSES) {
        const pickRandom =
          Math.random() < randomChance ||
          !options.crystalRefs ||
          options.crystalRefs.current.length === 0;

        let pos: THREE.Vector3;
        if (pickRandom) {
          // Random point in a sphere — uniform in volume via cube-root sampling.
          const r = Math.cbrt(Math.random()) * randomRadius;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          pos = new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi),
          );
        } else {
          const refs = options.crystalRefs!.current;
          const obj = refs[Math.floor(Math.random() * refs.length)];
          obj.getWorldPosition(tmpScratch);
          pos = tmpScratch.clone();
        }

        const intensity = Math.min(1.4, 0.4 + beat.energy * reactivity * 1.0);
        hueSeed.current = (hueSeed.current + 0.31 + bands.treble * 0.25) % 1;
        pulses.current.push({
          pos,
          intensity,
          hue: hueSeed.current,
          age: 0,
          lifetime: 3.2 + Math.random() * 1.4,
        });
      }
    }

    // Age pulses; mutate in place.
    if (!options.pause) {
      const arr = pulses.current;
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        const p = arr[i];
        p.age += dt / Math.max(p.lifetime, 0.05);
        p.intensity -= decayRate * dt * 0.25;
        if (p.age >= 1.0 || p.intensity <= 0) arr.splice(i, 1);
      }
    }

    // Write pulse arrays.
    const count = Math.min(pulses.current.length, MAX_PULSES);
    if (u.uPulseCount) u.uPulseCount.value = count;
    if (u.uPulsePos && u.uPulseI && u.uPulseHue && u.uPulseAge) {
      const posArr = u.uPulsePos.value as THREE.Vector3[];
      const iArr = u.uPulseI.value as Float32Array;
      const hueArr = u.uPulseHue.value as Float32Array;
      const ageArr = u.uPulseAge.value as Float32Array;
      for (let i = 0; i < count; i += 1) {
        const p = pulses.current[i];
        posArr[i].copy(p.pos);
        iArr[i] = p.intensity;
        hueArr[i] = p.hue;
        ageArr[i] = Math.min(1.0, p.age);
      }
    }
  });
}
