# Geometry Beneath Everything — Project Spec

**Project id:** `geometry-beneath`
**Renderer:** `p5`
**Route:** `/projects/geometry-beneath`
**Companion to:** [`docs/Presentation.md`](../Presentation.md)

---

## 1. Purpose

This project is the **live visual aid** for the *Geometry Beneath Everything* talk. It is not a separate
art piece with its own thesis. Its job is to make the three pillars of the talk feel obvious in real
time, while the speaker is talking.

The talk argues that ancient cultures and modern science kept noticing the same shapes because the
world keeps producing the same solutions. The three pillars are:

1. **Repetition across scale** — fractals (trees, rivers, lungs, lightning).
2. **Growth and proportion** — spirals and the golden ratio (sunflowers, shells, galaxies).
3. **Symmetry and tiling** — how space packs itself (honeycomb, snowflakes, crystals, cells).

This project gives each pillar a single, recognizable, interactive visualization. The speaker can
switch modes during slide 3, slide 4, and slide 5 of the deck without leaving the page.

---

## 2. Tone rules (inherited from the talk)

These constraints live in [`docs/Presentation.md`](../Presentation.md) and they apply here too:

- **Not mystical.** No "sacred energy" overlays, no mandalas, no glow-pulse halos that suggest a
  metaphysical claim.
- **Not academic.** No labels like "logarithmic spiral," "Voronoi tessellation," or "L-system." Use
  plain language: *branching*, *spiral*, *packing*.
- **No forced one-to-one symbol pairing.** A pillar is a pillar. We do not overlay the Flower of Life
  onto the spiral mode to "prove" something. Sacred symbols are addressed in the slide deck, not in
  this visualization.

The visualization should look like a **clean technical diagram** — confident, calm, and concrete.

---

## 3. Modes (the three pillars)

The project has exactly **three modes**, selectable from a single dropdown at the top of the control
panel. Each mode has its own slider set. Switching modes resets the canvas.

### 3.1 `branching` — Repetition across scale

Renders a recursive branching tree from a trunk at the bottom-center of the canvas.

Sliders:
- **Depth** (1–10): recursion depth.
- **Branch angle** (10°–60°): half-angle each split spreads to.
- **Length ratio** (0.50–0.85): child length = parent length × ratio.
- **Branches per node** (2–4): how many children at each split.
- **Jitter** (0–0.5): per-branch random angle offset, so the tree is not perfectly symmetric.

Visual:
- White-on-near-black. Stroke weight tapers with depth so finer twigs look thinner than the trunk.
- No leaves, no color gradients. The point is the **structure**, not the foliage.

Why it works for the talk:
- Zooming in on a single branch produces something that looks like the whole tree.
- The same recipe drives rivers, lungs, lightning, coastlines.

### 3.2 `spiral` — Growth and proportion

Renders a phyllotaxis pattern (sunflower seed packing) using the golden angle.

Sliders:
- **Seed count** (50–2000): total dots placed.
- **Angle** (130°–145°, step 0.1°): rotation per seed. Default `137.5°`. Sliding it shows that any
  other value collapses into visible spokes — the golden angle is what produces uniform packing.
- **Scale** (1–14): `c` constant in `r = c * sqrt(n)`.
- **Dot size** (1–8): radius of each seed dot.

Visual:
- White dots on near-black background. No connecting curves, no spiral overlays.
- Centered on canvas; clamps to the smaller axis so it never overflows on portrait viewports.

Why it works for the talk:
- Sliding the angle off `137.5°` immediately produces ugly radial gaps. Sliding it back snaps into
  the familiar sunflower pattern. The audience sees *why* nature settled here.

### 3.3 `tiling` — Symmetry and tiling

Renders a hexagonal grid that fills the canvas, optionally with jitter and edge highlighting so it
reads as honeycomb / cracked-mud / cell tissue.

Sliders:
- **Cell size** (12–80 px): hex circumradius.
- **Jitter** (0–0.4): per-cell vertex displacement (0 = perfect honeycomb; higher = giraffe spots /
  dried mud / soap-bubble film).
- **Edge highlight** (0–1): alpha of the bright edge stroke.
- **Fill brightness** (0–60): grayscale fill brightness, so the speaker can dim cells until only the
  edge network is visible.

