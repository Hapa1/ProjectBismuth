# Project Bismuth — Coding Art Portfolio Spec

A React + Vite + TypeScript application for showcasing generative / interactive coding art pieces across multiple rendering technologies (three.js, p5.js, vanilla canvas) under a single, cohesive shell.

---

## 1. Design Aesthetic

All tokens are declared as **CSS custom properties on `:root`** in `src/styles/globals.css` so they are consumable from both CSS and JS (via `getComputedStyle`).

| Token (CSS var) | Value | Notes |
|---|---|---|
| `--color-bg` | `#0a0a0a` | Near-black background |
| `--color-surface` | `rgba(255,255,255,0.04)` | Glass panels; pair with `backdrop-filter: blur(16px)` |
| `--color-border` | `rgba(255,255,255,0.08)` | Subtle dividers |
| `--color-text` | `#e8e8e8` | Primary text |
| `--color-text-muted` | `#9a9a9a` | Secondary text — meets WCAG AA (≥ 4.5:1) on `--color-bg` |
| `--color-accent` | `#a78bfa` | Iridescent violet — focus rings, active nav item only |
| `--color-focus-ring` | `#a78bfa` | 2px outline, 2px offset; must be visible on all surfaces |
| `--font-mono` | `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace` | All UI text |
| `--font-display` | Same stack | Uppercase, `letter-spacing: -0.02em` for headings |

**Layout**
- **Left sidebar** (`280px`): glassmorphism panel, fixed, contains project list + metadata. **Mobile (`< 1024px`):** hidden by default, slides in as a full-height overlay; dismissable via backdrop tap or Esc.
- **Render Stage** (center, fluid): `1px` inset border (`rgba(255,255,255,0.08)`), `border-radius: 12px`, drop shadow `0 30px 80px rgba(0,0,0,0.6)`, with a subtle inner highlight to suggest 3D depth. Sized with `100dvh` (not `100vh`) so the mobile URL bar doesn't cause layout shift.
- **Footer strip**: monospace tech specs (FPS, renderer, resolution). Collapses to a single line on `< 768px`.

**Mobile-first contract (non-negotiable)**

This portfolio is authored mobile-first. Generated CSS must use `min-width` media queries to *add* desktop affordances, never `max-width` to subtract from desktop.

| Token | Value |
|---|---|
| `--bp-sm` | `480px` (large phones) |
| `--bp-md` | `768px` (tablets) |
| `--bp-lg` | `1024px` (desktop — sidebar becomes a persistent rail) |

- Minimum touch target: **44×44px** for every interactive control.
- Gate hover affordances behind `@media (hover: hover) and (pointer: fine)`.
- Honor `@media (prefers-reduced-motion: reduce)` — skip framer-motion `scale` (opacity-only crossfade), cap `useFrame` delta work, and skip any particle/physics simulations.
- **Clamp DPR on all renderers** — not just R3F. R3F: `dpr={[1, Math.min(window.devicePixelRatio, 2)]}`. p5: `pixelDensity(Math.min(window.devicePixelRatio, 2))`. Canvas: `canvas.width = cssWidth * Math.min(devicePixelRatio, 2)`. iPhone Pro models report DPR 3; rendering at 3× kills frame rate.
- Renderers must scale geometry/iteration budgets by viewport (e.g. `maxDepth = width < 480 ? 4 : 6` for bismuth recursion).
- Use `clamp()` for fluid typography; use `rem` for spacing; never set text container widths in `vw`.

---

## 2. Architecture — The Plugin Pattern

Each art piece is a self-contained **module** that conforms to a shared `Project` interface. The shell knows nothing about any specific project; it discovers them via a registry.

### 2.1 `Project` interface

```ts
// src/types/project.ts
export type Renderer = 'three' | 'p5' | 'canvas';

export interface ProjectMeta {
  /** URL-safe slug matching /^[a-z0-9-]+$/. Used as the route param and chunk name. */
  id: string;
  title: string;
  year: number;
  renderer: Renderer;
  description: string;
  /** Display tags — use the Renderer union values ('three', 'p5', 'canvas'), not library names. */
  tags: string[];
}

/**
 * Props passed to every project component by the RenderStage.
 * Values are CSS pixels (not device pixels) — the renderer applies DPR internally.
 */
export interface ProjectComponentProps {
  width: number;
  height: number;
}
```

