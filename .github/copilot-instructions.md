# GitHub Copilot Instructions — Project Bismuth

This is a **React 18 + Vite + TypeScript** coding-art portfolio that hosts multiple generative renderers (three.js / `@react-three/fiber`, p5.js, vanilla canvas) behind a single shell. The full design contract lives in [docs/SPEC.md](../docs/SPEC.md). When in doubt, defer to the spec.

Follow these rules when generating, completing, or refactoring code in this repository.

---

## 1. Architecture rules (non-negotiable)

- **Plugin pattern.** Every art piece is a self-contained module under `src/projects/<id>/index.tsx` and **must** default-export the **component** (`React.ComponentType<ProjectComponentProps>`). Do not export a `{ meta, Component }` bundle — `meta` lives only in the registry.
- **Registry is the single source of truth for `meta`.** New projects are added by appending an entry to `src/projects/projectRegistry.ts` — never by editing `AppShell`, `Sidebar`, or `RenderStage`.
- **Lazy-load every project** via `React.lazy(() => import('./<id>'))`. Never statically import a project module from shell code; it would defeat code-splitting and pull three.js / p5 into the main bundle.
- **The shell is renderer-agnostic.** No `if (renderer === 'three')` branching outside the project module itself.
- **Slug format:** project `id`s must match `^[a-z0-9-]+$`.

## 2. State rules

- **URL-as-state for the active project.** Use TanStack Router (`@tanstack/react-router`) with `/projects/$projectId`. Read via `useParams({ from: '/projects/$projectId' })`. Do **not** mirror `projectId` into zustand or `useState`.
- **Unknown `projectId`:** render `<NotFoundView>` with a back-link to `/`. Do not redirect silently.
- **No file-based routing.** Do not use `@tanstack/router-vite-plugin`. Routes are defined imperatively in `src/router.ts`.
- **Zustand is for ephemeral UI only** (`sidebarOpen`, FPS readout, spec overlay toggles). If a value is meaningfully shareable via link, it belongs in the URL.
- **Sidebar store field is `sidebarOpen`** (not `sidebarCollapsed`). Defaults to `false` (mobile-first). On desktop (`>= 1024px`), CSS makes the sidebar always visible regardless of the store value.
- **No prop-drilling of route params.** Components that need `projectId` should read it from the router.

## 3. Transition rules

- Cross-fades between projects use `framer-motion`'s `<AnimatePresence mode="wait">`, keyed on `projectId`. `mode="wait"` is required so the previous renderer fully unmounts (and disposes resources) before the next mounts.
- Wrap project components in `<Suspense fallback={<StageLoader />}>`.
- Do not nest multiple `<Canvas>` elements or run two WebGL contexts simultaneously.

## 4. Cleanup rules (the #1 source of bugs)

Every project **owns its lifecycle**. If you allocate it, free it on unmount.

### Three.js / R3F
- R3F auto-disposes **only** objects created via JSX with `attach`. Objects created via `useMemo(() => new THREE.X())` or `useRef` are **not** auto-disposed — always dispose them in `useEffect` cleanup.
- For **manually built** objects (e.g. recursive groups), traverse on unmount and call `.dispose()` on every `geometry`, every `material` (handle array materials), every `texture`, and every `RenderTarget`.
- Custom `ShaderMaterial`s must be disposed explicitly.
- One `<Canvas>` per project. Use `gl={{ antialias: true, powerPreference: 'high-performance' }}` and `dpr={[1, Math.min(window.devicePixelRatio, 2)]}`.
- If using drei's `<OrbitControls>` declaratively, R3F handles disposal. If using `new OrbitControls(...)`, call `.dispose()` on unmount.

### p5.js
- **Always** use instance mode with the **two-argument constructor**: `new p5(sketch, hostElement)`.
- **Always** call `instance.remove()` in the `useEffect` cleanup. Skipping this leaks the canvas, RAF loop, and WebGL context.
- Handle resize via `instance.resizeCanvas(width, height)` in a separate `useEffect` keyed on `[width, height]` — do not teardown/recreate the sketch on every resize.
- Clamp pixel density: `p.pixelDensity(Math.min(window.devicePixelRatio, 2))`.
- Never use p5 global mode in this project.

### Vanilla canvas
- Cancel every `requestAnimationFrame` handle in cleanup.
- Detach every `addEventListener` (window, canvas, `ResizeObserver`, etc.).

