---
mode: agent
description: Scaffold a new audio-reactive Project Bismuth piece using the shared iridescent library (palettes, solids, lines, polygons, audio + bleed drivers).
---

# New iridescent art piece

Use this prompt to generate a new Project Bismuth project module that builds
on the shared iridescent library at [`src/lib/iridescent/`](../../src/lib/iridescent/).

Before writing code, read:

- [`docs/iridescent-library.md`](../../docs/iridescent-library.md) — full API surface and conventions.
- [`docs/SPEC.md`](../../docs/SPEC.md) — architecture, cleanup, and mobile-first rules.
- [`.github/copilot-instructions.md`](../copilot-instructions.md) — the non-negotiable repo rules.
- [`src/projects/prismata/index.tsx`](../../src/projects/prismata/index.tsx) — the most complete reference implementation (cosine + colorField + bleed, audio panel, registered crystal refs, palette and effect pickers).

## Inputs to gather (ask the user if not supplied)

1. **`id`** — kebab-case slug matching `^[a-z0-9-]+$`.
2. **Display `name`** and one-line `description` for the registry.
3. **Primary geometry** — fractal/orbital cluster, line network, polygon
   tiling, or single hero solid.
4. **Default palette** — `cosine`, `colorField`, or `bleed`.
5. **Audio role** — passive (palette only) or driving geometry / spawning.
6. **Optional knobs** the user wants in the side panel
   (geometry counts, radii, spin, bloom, etc.).

## Required output

Create exactly these files; touch nothing else outside `src/lib/` unless a
new shared util is genuinely necessary.

### 1. `src/projects/<id>/index.tsx`

Must:

- Default-export a `React.ComponentType<ProjectComponentProps>` named after
  the project (PascalCase).
- Read `width` and `height` from props (CSS pixels). Do **not** add window
  resize listeners.
- Wrap content in a `<Canvas>` with
  `gl={{ antialias: true, powerPreference: 'high-performance' }}` and
  `dpr={[1, Math.min(window.devicePixelRatio, 2)]}`.
- Build **one** shared material via `useIridescentMaterial({ palette, ... })`.
- Drive uniforms with `useAudioUniforms` and/or `useBleedDriver` from the
  iridescent library. Call both hooks unconditionally and pause the
  non-active one with `pause: palette !== 'bleed'` (or vice versa).
- Use `usePrefersReducedMotion()` and pass it through to drivers and any
  `useFrame` work.
- Cap recursion / instance counts based on viewport: e.g.
  `width < 480 ? smallBudget : width < 1024 ? mediumBudget : fullBudget`.
- For bleed mode: build a `crystalRefs = useRef<THREE.Object3D[]>([])` and a
  `register` callback; wrap each `IridescentSolid` in a small
  `RegisteredCrystal` component that pushes/splices its mesh ref on
  mount/unmount and forwards `meshRef`.
- Include a side panel with audio source buttons (Demo Pad, Microphone,
  Tab Audio, Load File, Stop) and any geometry sliders. Mirror the
  Prismata panel structure.

### 2. `src/projects/<id>/<Name>.module.css`

Reuse the styling vocabulary of an existing module (e.g. Prismata's panel,
sliders, meters). Mobile-first, dark-only, monospace, focus rings on every
interactive element. No max-width media queries.

### 3. Append to `src/projects/projectRegistry.ts`

```ts
{
  id: '<id>',
  name: '<Display name>',
  description: '<one line>',
  renderer: 'three',
  load: () => import('./<id>'),
}
```

(Single source of truth — do **not** put `meta` in the project module.)

## Implementation rules (must hold)

- **Plugin pattern** — default-export the component only. No `meta` inside
  the module.
- **One shared `ShaderMaterial`** across the whole tree. Pass `material`
  to every iridescent component. The hook handles disposal.
- **Cleanup discipline** — every `requestAnimationFrame`, listener,
  `Geometry`/`Material`/`Texture`/`RenderTarget` you allocate manually must
  be released on unmount.
- **TypeScript strict** — no `any`. Prefer `import type` for types.
  Component must satisfy `React.ComponentType<ProjectComponentProps>`.
- **Mobile-first** — minimum 44×44px hit targets, fluid type via `clamp()`,
  `100dvh` (never `100vh`), no hover-only affordances.
- **Performance** — allocate geometries/materials in `useMemo` /
  `useEffect`, not inside `useFrame`. Clamp DPR. Keep the project chunk
  under 250 kB gz.

## Verification checklist

After scaffolding:

- [ ] `npx tsc --noEmit` is clean.
- [ ] `npx vite build` succeeds and the new project lands in its own chunk.
- [ ] `/projects/<id>` renders without console errors at 360×640 and
      1440×900.
- [ ] Switching the palette picker (and bleed effect, if used) works
      without rebuilding the canvas.
- [ ] Audio source buttons all function; level meters move with input.
- [ ] `prefers-reduced-motion: reduce` freezes time advance and pulses.
- [ ] Unmounting the route disposes the material (no console warnings; no
      retained WebGL contexts in DevTools → Memory).

## Stretch: extend the library

If the new piece needs a primitive that doesn't exist (new solid kind, new
line topology, new palette mode, new driver), prefer adding it to
`src/lib/iridescent/` and exporting from `index.ts`, then updating
[`docs/iridescent-library.md`](../../docs/iridescent-library.md). Avoid
forking shaders inside a project module.
