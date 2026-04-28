---
mode: agent
description: Add a new slide to the home-page slideshow at /. Creates an MDX file under src/slides/content/ and appends to the slide registry.
---

# Add a slide

Use this prompt to add a new slide to the deck rendered at `/`.

Before writing code, read:

- [`docs/slides.md`](../../docs/slides.md) — slide deck spec (the contract).
- [`docs/Presentation.md`](../../docs/Presentation.md) — narrative source for
  speaker copy and pillar mapping.
- [`src/slides/registry.ts`](../../src/slides/registry.ts) — current slide order.
- [`src/slides/content/01-opening.mdx`](../../src/slides/content/01-opening.mdx) — reference slide.
- [`src/projects/projectRegistry.ts`](../../src/projects/projectRegistry.ts) — valid `projectId`s for `<Demo>`.

## Inputs to gather (ask the user if not supplied)

1. **`id`** — kebab-case slug matching `^[a-z0-9-]+$`. Must be unique across
   `slideRegistry`.
2. **`title`** — short title for the slide (used in `aria-label` and the dot
   indicator's tooltip; not necessarily the visible headline).
3. **Position in the deck** — insert at the end (default), or between two
   existing slides (specify which).
4. **Pillar / topic** — opening, scale, proportion, tiling, resonance,
   emergence, practical, closing, or freeform. Used to pick a demo.
5. **Demo (optional)** — a `projectId` from `projectRegistry`, or none for a
   text-only slide. Default by pillar (see [`docs/slides.md`](../../docs/slides.md) §5).
6. **Overlay copy** — eyebrow (one line), title (one line), body (1–3 sentences).
7. **Overlay position** — one of `center`, `top`, `top-left`, `top-right`,
   `bottom-left`, `bottom-right`. Default `bottom-left`.

If the user does not supply (4)–(7), draft them from the matching pillar in
[`docs/Presentation.md`](../../docs/Presentation.md) and confirm before
writing files.

## Required output

Create or modify exactly these files. Touch nothing else.

### 1. `src/slides/content/<NN>-<id>.mdx`

`<NN>` is a two-digit prefix matching the slide's intended position. Order is
ultimately controlled by the registry — the prefix is organisational only.

Template — pattern A (title over a demo):

```mdx
export const meta = {
  id: '<id>',
  title: '<title>',
};

<Demo projectId="<projectId>" />

<Overlay position="<position>">
  <Eyebrow><eyebrow></Eyebrow>
  <Title><headline></Title>
  <Body><1–3 sentences></Body>
</Overlay>
```

Template — pattern C (text-only):

```mdx
export const meta = {
  id: '<id>',
  title: '<title>',
};

<Overlay position="center">
  <Title><headline></Title>
  <Body><1–3 sentences></Body>
</Overlay>
```

Rules:

- Do **not** import `Demo`, `Overlay`, `Title`, `Eyebrow`, or `Body`. They
  come from `MDXProvider` and are globally available inside slide MDX files.
- At most **one `<Demo>`** per slide.
- `projectId` **must** exist in [`src/projects/projectRegistry.ts`](../../src/projects/projectRegistry.ts).
  If unsure, list the registry and ask.
- Body copy mirrors the speaker line / takeaway from
  [`docs/Presentation.md`](../../docs/Presentation.md). Keep it short — 1 to
  3 sentences.

### 2. Append (or insert) into `src/slides/registry.ts`

```ts
{
  meta: { id: '<id>', title: '<title>' },
  load: () => import('./content/<NN>-<id>.mdx'),
},
```

Place it at the user-specified position. Do not reorder existing entries
unless explicitly asked.

## What NOT to do

- ❌ Do not put `meta` only in the MDX file — it must also live in the
  registry entry. Both must agree.
- ❌ Do not embed two `<Demo>` components in one slide.
- ❌ Do not import a project component directly. Use `<Demo projectId="…" />`
  so it goes through the lazy-loading + active-slide gating in `SlideDemo`.
- ❌ Do not add per-slide CSS modules. Style via the existing
  `SlideOverlay` / `SlideText` primitives. If a one-off layout is genuinely
  required, add it as a new component under `src/components/slides/` first,
  then use it from the MDX.
- ❌ Do not add window resize listeners or DOM size queries inside MDX.
- ❌ Do not change `SlideshowView`, `SlideShell`, `SlideDemo`, or
  `SlideOverlay` to accommodate one slide. If a feature is needed deck-wide,
  call that out and update [`docs/slides.md`](../../docs/slides.md) in the same change.

## Acceptance

After writing the files:

1. Run `npm run typecheck`. It must pass.
2. Run `npm run build`. It must pass and the new MDX chunk must be < 5 kB gz.
3. Open `/` and verify:
   - The new slide appears at the requested position.
   - Scroll-snap, ArrowDown/Up, PageDown/Up, Home, End all reach it.
   - The dot indicator on the right rail includes a dot for it.
   - If the slide has a `<Demo>`, the project mounts when the slide becomes
     active and unmounts when it leaves.
   - At 360 × 640 the overlay copy is readable with no horizontal scroll.

Report the new file path, the registry diff, and the build chunk size for
the slide.