> **Design decision — single source of truth for `meta`:** `ProjectMeta` lives **only** in the registry entry (§2.2). Project module files default-export the **component** (`React.ComponentType<ProjectComponentProps>`), not a `{ meta, Component }` bundle. This avoids duplicating metadata in two places and keeps module files focused on rendering.

### 2.2 `projectRegistry.ts`

- Each project lives at `src/projects/<id>/index.tsx` and **default-exports its component** (`React.ComponentType<ProjectComponentProps>`).
- `meta` is declared inline in the registry entry — this is the only place it exists.
- The registry uses `React.lazy` so each project is its own code-split chunk (three.js, p5.js, etc. only load when selected).

```ts
// src/projects/projectRegistry.ts
import { lazy } from 'react';
import type { ProjectMeta, ProjectComponentProps } from '../types/project';

interface RegistryEntry {
  meta: ProjectMeta;
  load: () => Promise<{ default: React.ComponentType<ProjectComponentProps> }>;
}

export const projectRegistry: RegistryEntry[] = [
  {
    meta: {
      id: 'bismuth',
      title: 'Bismuth Simulator',
      year: 2026,
      renderer: 'three',
      description: 'Recursive iridescent bismuth crystal growth.',
      tags: ['three', 'shader', 'recursion'],
    },
    load: () => import('./bismuth'),
  },
  // future entries…
];

/** Returns a React.lazy component for the given project id. */
export const lazyComponentFor = (id: string) =>
  lazy(() => {
    const entry = projectRegistry.find((p) => p.meta.id === id);
    if (!entry) throw new Error(`Unknown project: ${id}`);
    return entry.load();
  });
```

### 2.3 Dynamic navigation

The sidebar `map`s over `projectRegistry` to build links. Adding a project is a one-line registry edit — no shell changes.

---

## 3. State & Transitions

### 3.1 URL-as-State (TanStack Router)

The active project lives in the **URL**, not in component state. This makes every piece deep-linkable (`/projects/bismuth`).

- Library: [`@tanstack/react-router`](https://tanstack.com/router) — fully type-safe routing for Vite + TS.
- **Do not** use `@tanstack/router-vite-plugin` (file-based routing). Routes are defined imperatively below for explicit control.
- Routes:
  - `/` → landing / project index (lists all registry entries as a grid of cards)
  - `/projects/$projectId` → render stage with that project loaded
  - **Unknown `projectId`:** if the id is not in the registry, render a `<NotFoundView>` that offers a link back to `/`. Do **not** redirect silently.

```ts
// src/router.ts
import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { AppShell } from './AppShell';
import { LandingView } from './views/LandingView';
import { ProjectView } from './views/ProjectView';
import { NotFoundView } from './views/NotFoundView';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingView,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectView,
});

export const routeTree = rootRoute.addChildren([indexRoute, projectRoute]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundView,
});

// Register the router for type-safe hooks
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

Mount the router in `main.tsx`:

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

In `ProjectView`, read the param with the **route path string** (idiomatic TanStack Router):

```ts
const { projectId } = useParams({ from: '/projects/$projectId' });
```

### 3.2 Zustand (UI-only state)

`zustand` holds **ephemeral UI state** that does not belong in the URL:

```ts
// src/state/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  showSpecs: boolean;
  fps: number;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setFps: (v: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,            // default closed — mobile-first
  showSpecs: true,
  fps: 0,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setFps: (v) => set({ fps: v }),
}));
```

**Sidebar logic:**
- `< 1024px` (mobile/tablet): sidebar is a fixed overlay controlled by `sidebarOpen`. Default `false`.
- `>= 1024px` (desktop): sidebar is a persistent rail. `sidebarOpen` is ignored in CSS (the rail is always visible via media query). The store value doesn't need to be synced on resize.

> **Rule:** anything a viewer might want to share via link → URL. Anything local (panel toggles, perf overlays) → zustand.

### 3.3 Cross-fade transitions (framer-motion)

When `projectId` changes, the Render Stage cross-fades between renderer roots — critical because we are swapping a `<Canvas>` (three.js) for a p5 mount node, etc.

```tsx
// src/components/RenderStage.tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence mode="wait">
  <motion.div
    key={projectId}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.02 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    className="stage-inner"
  >
    <Suspense fallback={<StageLoader />}>
      <ProjectComponent width={w} height={h} />
    </Suspense>
  </motion.div>
