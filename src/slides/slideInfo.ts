import type { ExhibitInfo } from '../types/project';

/**
 * Long-form context per slide, surfaced by the "(i)" info button next to the
 * slide title in [../views/SlideshowView.tsx](../views/SlideshowView.tsx).
 *
 * Keys must match `SlideMeta.id` in either the original deck registry
 * ([./registry.ts](./registry.ts)) or the V2 deck
 * ([./v2/registry.ts](./v2/registry.ts)).
 *
 * Sections are rendered as paragraphs; blank lines separate paragraphs.
 */
export const slideInfo: Record<string, ExhibitInfo> = {
  // ── V2 deck — "Visualizing Math, Sacred Geometry, and Art with Code" ──

  'v2-title': {
    significance: `This talk argues that geometry isn't decoration — it's the substrate. The same handful of patterns (branching, spirals, tilings, fractals) recur across nature, architecture, art, and code, and you can write small programs that put them on a screen in a way no static image quite manages.

Title slides set expectations. The promise here is concrete: by the end you'll know how to point a model and a few lines of code at a phenomenon you find beautiful, and have it render itself.`,
    science: `"Creative coding" as a field crystallised around two open-source projects: Processing (Casey Reas & Ben Fry, MIT Media Lab, 2001) and openFrameworks (Zach Lieberman, 2005). Both reframed programming as a sketchbook activity — short loops, immediate visual feedback, low ceremony.

The web absorbed that lineage through p5.js (Lauren McCarthy, 2014) and three.js (Ricardo Cabello, 2010), which is why every exhibit in this site runs in a browser tab.`,
    practice: `Creative-coding tools now drive concert visuals (Aphex Twin, Squarepusher), live coding performances (TOPLAP / Sonic Pi), data-journalism graphics (NYT, Bloomberg), and the entire generative-NFT category (Art Blocks, fxhash). The skills also transfer cleanly to game dev, motion graphics, and UI animation.`,
    references: [
      { label: 'Processing', url: 'https://processing.org/' },
      { label: 'p5.js', url: 'https://p5js.org/' },
      { label: 'three.js', url: 'https://threejs.org/' },
    ],
  },

  'v2-creative-coding': {
    significance: `"Generative art in the wild" is the survey slide — a reminder that code-driven imagery is mainstream now. From the title sequence of *Westworld* to the album covers of Aphex Twin to the rooftops of *Townscaper*, generative systems are an everyday medium.

What changed isn't the math (most of it is decades or centuries old). What changed is access: a phone in your pocket can run a fragment shader at 120 fps.`,
    science: `Generative art is any system where the artist defines a process and the artwork is its output. The category is older than computers — Sol LeWitt's wall instructions (1968) and Brion Gysin's permutation poems are generative — but computation made the process tractable at any scale.

Modern generative pipelines tend to combine: pseudo-random number generators (Mersenne Twister, PCG); noise functions (Perlin 1985, Simplex 2001, Worley 1996); shaders (GLSL fragment programs running per-pixel on the GPU); and constraint solvers (Wave Function Collapse, SAT-based level generators).`,
    practice: `Working artists / studios you can study: Casey Reas, Tyler Hobbs, Refik Anadol, teamLab, Onformative, Field.io, Memo Akten, Anders Hoff (inconvergent), Manolo Gamboa Naon, Zach Lieberman, Sougwen Chung, Joshua Davis. Their writeups are some of the best teaching material on the web.`,
    references: [
      { label: 'Tyler Hobbs — Essays', url: 'https://tylerxhobbs.com/essays' },
      { label: 'Casey Reas — Process Compendium', url: 'https://reas.com/' },
      { label: 'Inigo Quilez — articles', url: 'https://iquilezles.org/articles/' },
    ],
  },

  'v2-big-idea': {
    significance: `"Prompted, not coded" names what's actually new in 2024-2026: the bottleneck for visual programming has shifted from syntax to *intent*. The hard part used to be remembering the API for a noise function or a transformation matrix. Now an LLM remembers; what you bring is taste and a clear description.

This isn't a claim that code goes away — quite the opposite. The code is shorter, more legible, and more honest about *what* it's doing because the *how* is delegated.`,
    science: `Large language models are next-token predictors trained on enormous text corpora — including most of GitHub. When you ask one for a Perlin-noise terrain, it isn't reasoning about gradient noise from first principles; it's producing the statistically most-likely continuation of "give me a Perlin-noise terrain shader," which happens to be a working program because that program appears thousands of times in its training data.

The 2017 "Attention Is All You Need" paper (Vaswani et al.) introduced the transformer architecture that made all of this practical.`,
    practice: `In studio practice today, "prompted not coded" looks like: sketching a concept in plain English; iterating on a small program with an AI pair; reading and editing the diff yourself; running it; tweaking parameters by hand once the structure is right. The model writes the boilerplate; the human owns the aesthetic decisions and the verification.`,
    references: [
      { label: 'Vaswani et al. 2017 — Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' },
    ],
  },

  'v2-fractals': {
    significance: `Fractals are the original "tiny rules, infinite complexity" demonstration. Benoît Mandelbrot's 1975 coinage of the word — and his 1982 book *The Fractal Geometry of Nature* — gave us the language to describe coastlines, mountains, broccoli, and lungs as the *same kind of object*: shapes that look statistically similar at every scale.

The visual punch of a Mandelbrot zoom is that you can keep zooming. There's no bottom. That's not a bug of the visualisation; it's the definition of the set.`,
    science: `**The Mandelbrot set** (Mandelbrot 1980, building on Fatou & Julia, 1918) is the set of complex numbers c for which the iteration z₀ = 0, zₙ₊₁ = zₙ² + c does not escape to infinity. The cardioid-and-bulbs shape is what you get when you colour the plane by how quickly each point escapes.

**The Sierpinski triangle** (Wacław Sierpiński, 1915) is built either by removing the middle triangle of an equilateral triangle and recursing, or by the chaos game: pick a random vertex, jump halfway, repeat — the points trace the fractal.

**Fractal trees** are L-systems (Aristid Lindenmayer 1968): start with "F", rewrite "F" → "F[+F]F[-F]F", recurse. The strings are turned into turtle-graphics drawings.

**Tiling fractals** (Penrose 1974, Koch snowflakes 1904) are non-periodic or self-similar tilings that fill the plane without ever repeating.`,
    practice: `Fractal compression powered the Microsoft Encarta CD encyclopaedia. Antenna engineers use fractal shapes (Sierpinski-triangle gaskets) to fit multi-band antennas in cell phones. Hollywood mountain ranges (the *Genesis* sequence in *Star Trek II*, 1982 — the first fractal in a feature film) are diamond-square fractals. Every modern fluid sim, cloud renderer, and terrain generator uses fractal noise (FBM — fractal Brownian motion).`,
    references: [
      { label: 'Mandelbrot 1982 — The Fractal Geometry of Nature', url: 'https://archive.org/details/fractalgeometryo00beno' },
      { label: 'Inigo Quilez — Mandelbrot smooth iteration', url: 'https://iquilezles.org/articles/msetsmooth/' },
      { label: 'Aristid Lindenmayer 1968 — Mathematical models for cellular interactions', url: 'https://www.sciencedirect.com/science/article/pii/0022519368900799' },
    ],
  },

  'v2-sacred-geometry': {
    significance: `"Sacred geometry" is the umbrella term for a 2,500-year tradition that holds geometric proportion to be a kind of moral or spiritual fact. Pythagoras (c. 500 BCE), Plato's *Timaeus*, the medieval cathedral builders, Renaissance painters (Leonardo, Dürer), Sufi tile-makers, Hindu *yantras*, Tibetan *mandalas* — all working from the premise that some shapes are *right*.

You don't have to share the metaphysics to feel the pull of the constructions. The Flower of Life, the vesica piscis, the Platonic solids show up everywhere because they're stable attractors of the human eye.`,
    science: `These constructions belong to Euclidean geometry — straightedge-and-compass only — set out in Euclid's *Elements* (c. 300 BCE). Each step is a real proof: "to bisect a line, draw two arcs of equal radius from its endpoints; the bisector passes through their intersections."

The Platonic solids (tetrahedron, cube, octahedron, dodecahedron, icosahedron) are the only convex polyhedra whose faces are all the same regular polygon and whose vertices all look identical — Euclid proved this in Book XIII. Pierre Wantzel proved (1837) that some constructions you'd *want* — trisecting an arbitrary angle, doubling the cube — are provably impossible with these tools.`,
    practice: `Gothic cathedrals were laid out with rope-and-stake compass constructions. Islamic geometric tilework (Alhambra, the Topkapı scroll) systematically explores all 17 wallpaper symmetry groups. Crystallographers, virologists, and chemists rely on the icosahedral and tetrahedral symmetries because real molecules and real crystals settle into them. Modern logos (Apple, Twitter pre-X) are still designed on circular compass grids.`,
    references: [
      { label: 'Euclid Elements (Clark Univ. interactive)', url: 'https://mathcs.clarku.edu/~djoyce/elements/elements.html' },
      { label: 'The 17 wallpaper groups (Branko Grünbaum)', url: 'https://en.wikipedia.org/wiki/Wallpaper_group' },
    ],
  },

  'v2-gargantua': {
    significance: `*Interstellar* (2014) made the public ready to look at a black hole. The film hired Kip Thorne (Nobel laureate, 2017) to compute light bending through a real Schwarzschild-Kerr metric, and Double Negative wrote a custom renderer ("DNGR") to follow ten billion light rays per frame. The result was so accurate it produced a peer-reviewed physics paper.

Five years later (April 2019) the Event Horizon Telescope photographed M87* — a real supermassive black hole — and the picture matched the simulation. That's an unusually clean case of art previewing measurement.`,
    science: `In Einstein's general relativity (1915), mass curves spacetime; light follows null geodesics through that curvature. For a non-rotating (Schwarzschild) black hole the geometry has a closed-form solution; for a rotating (Kerr) one it doesn't, but the geodesic equations are still tractable numerically.

This exhibit fakes it in real time: a fragment shader bends the background skybox by a deflection angle that's a function of the impact parameter (how close the ray passes the centre), and a thin accretion disk is ray-marched in the equatorial plane with a relativistic Doppler shift on the approaching side. The "halo above and below the disk" you see is the lensed image of the disk's far side — that effect is genuine GR, not an artistic flourish.`,
    practice: `The same lensing math is used by working astronomers for: weak gravitational lensing (mapping dark-matter distribution in galaxy surveys); strong lensing (Hubble's "Einstein crosses"); microlensing exoplanet detection. The Event Horizon Telescope's reconstruction algorithm (CHIRP, Bouman et al. 2016) uses related ray-tracing physics in reverse.`,
    references: [
      { label: 'James, von Tunzelmann, Franklin, Thorne 2015 — Gravitational Lensing by Spinning Black Holes', url: 'https://arxiv.org/abs/1502.03808' },
      { label: 'EHT — first image of M87* (2019)', url: 'https://eventhorizontelescope.org/blog/astronomers-capture-first-image-black-hole' },
      { label: 'Thorne — The Science of Interstellar (book)', url: 'https://www.thescienceofinterstellar.com/' },
    ],
  },

  'v2-audio': {
    significance: `Music visualisation has a continuous history: oscilloscope music (Mary Ellen Bute, 1930s), the Whitneys' analog computers (1960s), Atari Video Music (1976, designed by Robert Brown), the iTunes / WinAmp visualizers (Geiss's MilkDrop, 2001), Beeple's daily-render practice, and now Spotify Canvas and TikTok's audio reactivity.

The unifying problem is the same every time: how do you turn an *amplitude-over-time* signal into something that looks like it's *causing* what you see?`,
    science: `Step one is the **Fast Fourier Transform** (Cooley & Tukey, 1965), which decomposes a chunk of audio samples into its frequency components — bass, mid, treble bins. Most visualisers actually use the cheaper Web Audio API's AnalyserNode, which runs an FFT internally and exposes both time-domain and frequency-domain arrays.

Step two is feature extraction: amplitude (RMS), spectral centroid (where the "weight" of the spectrum sits), spectral flux (how much it's changing — a beat indicator), and onset detection. Those features become shader uniforms or particle parameters in real time.`,
    practice: `Same pipeline ships in: Spotify's Canvas, Apple Music's animated covers, every concert visualizer (resolume, TouchDesigner, Notch), the Coachella main-stage backdrops, MilkDrop / projectM, Shadertoy's "music" tag, and every TikTok/Instagram audio-reactive filter. It's one of the most studio-portable skills in creative coding.`,
    references: [
      { label: 'Cooley & Tukey 1965 — FFT', url: 'https://www.ams.org/journals/mcom/1965-19-090/S0025-5718-1965-0178586-1/' },
      { label: 'Web Audio AnalyserNode (MDN)', url: 'https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode' },
    ],
  },

  'v2-workflow': {
    significance: `The "new creative workflow" slide is the practical heart of the talk. The tooling matters less than the *loop*: sketch → prompt → diff → run → iterate. Treat the model as a junior collaborator, not an oracle: it will produce code that *almost* does what you want, and the work is in the editing.

The honest version of this isn't "AI does it for you." It's "you go faster, and the things you spend time on are higher-leverage."`,
    science: `Technically, this loop works because two things converged: (1) modern LLMs (Claude, GPT-4 family, Gemini) are trained on a lot of working creative-coding code, so they reproduce idioms accurately; (2) hot-reload bundlers (Vite, Bun) have made the run-and-see cycle nearly instant. The pipeline collapses what used to be a half-day project into a 15-minute exploration.

The crucial discipline is reading the diff. LLMs hallucinate APIs, miss edge cases, and especially mishandle resource cleanup (this codebase has a whole memory file on it). The human reads, runs, and verifies.`,
    practice: `In production studios, this looks like: TouchDesigner / Notch operators using LLM assistants to write SOPs; web visual designers using Cursor/Copilot for one-off shaders; indie game devs scripting tools; data-art commissions where the model writes the data-cleanup pass and the human writes the visualisation. The same workflow now scales from a single hobbyist to gallery-scale installations.`,
  },

  'v2-tools': {
    significance: `Tools shape what you can imagine. The history of generative art is a history of toolchains: BASIC on a Commodore, Director's Lingo, Flash, Processing, openFrameworks, Cinder, p5.js, three.js, Houdini, TouchDesigner, Notch, Unity, Unreal — each one moved the ceiling.

The 2020s addition is AI-assisted editors (Cursor, Copilot, Aider, Continue) on top of those existing tools. That's a multiplier, not a replacement.`,
    science: `The browser stack used in this site:

- **Vite** (Evan You, 2020) — ESM-native bundler with hot module replacement, which is why edits show up in <100 ms.
- **React** (Meta, 2013) for the shell.
- **TypeScript** for safety against the kind of refactoring slips LLMs make.
- **three.js** / **@react-three/fiber** for WebGL.
- **p5.js** for 2D sketches.
- **GLSL** fragment shaders for everything pixel-heavy.

Native / desktop tools worth knowing: TouchDesigner (real-time node graph), Houdini (offline procedural geometry), Notch (live VJ), MagicaVoxel (voxel art), Blender (everything else).`,
    practice: `For a beginner today, the cheapest way in is openprocessing.org or p5.js's web editor — no install, runs everywhere. For a working creative coder, the realistic stack is Cursor + Vite + three.js + Shadertoy + Houdini for the heavy stuff. None of these tools cost more than a personal laptop.`,
    references: [
      { label: 'Vite', url: 'https://vitejs.dev/' },
      { label: 'three.js manual', url: 'https://threejs.org/manual/' },
      { label: 'Shadertoy', url: 'https://www.shadertoy.com/' },
      { label: 'TouchDesigner', url: 'https://derivative.ca/' },
    ],
  },

  'v2-closing': {
    significance: `Closing slides are about handing off momentum. The whole talk argues a single thesis: the geometry was always there; coding gives you a way to point at it; AI tooling makes pointing easier.

If one viewer leaves and writes a 30-line p5 sketch this week, the talk worked.`,
    science: `A reasonable next-step ladder for a curious beginner:

1. Open p5.js's web editor and copy a sketch from openprocessing.
2. Read *The Nature of Code* (Daniel Shiffman, 2012, free online) — vectors, forces, oscillation, particle systems, neural nets.
3. Watch The Coding Train YouTube channel — Shiffman's live-coded sessions are the best free creative-coding curriculum.
4. Move to three.js via Bruno Simon's Three.js Journey course or three.js's own examples.
5. Lurk Shadertoy; clone, edit, and *don't* try to read it linearly — read backwards from the colour to its inputs.`,
    practice: `Communities to lurk in: Reddit r/generative, r/proceduralgeneration, r/creativecoding; the Processing forum; Shadertoy comments; The Coding Train's Discord; the @sableraph and @piterpasma circles on Bluesky; the Recurse Center if you can swing the time.`,
    references: [
      { label: 'The Nature of Code (Shiffman)', url: 'https://natureofcode.com/' },
      { label: 'Three.js Journey (Bruno Simon)', url: 'https://threejs-journey.com/' },
      { label: 'The Coding Train', url: 'https://thecodingtrain.com/' },
      { label: 'OpenProcessing', url: 'https://openprocessing.org/' },
    ],
  },

  // ── Original deck — "The Geometry Beneath Everything" ──

  opening: {
    significance: `The opening slide states the thesis: there's a geometric substrate under the surface of nature, art, and code. Once you can see it, you can't un-see it — and you can ask a computer to draw it.

The piece is meant to feel like an invitation, not a lecture.`,
    science: `"Sacred geometry" is the cultural framing; the underlying mathematics is Euclidean and combinatorial. The same primitives — circle, square, triangle, regular polygon, regular polyhedron — generate most of the patterns the talk surveys.`,
    practice: `Think of the opening as a tasting menu. The slides that follow each take one pillar (repetition / growth / tiling) and zoom in.`,
  },

  'the-question': {
    significance: `Sacred geometry is a tradition more than a discipline. It claims that some shapes carry meaning. The talk doesn't litigate the metaphysical claim — it just notes that the *shapes themselves* are mathematically real and recur across uncorrelated cultures.

The Flower of Life, the vesica piscis, the Sri Yantra, the Star of David, the mandala — all of these are constructions a 4th-grader could do with a compass.`,
    science: `Most of the canonical "sacred" figures are direct compass-and-straightedge constructions from Euclid's *Elements*. The vesica piscis is two equal circles whose centres lie on each other's circumference; the Flower of Life is a hexagonal tiling of overlapping circles; the Star of David is two equilateral triangles, one inverted.

These are *the* simplest non-trivial figures you can produce with a compass — they're sacred-looking in part because they're early in the construction tree of all possible shapes.`,
    practice: `The figures show up in: Roman mosaic floors, Egyptian temples (Osiris columns at Abydos), Gothic rose windows, Hindu temple plans (vāstu-puruṣa-maṇḍala), Buddhist mandalas, Renaissance paintings (Raphael's *School of Athens*), and contemporary tattoo flash. They're a shared visual vocabulary.`,
    references: [
      { label: 'Euclid Elements Book I (Clark Univ.)', url: 'https://mathcs.clarku.edu/~djoyce/elements/bookI/bookI.html' },
    ],
  },

  repetition: {
    significance: `"Repetition across scale" is the visual signature of a fractal. A coastline looks similar whether you fly over it or walk it. Your lung's bronchi branch like a river delta. A cauliflower's florets look like little cauliflowers.

This is the slide that makes the abstract idea ("self-similarity") suddenly concrete: once you've seen it, you'll see it everywhere.`,
    science: `Mathematically, an object is **self-similar** if a subset of it is congruent (after scaling) to the whole. Strict self-similarity is rare in nature; **statistical self-similarity** (the parts have the same statistical distribution as the whole, just zoomed) is everywhere.

The fractal dimension D measures how detail scales: a smooth curve has D = 1, a filled plane has D = 2, the Koch snowflake has D ≈ 1.26, the British coastline has D ≈ 1.25 (Mandelbrot 1967, "How Long Is the Coast of Britain?").`,
    practice: `Used in: terrain generators (FBM noise), realistic cloud renderers, biological modelling (vascular systems, lungs, neuron dendrites), antenna design (multi-band fractal antennas), and image compression (fractal-based JPEG variants in the 1990s).`,
    references: [
      { label: 'Mandelbrot 1967 — How Long Is the Coast of Britain?', url: 'https://science.org/doi/10.1126/science.156.3775.636' },
    ],
  },

  growth: {
    significance: `Growth slides — spirals, phyllotaxis, the golden ratio — are the most "wow this is actually true" moments of the talk. You count the seeds in a sunflower and they really are 21 / 34 / 55 — consecutive Fibonacci numbers.

The point isn't that nature "knows about" Fibonacci. The point is that the constraint of packing the most seeds into the least space *forces* this geometry, every time.`,
    science: `Helmut Vogel's 1979 model of phyllotaxis places the n-th seed at angle n × 137.5° and radius √n. The 137.5° figure is the **golden angle** — a full turn divided by φ² (where φ = 1.618… is the golden ratio).

The golden angle is the *most irrational* divisor of a circle — no rational fraction approximates it well — which is why no two seeds ever land on the same radial line, and the packing is dense everywhere.

Logarithmic spirals (r = a·e^(bθ)) appear in nautilus shells, hurricanes, and galaxy arms because they're scale-invariant: zooming in reproduces the same curve.`,
    practice: `Used in: solar panel array layouts (Aidan Dwyer's 2011 phyllotaxis-inspired tree patent), antenna arrays, Pixar's procedural sunflowers, and architectural design (the staircase at the Vatican Museums is a logarithmic spiral).`,
    references: [
      { label: 'Vogel 1979 — A better way to construct the sunflower head', url: 'https://www.sciencedirect.com/science/article/abs/pii/0025556479900804' },
      { label: 'Mario Livio — The Golden Ratio (book summary)', url: 'https://www.simonandschuster.com/books/The-Golden-Ratio/Mario-Livio/9780767908160' },
    ],
  },

  tiling: {
    significance: `Tilings are how humans made decoration before mass production. Roman geometric mosaics, Islamic geometric tilework, Chinese lattice screens, Japanese kumiko, William Morris wallpaper — the same handful of symmetry groups, decorated differently.

The Penrose tilings (1974) broke the rules: a tiling that fills the plane with no repeating unit cell. That sounded impossible until Roger Penrose found two prototiles that did it. Daniel Shechtman then found the same structure in real metallic alloys, won the 2011 Nobel in Chemistry, and confirmed that nature uses non-periodic tilings too.`,
    science: `In two dimensions there are exactly **17 wallpaper groups** — 17 distinct ways a pattern can repeat infinitely with translational symmetry, classified by which rotations and reflections it admits. Every Islamic tiling, every William Morris print, every textile pattern in a museum belongs to one of those 17.

Penrose's two-prototile tilings (the "kite and dart" or "fat and thin rhombs") fill the plane *aperiodically* — every finite patch repeats infinitely often, but no translation maps the whole tiling to itself. They have local 5-fold symmetry, which is provably impossible for a periodic tiling.`,
    practice: `Penrose tilings show up on the floor of Oxford's Mathematical Institute, on Penrose toilet paper (the patent fight is legendary), in the patterned coatings of some non-stick frying pans (the non-periodicity prevents grease anchoring), and in the actual atomic structure of quasicrystals discovered in 1982 by Shechtman.`,
    references: [
      { label: 'The 17 wallpaper groups', url: 'https://en.wikipedia.org/wiki/Wallpaper_group' },
      { label: 'Penrose 1974 — original paper', url: 'https://www.ma.utexas.edu/users/radin/penrose.pdf' },
      { label: 'Shechtman 2011 Nobel Lecture', url: 'https://www.nobelprize.org/prizes/chemistry/2011/shechtman/lecture/' },
    ],
  },

  'why-symbols-repeat': {
    significance: `This slide answers a question the audience is starting to ask: "if these patterns are everywhere, is that a coincidence?" Short answer: no. Convergent design.

The same pressures — pack the most into the least space, distribute stress evenly, branch to fill a volume — produce the same shapes whether the optimiser is evolution, water erosion, or a human draughtsman. The symbols repeat because the *problems* repeat.`,
    science: `Three convergence drivers do most of the work:

**1. Optimization under constraint.** Hexagons are the most efficient regular tiling of the plane (least perimeter per area — Hales' Honeycomb Conjecture, proven 1999). Bees use them, basalt columns at the Giant's Causeway form them, soap foam settles into them.

**2. Diffusion-limited aggregation** (Witten & Sander 1981) — particles drift randomly until they stick to a growing cluster, producing branched, dendritic shapes. Lightning, river deltas, neural dendrites, mineral dendrites.

**3. Reaction-diffusion** (Alan Turing, 1952). Two chemicals, one activator, one inhibitor, diffusing at different rates, generate stripes and spots. The same equations produce zebra stripes, leopard spots, and angelfish patterns.`,
    practice: `Bee colonies, basalt columns, dragonfly wings, your blood vessels, river systems, lightning patterns, the surface of a tortoise shell — pick any of these and you can identify which optimisation principle drove the geometry.`,
    references: [
      { label: 'Turing 1952 — The Chemical Basis of Morphogenesis', url: 'https://royalsocietypublishing.org/doi/10.1098/rstb.1952.0012' },
      { label: 'Hales 1999 — The Honeycomb Conjecture', url: 'https://arxiv.org/abs/math/9906042' },
      { label: 'Witten & Sander 1981 — DLA', url: 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.47.1400' },
    ],
  },

  practical: {
    significance: `"Why this is practical" is the slide that earns the rest of the talk. Geometry isn't just pretty — it's load-bearing. Engineers, architects, biologists, animators, urban planners all run on the same primitives the cathedral builders did.

If you walked away thinking "this is decoration," you missed the point. It's how things stand up.`,
    science: `Concrete examples:

- **Structural** — geodesic domes (Buckminster Fuller, 1950s) use icosahedral symmetry to enclose the most volume per pound of material. Used in the Biosphere, Eden Project, military radomes.
- **Biological** — virus capsids are almost always icosahedral, for the same packing reason. Caspar–Klug theory (1962) classifies them.
- **Urban** — most modern street grids are wallpaper-group p4mm. Hexagonal grid plans (Canberra, Detroit's old hub-and-spoke) trade off differently.
- **Biomechanical** — the human eye's photoreceptors are arranged in a phyllotactic spiral, which is why visual acuity falls off smoothly from the fovea.
- **Animation** — every modern film uses fractal noise for clouds, water, flames, dust.`,
    practice: `If you're a working engineer, designer, biologist, or animator, you're already using these. The talk's value-add is naming what you're using and why it works — which makes you faster the next time you reach for it.`,
    references: [
      { label: 'Caspar & Klug 1962 — virus structure', url: 'https://www.ncbi.nlm.nih.gov/pubmed/14019094' },
      { label: 'Fuller — geodesic dome patent', url: 'https://patents.google.com/patent/US2682235' },
    ],
  },

  closing: {
    significance: `The closing slide hands off momentum and points the audience at concrete next steps. The talk's whole argument — that geometry is the substrate, that code lets you draw it, that AI tooling makes the loop fast — collapses into a single sentence: *go make something*.`,
    science: `A starter ladder for someone who hasn't coded much:

1. p5.js web editor → run a noise sketch in 5 minutes.
2. Daniel Shiffman's *The Nature of Code* (free online).
3. Shadertoy's "Hello World" examples → fragment shaders.
4. Bruno Simon's *Three.js Journey* → 3D in the browser.
5. Tyler Hobbs' essays → start thinking like a generative artist, not just a coder.`,
    practice: `If you do exactly one thing this week, fork a sketch from openprocessing.org and change three numbers. That's it. That's the whole loop.`,
    references: [
      { label: 'The Nature of Code (Shiffman)', url: 'https://natureofcode.com/' },
      { label: 'OpenProcessing', url: 'https://openprocessing.org/' },
      { label: 'Tyler Hobbs — Essays', url: 'https://tylerxhobbs.com/essays' },
    ],
  },
};
