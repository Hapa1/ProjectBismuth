# Iridescent Library — `src/lib/iridescent/`

A small set of reusable React + R3F building blocks that render lines, shapes,
and solids with the same iridescent palettes used across the Apex, Voronoi,
Lattice, and Prismata projects. Use it to build new audio-reactive visuals
without re-deriving shader math from scratch.

> Looking for a quick start? See [Quick Start](#quick-start). Generating new
> code that uses this library? Reference the matching prompt in
> [`.github/prompts/iridescent-art-piece.prompt.md`](../.github/prompts/iridescent-art-piece.prompt.md).

---

## What's in the box

| Export | Kind | Purpose |
| --- | --- | --- |
| `useIridescentMaterial(opts)` | hook | Returns a single shared `THREE.ShaderMaterial` with all three palettes. Auto-disposed on unmount. |
| `IridescentLine` | component | Tube line that uses the shared material; for fractal edges and audio waveforms. |
| `IridescentPolygon` | component | Filled or outlined polygon (n-gon) with the shared material. |
| `IridescentSolid` | component | Platonic-style solid (`tetra`, `octa`, `icosa`, `box`, `cone`, `prism`). Forwards `meshRef` so a driver can read its world position. |
| `useAudioUniforms(material, opts)` | hook | Drives `uTime / uMirage / uLevel / uTreble` from `useAudioAnalyser`. Includes a built-in beat detector. |
| `useBleedDriver(material, opts)` | hook | Drives the **bleed** palette: pointer spotlight + on-beat pulses spawned at crystal positions and/or random points. |
| `BeatDetector` | class | Reusable fast-attack / slow-release beat detector if you want to drive your own visuals. |
| `usePrefersReducedMotion()` | hook | Boolean for `prefers-reduced-motion: reduce`. |
| `IRIDESCENT_VERT`, `IRIDESCENT_FRAG` | strings | Raw GLSL if you want to compile your own variant. |
| `HSV2RGB_GLSL`, `COSINE_SPECTRUM_GLSL`, `COLOR_FIELD_GLSL` | strings | The palette helpers used by the unified shader. Compose them into custom shaders. |

All public types live in [`src/lib/iridescent/types.ts`](../src/lib/iridescent/types.ts).

---

## Palette modes

The unified shader supports three modes, selected via
`useIridescentMaterial({ palette })`:

| Mode | Look | Best for |
| --- | --- | --- |
| `'cosine'` | Apex-style violet → cyan → pink fresnel iridescence with a per-face spatial term. | Recursive structures with many flat-ish faces. Default. |
| `'colorField'` | Voronoi/Lattice-style 4-sine HSV hue cycling tied to world position. | Wide planar surfaces, line networks, polygon meshes. |
| `'bleed'` | Apex-bleed-style opaque crystals lit by a constant pointer spotlight + on-beat **pulses**. Four sub-effects: `rings`, `bloom`, `streaks`, `sparkle`. | Audio-reactive showpieces where a few discrete light sources sweep across a cluster of solids. |

Switching palettes rebuilds the material (different blending and depth
behaviour); switching `bleedEffect` is a uniform-only change.

---

## Quick start

### Minimal scene

```tsx
import { Canvas } from '@react-three/fiber';
import {
  IridescentSolid,
  useIridescentMaterial,
  useAudioUniforms,
} from '@/lib/iridescent';
import { useAudioAnalyser } from '@/lib/useAudioAnalyser';

function Scene() {
  const audio = useAudioAnalyser();
  const material = useIridescentMaterial({
    palette: 'cosine',
    intensity: 0.9,
    fresnelPower: 2.6,
    rimBoost: 1.4,
  });
  useAudioUniforms(material, { bandsRef: audio.bands, reactivity: 0.5 });

  return (
    <>
      <IridescentSolid kind="icosa" size={1.0} material={material} />
      <IridescentSolid kind="octa" size={0.6} material={material}
        position={[1.6, 0, 0]} />
    </>
  );
}
```

### Bleed mode (per-crystal + random pulses)

```tsx
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  IridescentSolid,
  useIridescentMaterial,
  useBleedDriver,
} from '@/lib/iridescent';

function BleedScene({ bandsRef }) {
  const material = useIridescentMaterial({
    palette: 'bleed',
    intensity: 2.0,
    fresnelPower: 2.6,
  });

  // Live registry of meshes the driver can pulse onto.
  const crystalRefs = useRef<THREE.Object3D[]>([]);
  const register = useCallback((mesh: THREE.Mesh) => {
    crystalRefs.current.push(mesh);
    return () => {
      const i = crystalRefs.current.indexOf(mesh);
      if (i >= 0) crystalRefs.current.splice(i, 1);
    };
  }, []);

  useBleedDriver(material, {
    bandsRef,
    crystalRefs,
    effect: 'rings',
    randomSpawnChance: 0.5,
    pulseTravel: 4.0,
    pointerRadius: 3.0,
  });

  return <Crystal register={register} material={material} />;
}

function Crystal({ register, material }) {
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => (ref.current ? register(ref.current) : undefined), [register]);
  return <IridescentSolid kind="icosa" size={1} material={material} meshRef={ref} />;
}
```

---

## API reference

### `useIridescentMaterial(options)`

```ts
interface IridescentMaterialOptions {
  palette?: 'cosine' | 'colorField' | 'bleed'; // default 'cosine'
  paletteOffset?: readonly [number, number, number]; // cosine spectrum offset
  intensity?: number;       // global multiplier on output color (default 1.0)
  hueShift?: number;        // baseline hue offset (cosine) / phase offset (colorField)
  fresnelPower?: number;    // rim falloff exponent (default 3.0)
  rimBoost?: number;        // rim intensity multiplier (default 1.6)
  innerWash?: number;       // inner-face brightness (default 0.35)
  alphaBase?: number;       // base alpha for cosine/colorField (default 0)
  side?: THREE.Side;        // default DoubleSide
}
```

Returns a `THREE.ShaderMaterial`. The hook:

- rebuilds the material when `palette` or `side` changes;
- mirrors all other props onto uniforms via `useEffect`;
- disposes the material on unmount.

The same material can be passed to many `IridescentSolid` / `IridescentLine`
/ `IridescentPolygon` instances. Driver hooks (`useAudioUniforms`,
`useBleedDriver`) write into its uniforms.

### Components

All three components accept either a `material` prop (shared) or the same
options as `useIridescentMaterial` (per-instance). For shared trees, **always
pass `material`** so you only build one shader.

```tsx
<IridescentSolid
  kind="icosa" | "octa" | "tetra" | "box" | "cone" | "prism"
  size={1}
  material={material}
  meshRef={ref}            // optional: gives bleed driver a handle on world position
  position={[x,y,z]}
  rotation={[x,y,z]}
  scale={1 | [x,y,z]}
/>

<IridescentLine
  points={[[x,y,z], ...]}
  closed
  thickness={0.02}
  material={material}
/>

<IridescentPolygon
  sides={6}
  radius={1}
  filled
  material={material}
/>
```

### `useAudioUniforms(material, options)`

Drives `uTime`, `uMirage`, `uLevel`, `uTreble` from a `useAudioAnalyser`
bands ref. Internally runs a `BeatDetector`; on a beat, it kicks
`uMirage` toward `mirageCeiling` and exponentially decays back to
`mirageBase`.

```ts
interface UseAudioUniformsOptions {
  bandsRef?: React.MutableRefObject<AudioBands>;
  reactivity?: number;        // 1.0 default
  pause?: boolean;            // freezes uTime + envelope
  timeScale?: number;
  mirageDecay?: number;       // 1/sec
  mirageFloor?: number;       // 0.4–0.6
  mirageCeiling?: number;     // 1.1–1.4
  mirageBase?: number;
  mirageGain?: number;
  beat?: BeatDetectorOptions | false;
}
```

### `useBleedDriver(material, options)`

Drives the **bleed**-palette uniforms. Required when `palette === 'bleed'`.

```ts
interface UseBleedDriverOptions {
  bandsRef?: React.MutableRefObject<AudioBands>;
  reactivity?: number;
  // Pulses can spawn at one of these meshes' world positions:
  crystalRefs?: React.MutableRefObject<THREE.Object3D[]>;
  randomSpawnChance?: number; // [0..1] probability of random vs per-crystal (default 0.5)
  randomSpawnRadius?: number; // world radius of the random-spawn sphere (default 2.5)
  pulseTravel?: number;       // how far each pulse travels (default 4.0)
  pointerRadius?: number;     // spotlight radius (default 1.5)
  pulseDecay?: number;        // 1/sec; default 0.9
  effect?: 'rings' | 'bloom' | 'streaks' | 'sparkle';
  pause?: boolean;
  pointerPlane?: THREE.Plane; // raycast target (default z = 0)
  beat?: BeatDetectorOptions | false;
}
```

Behaviour:

- **Pointer spotlight** is anchored at the world origin with a constant
  baseline strength. While the pointer is over the canvas, the spotlight
  slews toward the cursor (raycast against `pointerPlane`) and is brightened
  by an additional hover boost. On leave, it eases back to the origin.
- **Pulses** are spawned on detected beats. Each pulse picks either a random
  crystal world position (via `crystalRefs.current[i].getWorldPosition()`)
  or a random point in a sphere around the origin, controlled by
  `randomSpawnChance`. Up to 8 pulses are tracked at a time (a hard limit
  matched in the shader's `MAX_PULSES`).
- The chosen `effect` selects ring fronts, radial blooms, vertical streaks,
  or granular sparkle hotspots.

### `BeatDetector`

Standalone fast-attack / slow-release detector. Defaults are tuned for the
bass band of a 1024-fft `useAudioAnalyser`.

```ts
const det = new BeatDetector({ threshold: 1.6, refractory: 0.18 });
useFrame((_, dt) => {
  const beat = det.step(dt, audio.bands.current);
  if (beat.fired) { /* spawn something */ }
});
```

---

## Conventions

- **One shared material per project.** Drivers write uniforms; the material
  is rebuilt only on palette/side change.
- **Cleanup is automatic.** `useIridescentMaterial` disposes the
  `ShaderMaterial` on unmount. Components dispose their geometries.
- **Mobile-first sizing.** Renderer dependencies live in the project module
  so they lazy-load. Keep recursion budgets viewport-aware
  (`width < 480 ? 2 : 3`).
- **Audio is opt-in.** Every driver accepts `pause` for
  `prefers-reduced-motion`. Without `bandsRef`, the material still renders
  with neutral defaults.
- **Bleed mode is opaque.** It uses normal blending + depth write so the
  spotlights read as surface illumination. The other modes are additive
  veils (`AdditiveBlending`, `transparent: true`, `depthWrite: false`).

---

## Adding a new project that uses the library

1. Create `src/projects/<id>/index.tsx` that default-exports a
   `React.ComponentType<ProjectComponentProps>`.
2. Inside the canvas:
   - call `useIridescentMaterial({ palette })` once;
   - use `IridescentSolid` / `IridescentLine` / `IridescentPolygon` and pass
     `material={material}`;
   - drive uniforms with `useAudioUniforms` (cosine/colorField) or
     `useBleedDriver` (bleed). It is fine to call both unconditionally and
     pause the inactive one.
3. Register the project in `src/projects/projectRegistry.ts` (see spec §1).

A ready-to-fill scaffold lives at
[`.github/prompts/iridescent-art-piece.prompt.md`](../.github/prompts/iridescent-art-piece.prompt.md).