</AnimatePresence>
```

`mode="wait"` guarantees the previous renderer fully unmounts (and runs its cleanup) before the next one mounts — prevents two WebGL contexts overlapping.

---

## 4. Performance & Cleanup

Every project **must** clean up. The registry contract is: "if you allocate it, you free it on unmount."

### 4.1 Three.js / `@react-three/fiber`

- R3F's declarative tree auto-disposes **only** objects created via JSX with an `attach` prop (e.g. `<meshStandardMaterial attach="material" />`). Objects created imperatively via `useMemo(() => new THREE.X(...))` or `useRef` are **not** auto-disposed — you must dispose them in a `useEffect` cleanup.
- For **manually constructed** objects (e.g. recursion-generated meshes pushed into a ref), traverse on unmount:

```ts
useEffect(() => {
  return () => {
    rootGroup.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  };
}, []);
```

- Textures, render targets, and custom `ShaderMaterial`s must be `.dispose()`d.
- If using drei's `<OrbitControls>` declaratively, R3F handles disposal. If you ever instantiate `new OrbitControls(...)` manually, call `.dispose()` on unmount to remove its DOM listeners.
- Use `gl={{ powerPreference: 'high-performance', antialias: true }}` and a single `<Canvas>` per project.

### 4.2 p5.js (instance mode)

Always use the **two-argument constructor** so the canvas is parented immediately:

```tsx
useEffect(() => {
  const sketch = (p: p5) => {
    p.setup = () => {
      p.createCanvas(width, height);
      p.pixelDensity(Math.min(window.devicePixelRatio, 2));
    };
    p.draw = () => { /* ... */ };
  };
  const instance = new p5(sketch, hostRef.current!);
  return () => instance.remove(); // critical — frees canvas + RAF
}, []);

// Handle resize separately so we don't teardown the whole sketch:
useEffect(() => {
  if (instanceRef.current) {
    instanceRef.current.resizeCanvas(width, height);
  }
}, [width, height]);
```

`remove()` cancels the draw loop, removes the DOM canvas, and releases the WebGL context. Skipping it is the #1 source of leaks.

### 4.3 Vanilla canvas

- Cancel `requestAnimationFrame` handles in cleanup.
- Detach all `addEventListener` calls (`window`, `canvas`, `ResizeObserver`).

### 4.4 Cross-cutting

- **`width` / `height` are CSS pixels.** The `RenderStage` wraps its container in a `ResizeObserver` and passes `width` / `height` (CSS px, not device px) as props. Each renderer applies its own DPR scaling internally (R3F via `dpr`, p5 via `pixelDensity`, canvas via `canvas.width = css * dpr`).
- **ResizeObserver is debounced** at ~100ms (one `requestAnimationFrame` guard) to avoid thrashing p5 `resizeCanvas` during a desktop window drag.
- **Transition sizing:** during an `AnimatePresence mode="wait"` cross-fade the outgoing project keeps its last `width` / `height` frozen — the exiting `motion.div` is `position: absolute` and detached from flow so it doesn't receive `0×0`.
- Lazy-load every renderer chunk (already enforced by the registry).
- A dev-only FPS meter writes into `useUIStore` for the spec footer.

---

## 5. First Module — `BismuthSimulator`

Location: `src/projects/bismuth/index.tsx`

### 5.1 Concept

Bismuth crystals form **hopper geometry**: nested, stepped rectangular shells where crystal faces grow faster at the edges than the centre, producing a staircase of progressively smaller frames. Model this as a **branching** recursive function: at each level, up to `branchCount` children spawn on random edges/corners of the parent frame, each scaled down and rotated.

### 5.2 Generator (sketch)

```ts
// src/projects/bismuth/geometry.ts
import * as THREE from 'three';