### Cross-cutting
- `width` / `height` props are **CSS pixels** (not device pixels). Each renderer applies DPR internally.
- Get `width` / `height` as **props** from the `RenderStage` (which uses a single debounced `ResizeObserver`). Do **not** add window resize listeners inside individual projects.
- During `AnimatePresence` exit, the outgoing project keeps its last `width`/`height` frozen — never receives `0×0`.

## 5. TypeScript rules

- `strict: true` is assumed. No `any` in shipped code; use `unknown` + narrowing or proper generics. The registry `load` signature is `() => Promise<{ default: React.ComponentType<ProjectComponentProps> }>` — not `any`.
- Project components must satisfy `React.ComponentType<ProjectComponentProps>`.
- Prefer `import type { ... }` for type-only imports.
- Do not widen the `Renderer` union without updating the spec.
- Do not name a file-level `const` as `module` — it shadows Node's global. Use a descriptive name (e.g. `bismuthModule`).

## 6. Styling rules

- Dark mode only. Background `#0a0a0a`. **All tokens are CSS custom properties on `:root`** (see `src/styles/globals.css` and spec §1).
- Muted text color is `#9a9a9a` (WCAG AA compliant against `#0a0a0a`). Do not use `#7a7a7a` or lower for normal-sized text.
- Focus ring: `2px solid var(--color-focus-ring)` with `2px` offset on every interactive element. Must be visible on all surfaces.
- Monospace typography everywhere (`JetBrains Mono` / `IBM Plex Mono` / `ui-monospace`).
- Glassmorphism only on chrome surfaces (sidebar, footer overlays) — never on the Render Stage itself.
- The Render Stage has a `1px` inset border, `border-radius: 12px`, and a deep drop shadow to suggest depth.
- Use the accent `#a78bfa` sparingly (focus rings, active nav item).

## 6a. Mobile-first rules (non-negotiable)

This portfolio must work on a 360px-wide phone before it works on a 4K monitor. When generating layout, components, or projects, follow these rules:

### Layout
- **Author all CSS mobile-first.** Base styles target the smallest viewport. Use `min-width` media queries to *add* desktop affordances — never `max-width` queries to subtract from desktop.
- **Breakpoints (use these, do not invent more):**
  - `--bp-sm: 480px` — large phones
  - `--bp-md: 768px` — tablets
  - `--bp-lg: 1024px` — desktop (sidebar appears here)
- **Sidebar behavior:**
  - `< 1024px`: sidebar is hidden by default and slides in as an overlay (`position: fixed`, full-height, glass background, dismissable via backdrop tap or Esc).
  - `>= 1024px`: sidebar is the persistent 280px rail described in spec §1.
  - Toggle state lives in `useUIStore` (`sidebarOpen`), not the URL.
- **Render Stage** must fill the available viewport on mobile (account for the dynamic viewport: use `100dvh`, not `100vh`, and `100svh` where stability matters). The `1px` inset border and `12px` radius remain.
- **Footer / spec strip** collapses to a single line with truncation on `< 768px`. Hide non-essential metadata (tags) below `sm`.

### Touch & input
- **Minimum hit target: 44×44px.** Nav items, toggles, and any interactive control must meet this regardless of visual size.
- Use `pointer` events (not `mouse*`) where possible. Three.js / R3F: `OrbitControls` already supports touch; do not add desktop-only mouse listeners.
- Disable hover-only affordances on coarse pointers: gate hover styles behind `@media (hover: hover) and (pointer: fine)`.
- Respect `@media (prefers-reduced-motion: reduce)` — disable framer-motion scale animations, slow `useFrame` work, and skip the cross-fade scale effect.

### Renderer sizing
- The `RenderStage` `ResizeObserver` already passes `width` / `height` props. Projects must consume them and react to changes (R3F handles this automatically; p5 needs `instance.resizeCanvas(width, height)` in a `useEffect` keyed on size).
- Cap device pixel ratio on mobile to avoid melting GPUs: `gl={{ ... }}` with `dpr={[1, Math.min(window.devicePixelRatio, 2)]}` for R3F.
- For three.js scenes, scale geometry budgets by viewport: e.g., `maxDepth` in the bismuth recursion should drop on small screens (`width < 480 ? 4 : 6`).

