import type { ExhibitInfo } from '../types/project';

/**
 * Long-form context for each exhibit. Surfaced by the "?" info button in the
 * ProjectView header. Strings are rendered paragraph-by-paragraph, splitting
 * on blank lines.
 *
 * Keys must match `ProjectMeta.id` in [./projectRegistry.ts](./projectRegistry.ts).
 */
export const exhibitInfo: Record<string, ExhibitInfo> = {
  expanse: {
    significance: `Tilted cuboid grids are a staple of generative art — from Vera Molnár's "Squares" series of the 1970s to contemporary plotter work. Removing perspective in favour of an isometric or near-isometric projection lets the eye treat the field as both surface and space at once, an ambiguity painters have used since Cézanne.

The piece is a study in the smallest unit that still feels alive: a single shaded box, repeated, lit by a moving sun.`,
    science: `Each cell is rendered with axonometric (parallel) projection — the X, Y, and Z axes meet at fixed angles and parallel lines stay parallel, so depth is read by occlusion and shading rather than vanishing points. Lighting uses Lambert's cosine law: a face's brightness is proportional to the dot product between its normal and the light direction.

Surface variation comes from Perlin noise (Ken Perlin, 1983), a band-limited gradient noise that produces smooth, naturalistic randomness — the same primitive Hollywood used for the original Tron's terrain.`,
    practice: `You see this everywhere: SimCity-style strategy games, architectural axonometric drawings, and infographic isometric illustrations all rely on the same projection. Perlin noise itself is on every modern GPU and underwrites Minecraft's terrain, procedural cloud cover in flight sims, and most "organic" textures in motion graphics.`,
    references: [
      { label: 'Ken Perlin — original noise paper (SIGGRAPH 1985)', url: 'https://dl.acm.org/doi/10.1145/325165.325247' },
      { label: 'Vera Molnár — Centre Pompidou collection', url: 'https://www.centrepompidou.fr/en/ressources/personne/cwn7Eqd' },
    ],
  },

  moonlight: {
    significance: `Audio-reactive visuals are the visual language of a generation — born in WinAmp's MilkDrop (Ryan Geiss, 2001) and the demoscene, now ubiquitous on TikTok, in concert visuals, and inside every modern music player. The trick is to make sound feel like it's *causing* what you see, not merely accompanying it.

Crystals lit by a moon are an old motif (Caspar David Friedrich's romantic landscapes, the moonlit peaks of Studio Ghibli) — used here because spiky, faceted geometry catches a single light source dramatically.`,
    science: `The microphone signal is run through a Fast Fourier Transform (Cooley & Tukey, 1965) to split it into frequency bins — bass, mid, treble. Those bins drive shader uniforms in real time, modulating displacement and emission on a procedurally generated heightfield.

Crystal placement uses Poisson-disc sampling for natural, non-overlapping spread (Bridson, 2007). The moon's pulse is a low-pass-filtered envelope of the bass band — the same audio-engineering trick used to "side-chain" a kick drum in EDM production.`,
    practice: `The exact pipeline — FFT → uniforms → fragment shader — powers Spotify's Canvas, Apple Music's animated covers, Coachella stage backdrops, and every Shadertoy "music vis" submission. Poisson sampling appears in offline path tracers (anti-aliasing), in 3D printing infill, and in ecologists' sampling protocols.`,
    references: [
      { label: 'Bridson 2007 — Fast Poisson Disk Sampling', url: 'https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf' },
      { label: 'Cooley & Tukey 1965 — FFT', url: 'https://www.ams.org/journals/mcom/1965-19-090/S0025-5718-1965-0178586-1/' },
    ],
  },

  lattice: {
    significance: `Modular grids are a foundational design language — Josef Albers, Sol LeWitt, the Bauhaus poster tradition, the Swiss International Style. A lit grid takes that vocabulary and makes it temporal: the cells are static but the seams pulse, so structure and event share the same frame.

Light bleeding from joints is the visual signature of contemporary product design (think Nothing Phone, Teenage Engineering) — engineered restraint, with a single expressive channel.`,
    science: `Each cell is a quad in screen space; the seams are computed in the fragment shader from the distance to the nearest grid line. That's a 2D signed distance field — popularised by Inigo Quilez's Shadertoy work — which lets you anti-alias and glow a line cheaply with smoothstep.

Chromatic bleed is wavelength-dependent dispersion: red, green, and blue channels are sampled with slightly offset coordinates, mimicking how a prism splits white light. The "frosted" cell uses a normal-map perturbation and a Fresnel term so glancing angles brighten.`,
    practice: `Distance-field rendering is how every modern UI renders crisp text at any zoom (Chris Green at Valve, 2007 — used in TF2's signs, then adopted by every game engine). The same math drives Figma's vector renderer, Apple's SF Symbols, and the smooth icons in iOS.`,
    references: [
      { label: 'Inigo Quilez — 2D distance functions', url: 'https://iquilezles.org/articles/distfunctions2d/' },
      { label: 'Valve "Improved Alpha-Tested Magnification" (Green 2007)', url: 'https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf' },
    ],
  },

  voronoi: {
    significance: `Voronoi diagrams turn up wherever nature has to pack things — giraffe spots, dragonfly wings, the cross-section of a dried mud flat, the surface of Jupiter's moon Europa. Georgy Voronoy formalised the construction in 1908, but humans have been drawing them by eye for millennia.

In code-art they're the go-to for "organic but ordered" — the visual middle ground between a regular grid and pure noise.`,
    science: `Given a set of seed points, the Voronoi diagram partitions the plane into cells, where every cell contains the points closest to one seed (under some distance metric — usually Euclidean). The dual graph is the Delaunay triangulation (Boris Delaunay, 1934), which maximises the minimum interior angle of every triangle.

This piece computes the diagram in a fragment shader by checking each pixel against a small grid of neighbouring seed cells (the Worley noise trick — Steven Worley, 1996), so it runs in constant time per pixel regardless of seed count.`,
    practice: `Pixar uses Voronoi/Worley noise for stone, leather, and skin shaders. Cell biologists use it to model tissue packing. Mobile carriers use it to plan cell-tower coverage. Robotic path planners use Voronoi roadmaps to stay maximally clear of obstacles.`,
    references: [
      { label: 'Steven Worley 1996 — A Cellular Texture Basis Function', url: 'https://dl.acm.org/doi/10.1145/237170.237267' },
      { label: 'Inigo Quilez — Voronoi distances', url: 'https://iquilezles.org/articles/voronoilines/' },
    ],
  },

  apex: {
    significance: `The inverted pyramid — apex pointing down — is a destabilising shape: the eye reads it as poised, about to tip. Architecture (the Louvre's inverted pyramid by I. M. Pei, 1993) and sculpture have used the form to make stillness feel charged.

Iridescent shading layered onto a single primitive is a deliberate restraint: the form is simple so the surface can carry the whole performance.`,
    science: `Iridescence here is a thin-film interference approximation — the same physics behind soap bubbles, oil slicks, and beetle wings. Light reflecting off the top and bottom of a thin layer interferes with itself; the path-length difference depends on viewing angle, so colour shifts as you move.

The shader fakes this with a Fresnel term (Schlick's approximation, 1994) feeding a cosine palette (Inigo Quilez), so reflectance and hue both rise at glancing angles. Audio amplitude scales the hue offset.`,
    practice: `Real-time thin-film shaders ship in Unreal Engine 5's clearcoat and in Pixar's RenderMan, used for everything from car paint to the iridescent feathers of Pixar's birds. Schlick's approximation is the default Fresnel term in nearly every PBR pipeline (Disney, Filament, glTF).`,
    references: [
      { label: 'Schlick 1994 — An Inexpensive BRDF Model', url: 'https://www.cs.virginia.edu/~jdl/bib/appearance/analytic%20models/schlick94b.pdf' },
      { label: 'Inigo Quilez — palettes', url: 'https://iquilezles.org/articles/palettes/' },
    ],
  },

  prismata: {
    significance: `Recursive clusters of crystals echo a deep idea in art and nature alike: that complex form can emerge from a small rule applied many times. Romanesco broccoli, snowflakes, and Hokusai's *Great Wave* (whose foam fingers branch fractally) all share this lineage.

Adding audio reactivity makes the recursion *temporal* — the same structure breathes, so the viewer feels both the spatial pattern and the rhythm at once.`,
    science: `The cluster is a bounded recursive instancing tree: each crystal spawns a small, randomised set of children scaled and rotated relative to the parent, terminating at a maximum depth or minimum size. This is the same idea as an Iterated Function System (Michael Barnsley, 1988) but evaluated explicitly rather than via the chaos game.

All meshes share one ShaderMaterial — a Fresnel + cosine-spectrum iridescent surface — so the GPU can instance them cheaply. The audio bus drives a global hue offset and a per-frame breathing scale.`,
    practice: `Instanced recursive geometry is how SpeedTree generates every tree in *The Witcher 3*, *Avatar*, and most AAA forests. The same instancing primitive draws crowds in Houdini, particles in Unity's VFX Graph, and the millions of grass blades in Ghost of Tsushima.`,
    references: [
      { label: 'Barnsley — Fractals Everywhere (1988, intro)', url: 'https://archive.org/details/fractalseverywhe0000barn' },
      { label: 'three.js InstancedMesh docs', url: 'https://threejs.org/docs/#api/en/objects/InstancedMesh' },
    ],
  },

  polyhedra: {
    significance: `The five Platonic solids — tetrahedron, cube, octahedron, dodecahedron, icosahedron — are the only convex regular polyhedra possible in three dimensions. Plato (c. 360 BCE) assigned them to the classical elements; Kepler tried to fit planetary orbits inside nested copies (1596). They are the original "discovered" forms of mathematics.

Letting you slide between them is a way to make a 2,400-year-old proof tactile.`,
    science: `Regularity demands that every face be the same regular polygon and the same number of faces meet at every vertex. Euclid (Elements, Book XIII) proved there are exactly five such solids; the proof reduces to angle-sum constraints at each vertex.

Each shape here is generated from its vertex/face incidence list and rendered as a single BufferGeometry. The wireframe overlay uses the half-edge structure to draw each edge exactly once.`,
    practice: `Platonic solids underlie crystallography (the cubic and tetrahedral lattices in salt and diamond), virology (most viruses have icosahedral capsids — the most efficient way to enclose volume with identical protein subunits), Buckminster Fuller's geodesic domes, and every D&D dice set.`,
    references: [
      { label: 'Euclid Elements Book XIII (Clark Univ.)', url: 'https://mathcs.clarku.edu/~djoyce/elements/bookXIII/bookXIII.html' },
      { label: 'Kepler — Mysterium Cosmographicum (1596)', url: 'https://en.wikipedia.org/wiki/Mysterium_Cosmographicum' },
    ],
  },

  geometria: {
    significance: `The construction sequence — point, circle, vesica piscis, triangle, square, pentagon, Platonic solids — is the core curriculum of "sacred geometry," a tradition stretching from Pythagoras through the medieval cathedral builders to Renaissance painters. It claims that meaning lives in proportion.

Modern mathematicians don't share the metaphysics, but the constructions themselves remain genuinely beautiful: every figure is built using only an unmarked straightedge and a compass, the most austere drafting tools imaginable.`,
    science: `Compass-and-straightedge construction is the geometry of Euclid's *Elements* (c. 300 BCE). Each step here is a real Euclidean construction: bisect a line by intersecting two equal circles; build an equilateral triangle by intersecting two more.

Some shapes are *not* constructible — the regular heptagon, the trisection of an arbitrary angle, doubling the cube. Pierre Wantzel proved this in 1837 using field theory: a length is constructible iff it lies in a tower of degree-2 extensions of the rationals. The piece sticks to constructible figures.`,
    practice: `Gothic cathedrals (Chartres, Notre-Dame) were laid out with rope-and-stake versions of these constructions. Islamic geometric tilework — the muqarnas of the Alhambra — uses the same primitives at scale. Modern logo design (Apple, Twitter, countless others) still does compass-and-grid constructions; the proofs translate directly to vector art software.`,
    references: [
      { label: 'Euclid Elements Book I (Clark Univ.)', url: 'https://mathcs.clarku.edu/~djoyce/elements/bookI/bookI.html' },
      { label: 'Wantzel 1837 — non-constructibility (summary)', url: 'https://en.wikipedia.org/wiki/Pierre_Wantzel' },
    ],
  },

  gargantua: {
    significance: `Black holes were a mathematical curiosity in 1915, an indirect detection in the 1990s, and a photograph in 2019 (the Event Horizon Telescope's image of M87*). *Interstellar* (2014) made the public ready for that image: Kip Thorne and the Double Negative VFX team produced the first physically-based render of a Schwarzschild black hole with a thin accretion disk, and that frame became the cultural template.

This piece is a real-time tribute, not the offline render — but the optical illusion is the same.`,
    science: `Light near a black hole follows null geodesics in curved spacetime. For a non-rotating (Schwarzschild) hole the geometry is exact, but the bending integral is expensive. Real-time approximations — Eiselt 2013, Hong et al. 2018 — refract a background skybox by a deflection angle that is a function of the impact parameter; the disk is then ray-marched in the equatorial plane with relativistic Doppler shifting.

Bloom is a Gaussian convolution applied to over-bright pixels (Kawase 2003), to mimic the lens flare HDR cameras produce in front of strong light.`,
    practice: `The same lensing math is used in real astrophysics — gravitational lens reconstruction in Hubble and JWST imagery, weak-lensing dark-matter maps in the Dark Energy Survey, and microlensing exoplanet detection. The *Interstellar* paper (Thorne et al. 2015) was published as a peer-reviewed graphics paper *and* a relativity paper from the same renderer.`,
    references: [
      { label: 'James, von Tunzelmann, Franklin, Thorne 2015 — Gravitational lensing by spinning black holes', url: 'https://arxiv.org/abs/1502.03808' },
      { label: 'EHT 2019 — first image of a black hole', url: 'https://eventhorizontelescope.org/blog/astronomers-capture-first-image-black-hole' },
    ],
  },

  wfc: {
    significance: `Wave Function Collapse turned procedural generation upside-down in 2016. Before WFC, procedural worlds were either grammar-driven (rigid) or noise-driven (mushy); WFC let designers feed in a tiny *example* image and have the algorithm produce arbitrarily large outputs that locally resemble it.

It's now standard in indie game pipelines (*Caves of Qud*, *Bad North*, *Townscaper*) and was named for the quantum-mechanics metaphor — every cell starts in superposition and "collapses" as constraints propagate.`,
    science: `Maxim Gumin's algorithm (2016) is constraint propagation. Each grid cell starts able to be any tile; you collapse the lowest-entropy cell to one option, then propagate that constraint to its neighbours via the adjacency rules learned from the input. If you reach a contradiction, you backtrack. The full algorithm is an arc-consistency solver in disguise (AC-3, Mackworth 1977) over a tile compatibility relation.

Two flavours exist: tiled (explicit adjacency rules) and overlapping (rules inferred from N×N patterns in a sample image).`,
    practice: `Used in *Caves of Qud*'s village layouts, the *Bad North* island generator, *Townscaper*'s rooftops, Oskar Stålberg's *Brick Block*, and a long list of jam games. The same constraint-propagation engine drives Sudoku solvers, scheduling problems, and SAT-solver–based level generators.`,
    references: [
      { label: 'Maxim Gumin — original WFC repository', url: 'https://github.com/mxgmn/WaveFunctionCollapse' },
      { label: 'Karth & Smith 2017 — WFC is constraint solving', url: 'https://escholarship.org/uc/item/3rm1w0mn' },
    ],
  },

  'iso-blocks': {
    significance: `Voxel art has its own canon: Q*bert (1982), Crossy Road, Minecraft, the entire MagicaVoxel community. The aesthetic is honest about its grid — every shape is built from the same cube — and that constraint is exactly why builders find it expressive.

Mixing iridescent bismuth into stone-and-dirt terrain is a small joke about scarcity: most voxels are mundane, but a few catch the light.`,
    science: `The terrain is generated by a 3D extension of WFC — the same constraint propagation as the 2D version, but adjacency rules now run on six face directions instead of four. Voxel rendering uses isometric projection (a special axonometric projection where the three axes are mutually 120° apart in screen space), which lets you cheat: paint each voxel as three shaded parallelograms and skip a 3D rasteriser entirely.

Bismuth's natural step-pyramid (hopper) crystal habit is mimicked by recursively shrinking concentric voxel shells.`,
    practice: `Q*bert and SimCity Classic used the same isometric projection. Modern voxel games (Teardown, Minecraft) use real 3D rasterisation but the same cubic world model. The "step pyramid" form appears in real bismuth crystals because crystal edges grow faster than faces — a kinetic, not equilibrium, effect.`,
    references: [
      { label: 'MagicaVoxel by ephtracy', url: 'https://ephtracy.github.io/' },
      { label: 'Bismuth crystal growth (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bismuth#Hopper_crystals' },
    ],
  },

  'monument-valley': {
    significance: `*Monument Valley* (ustwo, 2014) and Escher's *Relativity* and *Ascending and Descending* (1953-60) share a single trick: the picture plane shows a world that doesn't exist in three dimensions. The eye accepts the consistent local rules and overlooks the global impossibility.

Combining that aesthetic with WFC asks a different question: can a procedural generator produce *believable* impossible architecture without an artist hand-tuning every staircase?`,
    science: `The piece runs WFC over an isometric tileset where adjacency rules encode "which silhouette can sit next to which silhouette." Once a layout is generated, an A* pathfinder (Hart, Nilsson, Raphael 1968) walks the structure — A* finds the shortest path between two nodes in a weighted graph by combining actual cost so far with a heuristic estimate of remaining cost.

Isometric rendering is a 2:1 axonometric projection (also called dimetric in some game-dev circles), historically chosen because it draws cleanly on a pixel grid.`,
    practice: `Pathfinding via A* powers nearly every game NPC since the late '90s — Half-Life, StarCraft, every RTS. WFC over hand-authored tilesets ships in *Caves of Qud* and many indie titles. The isometric pixel-grid trick was an Atari/SimCity-era engineering hack that became an aesthetic identity.`,
    references: [
      { label: 'Hart, Nilsson, Raphael 1968 — A Formal Basis for the Heuristic Determination of Minimum Cost Paths', url: 'https://ieeexplore.ieee.org/document/4082128' },
      { label: 'ustwo — Monument Valley devlog', url: 'https://www.monumentvalleygame.com/' },
    ],
  },

  'geometry-beneath': {
    significance: `Three patterns recur across nature and human design more than any others: branching (rivers, trees, lungs, lightning), spirals (galaxies, hurricanes, sunflowers, the cochlea), and tilings (honeycomb, salt crystals, mosques' geometric ceilings). Showing them on the same canvas, side by side, is the thesis statement of the talk: *geometry is the substrate*.

The visual aid is intentionally non-decorative — three pillars, exposed sliders, no frills — so the math reads first.`,
    science: `**Branching** is an L-system (Aristid Lindenmayer 1968) — string-rewriting rules expanded recursively, the original model for biological growth.

**Spirals** are sampled from the equation r = aφ^(1/n) with golden-ratio rotation between samples — Vogel's 1979 model of phyllotaxis (sunflower seed packing). The 137.5° angle is the most-irrational divisor of a full turn (related to the golden ratio φ ≈ 1.618), which is why the seeds never align into rows.

**Tilings** are a periodic Penrose-style rhombus tiling, drawn from the substitution rules Roger Penrose published in 1974.`,
    practice: `L-systems generate every tree in modern VFX (SpeedTree). Phyllotaxis spirals are used in solar panel arrays (Aidan Dwyer 2011) for shade-free packing. Penrose tilings turn up in non-stick frying-pan coatings (the Penrose-pattern surface is non-periodic, so contaminants don't anchor) and in the structure of quasicrystals (Shechtman, Nobel Prize 2011).`,
    references: [
      { label: 'Vogel 1979 — A better way to construct the sunflower head', url: 'https://www.sciencedirect.com/science/article/abs/pii/0025556479900804' },
      { label: 'Penrose 1974 — The Role of Aesthetics in Pure and Applied Mathematical Research', url: 'https://www.ma.utexas.edu/users/radin/penrose.pdf' },
      { label: 'Shechtman 2011 Nobel Lecture — Quasicrystals', url: 'https://www.nobelprize.org/prizes/chemistry/2011/shechtman/lecture/' },
    ],
  },
};