export interface StepParams {
  size: number;
  depth: number;
  shrink: number;       // 0..1, child scale relative to parent
  rotation: number;     // radians, accumulated twist
  maxDepth: number;
  branchCount: number;  // children per level (2–4 for organic look)
}

/**
 * Recursively builds a bismuth crystal group.
 * Uses BoxGeometry as a **frame** (thin shell) — not a solid cube.
 * Material is attached by the caller so one ShaderMaterial is shared.
 */
export function buildBismuth(params: StepParams): THREE.Group {
  const group = new THREE.Group();
  if (params.depth > params.maxDepth || params.size < 0.05) return group;

  // Thin frame (hopper-style) — tall edges, shallow face
  const geo = new THREE.BoxGeometry(params.size, params.size * 0.12, params.size);
  const mesh = new THREE.Mesh(geo); // material set by caller
  mesh.rotation.y = params.rotation;
  mesh.position.y = params.depth * params.size * 0.15;
  group.add(mesh);

  // Branch: spawn multiple children at offset positions
  const angleStep = (Math.PI * 2) / params.branchCount;
  for (let i = 0; i < params.branchCount; i++) {
    const child = buildBismuth({
      ...params,
      size: params.size * params.shrink,
      depth: params.depth + 1,
      rotation: params.rotation + angleStep * i + Math.PI / 12,
    });
    const offset = params.size * 0.3;
    child.position.set(
      Math.cos(angleStep * i) * offset,
      0,
      Math.sin(angleStep * i) * offset,
    );
    group.add(child);
  }

  return group;
}
```

The caller iterates the returned group and assigns a single shared `IridescentMaterial` (§5.3) to every mesh. **One material, many geometries** — on cleanup, traverse to dispose each geometry, then dispose the material once.

### 5.3 Iridescent shader (simple)

A thin-film-style fresnel shimmer, no textures required.

```glsl
// vertex
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
```

```glsl
// fragment
varying vec3 vN;
varying vec3 vV;
uniform float uTime;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t));
}

void main() {
  float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);
  vec3 col = spectrum(fres + uTime * 0.05);
  gl_FragColor = vec4(col * (0.3 + 0.7 * fres), 1.0);
}
```

Wrap in a `THREE.ShaderMaterial` with `uniforms = { uTime: { value: 0 } }`; advance `uTime` each frame via `useFrame`. Dispose the material on unmount.

### 5.4 Component shape

The module default-exports the **component only**. `meta` lives in the registry (§2.2).

```tsx
// src/projects/bismuth/index.tsx
import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import { buildBismuth } from './geometry';
import vertexShader from './shaders/iridescent.vert.glsl?raw';
import fragmentShader from './shaders/iridescent.frag.glsl?raw';

const Scene: React.FC<{ width: number }> = ({ width }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const maxDepth = width < 480 ? 4 : 6;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 } },
      }),
    [],
  );

  useEffect(() => {
    const group = buildBismuth({
      size: 2,
      depth: 0,
      shrink: 0.72,
      rotation: 0,
      maxDepth,
      branchCount: 3,
    });
    // Assign shared material
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) (obj as THREE.Mesh).material = material;
    });
    groupRef.current.add(group);

    return () => {
      // Dispose geometries (one per mesh), then the single shared material
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) (obj as THREE.Mesh).geometry.dispose();
      });
      material.dispose();
      groupRef.current?.remove(group);
    };
  }, [maxDepth, material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  return <group ref={groupRef} />;
};

const BismuthSimulator: React.FC<ProjectComponentProps> = ({ width, height }) => (
  <Canvas
    style={{ width, height }}
    camera={{ position: [0, 2, width < 480 ? 5 : 4], fov: 45 }}
    gl={{ antialias: true, powerPreference: 'high-performance' }}
    dpr={[1, Math.min(window.devicePixelRatio, 2)]}
  >
    <ambientLight intensity={0.2} />
    <Scene width={width} />
    <OrbitControls enablePan={false} />
  </Canvas>
);