Visual:
- Hexagons only. No squares, no triangles, no Voronoi-from-points (that is a separate project,
  `voronoi`).
- The edge color is the same accent used elsewhere in the shell (`#a78bfa`) at low alpha, so the
  tiling reads as a cool, calm grid rather than a warning pattern.

Why it works for the talk:
- Honeycombs, dried mud, snowflake symmetry, and cell tissue are all in this category.
- Jitter slider connects the regular hex case to the irregular natural case in one motion.

---

## 4. Layout & UX

The project follows the shell rules in [`docs/SPEC.md`](../SPEC.md). Specifically:

- It accepts `{ width, height }` props in CSS pixels and never queries the DOM for size.
- Sketch is `p5` instance mode, two-arg constructor, `instance.remove()` on unmount, `resizeCanvas`
  on size change.
- Pixel density is clamped: `p.pixelDensity(Math.min(window.devicePixelRatio, 2))`.

Control panel:
- Bottom drawer on mobile (`max-height: 48dvh`, scrollable).
- Right rail at `>= 768px` (`width: min(18.5rem, 36vw)`).
- All interactive elements ≥ 44×44px.
- Mode dropdown at the top, then a section per slider group, then a **Randomize** button and a
  **Reset** button.

Determinism:
- The branching tree uses a seeded RNG. **Randomize** generates a new seed string and stores it in
  the controls; **Reset** restores the default seed and slider values for the active mode.
- The spiral and tiling modes are deterministic given their slider values, so they do not need a
  seed — but tiling jitter is also seeded so the same configuration is reproducible.

Performance budgets (per shell rules):
- Project chunk ≤ 250 kB gz. p5 is the only heavy dependency and is shared with the `expanse` and
  `wfc` chunks via Vite's automatic chunk-splitting of dynamic imports.
- Branching depth caps at 10. With 4 branches per node that is `4^10 ≈ 1M` segments — too many — so
  the renderer enforces a *segment cap* of 60,000 and stops descending early if the cap is reached.
  The cap value is shown in the panel only when it has been hit, so the speaker knows.

---

## 5. Cleanup checklist (per shell rules §4)

- p5 instance is created in a `useEffect` and `instance.remove()` is called in cleanup.
- No window-level resize listeners. Resize is driven by the `width` / `height` prop pair.
- No `setInterval` / `setTimeout` loops. The p5 draw loop is the only timer.
- Mode switches re-seed the sketch but do not destroy the p5 instance.

---

## 6. Acceptance criteria

A change to this project is acceptable when **all** of the following hold:

1. `/projects/geometry-beneath` loads, renders the branching tree by default, and does not throw.
2. Switching to `spiral` and back does not leak a canvas or duplicate the p5 instance (verifiable in
   DevTools → Elements: only one `<canvas>` under the project root at any time).
3. On a 360×640 viewport: the canvas fills the viewport, the control panel is reachable as a bottom
   drawer, and there is no horizontal scroll.
4. Sliding the spiral **Angle** away from `137.5°` and back visibly demonstrates the difference. (No
   automated test — this is the demo's whole point and must work by eye.)
5. The branching mode never freezes the page even at depth 10 with 4 children — segment cap kicks in.
6. Project chunk weighs ≤ 250 kB gz on `npm run build`.

---

## 7. Out of scope

Things that are **explicitly not** part of this project, even though they are tempting:

- L-systems beyond the branching tree (Penrose tiling, Sierpinski, Koch). Those belong in their own
  projects if we want them.
- Voronoi cells from random seed points. That is the separate `voronoi` project.
- Sacred-symbol overlays (Flower of Life, vesica piscis, mandalas). Those live in slides 2 and 6 of
  the deck, not on the canvas.
- Audio reactivity. The talk is the audio.
- 3D. Every pillar in this talk reads better in 2D.

---

## 8. Open questions

- Should the **Reset** button also reset the *mode* to `branching`, or only the sliders for the
  current mode? Current implementation: sliders only. Mode is preserved.
- Should there be a "play" mode that auto-cycles through the three pillars on a timer for use as
  ambient background during slides 1–2? Not implemented. If desired, add it as a top-level toggle
  (`auto-cycle: off / 8s / 15s`) without changing the mode list.