### Typography & spacing
- Use `clamp()` for fluid type: e.g., `font-size: clamp(0.75rem, 0.7rem + 0.3vw, 0.875rem)`.
- Use a spacing scale based on `rem`. Do not hardcode pixel margins/paddings on layout primitives.
- Never set widths in `vw` for text containers (causes overflow on narrow phones with scrollbars). Use `%` or `min()`.

### Testing checklist (per change)
- [ ] Renders at 360×640 without horizontal scroll.
- [ ] Sidebar is reachable and dismissable on mobile (no dead-end UI).
- [ ] All interactive elements ≥ 44×44px.
- [ ] No layout shift when the mobile URL bar shows/hides (use `dvh`).
- [ ] Lighthouse mobile performance ≥ 80 on the bismuth route.
- [ ] `prefers-reduced-motion` disables non-essential animation.

## 7. Performance rules

- Each project must build to its own chunk. **Shell ≤ 60 kB gz, any project chunk ≤ 250 kB gz.** Verify by inspecting `vite build` output if you change registry/import shape.
- Do not add heavy libraries to the shell. Renderer dependencies (three, p5, drei) belong inside project modules so they are lazy-loaded.
- Avoid re-creating geometries/materials on every frame. Allocate in `useMemo` / `useEffect` and mutate uniforms in `useFrame`.
- Share materials across recursively generated meshes when possible.
- Import GLSL via Vite's `?raw` suffix (`import vert from './file.vert.glsl?raw'`). No extra plugin needed.

## 8. Bismuth module specifics

- Geometry generation is **branching recursive** in `src/projects/bismuth/geometry.ts` (hopper-style stepped cuboid frames, multiple children per level). Keep recursion bounded by `maxDepth` (viewport-aware: `width < 480 ? 4 : 6`), `branchCount`, and a minimum-size guard.
- One shared `ShaderMaterial` across all meshes (fresnel + cosine spectrum). No textures. On cleanup: dispose each geometry, then the single material.
- Iridescence is achieved via a custom `ShaderMaterial` (fresnel + cosine spectrum). No textures.
- `uTime` uniform is advanced inside `useFrame`; don't attach `setInterval` or external clocks.
- Camera position adjusts for viewport: pull back on narrow screens (`width < 480 ? 5 : 4` on z-axis).
- Dispose the shader material and all generated geometries on unmount.

## 9. What NOT to do

- ❌ Don't introduce Redux, Jotai, Recoil, or React Context for the active project — it's URL state.
- ❌ Don't import three.js or p5 from the shell, `Sidebar`, or `RenderStage`.
- ❌ Don't use p5 global mode.
- ❌ Don't add CSS frameworks (Tailwind, Chakra, MUI) — this is hand-rolled CSS by design.
- ❌ Don't add a router other than TanStack Router.
- ❌ Don't use `@tanstack/router-vite-plugin` — routes are imperative.
- ❌ Don't store `projectId` in zustand or `useState`.
- ❌ Don't skip `instance.remove()` for p5 or `.dispose()` for three.js resources.
- ❌ Don't add window-level resize listeners inside projects.
- ❌ Don't write `max-width` media queries — author mobile-first with `min-width` only.
- ❌ Don't use `100vh` — use `100dvh` / `100svh`.
- ❌ Don't ship hover-only interactions without a tap/focus equivalent.
- ❌ Don't use `any` in registry types or shipped code.
- ❌ Don't duplicate `meta` inside project module files — it lives only in the registry.
- ❌ Don't name a file-level const `module` — it shadows the Node global.

## 10. When generating a new project module

A new project PR should:

1. Create `src/projects/<id>/index.tsx` default-exporting the component (`React.ComponentType<ProjectComponentProps>`).
2. Add one entry to `projectRegistry.ts` with correct `meta` (single source of truth) and a `() => import('./<id>')` loader.
3. Implement cleanup per §4 for the chosen renderer.
4. Accept `{ width, height }` props (CSS pixels); do not query the DOM for size.
5. Touch **no other files** unless adding a shared util — and if so, place it under `src/lib/`.

## 11. Commit / PR hygiene

- Reference the spec section you're implementing in the PR description.
- If a change diverges from [docs/SPEC.md](../docs/SPEC.md), update the spec in the same PR.
- Acceptance criteria from spec §8 must still pass.