export default BismuthSimulator;
```

---

## 6. Project Layout

```
project-bismuth/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ src/
   ├─ main.tsx               ← mounts <RouterProvider>
   ├─ router.ts               ← imperative route tree + type registration
   ├─ AppShell.tsx             ← <Sidebar> + <Outlet>
   ├─ views/
   │  ├─ LandingView.tsx       ← project grid / index
   │  ├─ ProjectView.tsx       ← reads $projectId, renders <RenderStage>
   │  └─ NotFoundView.tsx      ← shown for unknown projectId
   ├─ components/
   │  ├─ Sidebar.tsx
   │  ├─ RenderStage.tsx
   │  ├─ SpecFooter.tsx
   │  └─ StageLoader.tsx
   ├─ state/
   │  └─ uiStore.ts
   ├─ types/
   │  └─ project.ts
   ├─ projects/
   │  ├─ projectRegistry.ts
   │  └─ bismuth/
   │     ├─ index.tsx          ← default-exports BismuthSimulator component
   │     ├─ geometry.ts
   │     └─ shaders/
   │        ├─ iridescent.vert.glsl
   │        └─ iridescent.frag.glsl
   └─ styles/
      └─ globals.css           ← :root CSS custom properties (§1 tokens)
```

**GLSL imports:** use Vite's built-in `?raw` suffix (`import vert from './shaders/iridescent.vert.glsl?raw'`). No plugin needed.

## 7. Dependencies

```jsonc
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@tanstack/react-router": "^1",
    "zustand": "^4",
    "framer-motion": "^11",
    "three": "^0.165",
    "@react-three/fiber": "^8",
    "@react-three/drei": "^9",
    "p5": "^1"
  },
  "devDependencies": {
    "vite": "^5",
    "typescript": "^5",
    "@types/three": "^0.165",
    "@types/p5": "^1"
  }
}
```

> `@tanstack/router-vite-plugin` is **not** used — routes are defined imperatively (§3.1).

### 7.1 Bundle budgets

| Chunk | Target (gzipped) |
|---|---|
| Shell (main + router + zustand + framer-motion + React) | ≤ 120 kB |
| Any single project chunk (e.g. bismuth + three.js) | ≤ 250 kB |

> **Note:** React 18 (~44 kB gz) + TanStack Router (~17 kB gz) + Framer Motion (~22 kB gz) + Zustand (~3 kB gz) account for ~86 kB gz of the shell budget by themselves. The 120 kB target leaves ~34 kB gz for app code. Project renderer deps (three.js, p5.js) must **never** appear in the shell chunk — they are lazy-loaded inside project modules only.

Verify with `vite build && npx vite-bundle-visualizer`.

## 8. Acceptance Criteria

### Functional
- [ ] `/projects/bismuth` deep-link loads the Bismuth scene directly.
- [ ] `/projects/nonexistent` renders `<NotFoundView>` with a link back to `/`.
- [ ] Switching from `bismuth` to a hypothetical p5 project cross-fades, and the previous WebGL context is fully released (verify via `chrome://gpu` or DevTools Memory).
- [ ] Adding a new project requires editing **only** `projectRegistry.ts` and creating one folder under `src/projects/`.

### Performance
- [ ] Each project ships as its own JS chunk (verify in `vite build` output).
- [ ] Shell chunk ≤ 120 kB gzip; any project chunk ≤ 250 kB gzip.
- [ ] No console warnings about disposed contexts, leaked listeners, or duplicate canvases when navigating rapidly between projects.

### Mobile & responsive
- [ ] Renders at **360×640** with no horizontal scroll, sidebar reachable and dismissable, all controls ≥ 44×44px.
- [ ] No layout shift when the mobile URL bar shows/hides (uses `dvh`).
- [ ] Lighthouse **mobile** performance ≥ 80 on `/projects/bismuth`.

### Accessibility
- [ ] All text meets **WCAG AA** contrast (≥ 4.5:1 for normal text, ≥ 3:1 for large text) against `#0a0a0a`.
- [ ] Focus ring (`--color-focus-ring`) is visible on every interactive element via keyboard navigation.
- [ ] `prefers-reduced-motion` disables cross-fade scale and reduces shader animation rate.
- [ ] Sidebar overlay is dismissable via Esc key and backdrop tap.
