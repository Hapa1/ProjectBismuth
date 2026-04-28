# Slide deck spec

The home page at `/` is a vertical scroll-snap slideshow authored as MDX. This
document is the contract for adding, ordering, and styling slides.

If anything in this file disagrees with [`SPEC.md`](./SPEC.md) or
[`.github/copilot-instructions.md`](../.github/copilot-instructions.md), those
documents win.

---

## 1. Architecture

```
src/
  slides/
    types.ts              SlideMeta + SlideRegistryEntry
    registry.ts           Single source of truth for slide order
    mdxComponents.ts      Maps <Demo>, <Overlay>, <Title>, <Eyebrow>, <Body>
    content/
      01-opening.mdx      One file per slide
      02-...mdx
  components/
    slides/
      SlideContext.ts     useSlideContext() → { id, isActive }
      SlideShell.tsx      100dvh, scroll-snap, exposes isActive via context
      SlideDemo.tsx       Full-bleed live project; mounts only when active
      SlideOverlay.tsx    Glass text panel with position variants
      SlideText.tsx       <Title>, <Eyebrow>, <Body>
  views/
    SlideshowView.tsx     The deck container (rendered at /)
```

### Non-negotiable rules

- **Registry is the single source of truth for order.** Add a slide by
  appending an entry to [`src/slides/registry.ts`](../src/slides/registry.ts).
  Filename order is irrelevant.
- **One MDX file per slide.** It must `export const meta = { id, title, theme? }`
  and default-export the MDX component.
- **Lazy-load every slide** via `() => import('./content/<file>.mdx')`.
- **`SlideDemo` mounts at most one project at a time.** It only mounts when
  the slide is the active one (intersection ≥ 60%) and unmounts on exit. Do
  not work around this — multiple WebGL/p5 contexts will crash on mobile.
- **`SlideOverlay` wrapper is `pointer-events: none`.** Only the inner glass
  panel and explicit interactive descendants capture pointer events. This is
  what lets `OrbitControls` underneath keep responding to drags.

## 2. Slide variants

Slides are MDX, so any layout is possible, but use these three patterns first.

### Pattern A — Title slide over a calm demo

```mdx
export const meta = { id: 'opening', title: 'The Geometry Beneath Everything' };

<Demo projectId="prismata" />

<Overlay position="bottom-left">
  <Eyebrow>Math In Nature</Eyebrow>
  <Title>The Geometry Beneath Everything</Title>
  <Body>Why nature, art, and ancient cultures keep drawing the same shapes.</Body>
</Overlay>
```

### Pattern B — Concept slide with a thematic demo

```mdx
export const meta = { id: 'tiling', title: 'Symmetry and Tiling' };

<Demo projectId="voronoi" />

<Overlay position="bottom-right">
  <Eyebrow>Pillar 3</Eyebrow>
  <Title>Symmetry & Tiling</Title>
  <Body>
    Honeycombs, snowflakes, mandalas. When space has to be packed efficiently,
    only a small handful of shapes do the job well — and those are the same
    shapes that show up in sacred art.
  </Body>
</Overlay>
```

### Pattern C — Text-only slide

For slides with no demo, omit `<Demo>`. The slide's solid background colour
shows through. Centre the overlay for a deck feel:

```mdx
export const meta = { id: 'practical', title: 'Why this is practical' };

<Overlay position="center">
  <Title>Why this matters</Title>
  <Body>
    The geometry that makes a cathedral feel balanced is the geometry an
    engineer uses today to design a stronger bridge or a better antenna.
  </Body>
</Overlay>
```

## 3. The MDX component contract

Authors use these components by name (no imports needed — they are wired
into MDXProvider in `SlideshowView`):

| Component  | Props | Purpose |
|---|---|---|
| `<Demo projectId="…" />` | `projectId: string` (must exist in `projectRegistry`); optional `unmountWhenInactive` (default `true`); optional `scrim` (default `true`). | Full-bleed live project background. |
| `<Overlay position="…">` | `position`: `'center' \| 'top' \| 'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` (default `'bottom-left'`). | Glass text panel. |
| `<Title>…</Title>` | children | Headline typography. |
| `<Eyebrow>…</Eyebrow>` | children | Small accent label above the title. |
| `<Body>…</Body>` | children | Paragraph copy. |

Per slide:

- **Use at most one `<Demo>`.** Mounting two project demos in one slide
  doubles the WebGL context cost.
- **Use at most one `<Overlay>` per visible region** unless you have a
  specific reason. Two glass panels usually fight each other.

## 4. Slide ordering

Order is whatever order entries appear in the
[`slideRegistry`](../src/slides/registry.ts) array. The numeric prefixes on
filenames (`01-`, `02-`, …) are organisational only — the registry decides
order. To reorder slides, move entries; do not rename files.

## 5. Demo selection guide

Map slide pillars to projects so demo choice is consistent across the deck:

| Pillar | Recommended demo | Fallback |
|---|---|---|
| Opening / hero | `prismata` | `bismuth` |
| Repetition across scale (fractals) | `bismuth` | `prismata` |
| Growth and proportion (spirals) | `luminal` | `apex` |
| Symmetry and tiling | `voronoi` | `lattice` |
| Waves and resonance | `lattice` | `io` |
| Emergence (optional) | `expanse` | — |
| Closing / cosmos | `moonlight` | `expanse` |

These are suggestions, not rules. Any project in
[`projectRegistry`](../src/projects/projectRegistry.ts) is valid.

## 6. Navigation behaviour (already implemented)

Authors should not need to touch any of this, but they should know it:

- **Vertical scroll-snap** (`scroll-snap-type: y mandatory`).
- **Keyboard:** ArrowDown / PageDown advance; ArrowUp / PageUp go back;
  Home / End jump to first / last.
- **Active slide tracker** uses `IntersectionObserver` at threshold 0.6.
- **Right-rail dot indicator** for direct jumps.
- **Reduced motion:** smooth scroll becomes instant; demo fade-in still
  applies but transitions shrink to 0 ms.
- **Mobile:** floating `☰` button in the top-left opens the sidebar.

## 7. Performance budget

- Slide MDX chunks should remain trivial (< 5 kB gz each). If a single MDX
  file balloons past that, you are probably embedding logic that belongs in a
  shared component.
- The shell budget from [`SPEC.md`](./SPEC.md) §7 still applies. Adding MDX
  did not change it.
- Demo chunk budgets are unchanged — still ≤ 250 kB gz each. Demos are still
  loaded only when their slide becomes active.

## 8. Acceptance checklist for a new slide

Before opening the PR:

- [ ] New file under `src/slides/content/<NN>-<slug>.mdx` with `export const meta = { id, title }`.
- [ ] Entry appended (or moved) in `src/slides/registry.ts` at the desired position.
- [ ] `id` is unique across the registry and matches `^[a-z0-9-]+$`.
- [ ] At most one `<Demo>` per slide.
- [ ] If a `<Demo>` is used, `projectId` matches an entry in `projectRegistry`.
- [ ] Overlay text is legible at 360 × 640 (no overflow, no `vw` widths).
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes; new MDX chunk is < 5 kB gz.
- [ ] Manual scroll test: arrow keys, page keys, and Home/End all navigate
      cleanly; only one WebGL context is live at a time.
