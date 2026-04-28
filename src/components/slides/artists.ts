/**
 * Favorite generative-coding artists shown in the Slide 3 carousel.
 *
 * To customize: edit this file. Drop a 1:1 image at
 * `public/slides/artists/<id>.jpg` (or `.png` / `.webp` and update `imageSrc`)
 * and it will appear automatically. If the image is missing the carousel
 * falls back to a deterministic procedural SVG so the slide never breaks.
 */
export interface ArtistEntry {
  /** Stable id, also used as the React key and default image filename. */
  id: string;
  /** Display name. */
  name: string;
  /** Instagram handle without the leading '@'. */
  handle: string;
  /** Short blurb (≈ 2 sentences). Keep under 160 chars for the card. */
  description: string;
  /** Link the CTA opens. Defaults to Instagram if `ctaUrl` is omitted. */
  instagramUrl: string;
  /** Public-relative path to a square hero image. Falls back to SVG on 404. */
  imageSrc?: string;
  /**
   * Optional Instagram post URL (e.g. `https://www.instagram.com/p/Cabc123/`).
   * When set, the carousel card replaces the static image with Instagram's
   * official embed iframe so the artist's actual post is shown inline.
   * Takes precedence over `imageSrc`.
   */
  instagramPostUrl?: string;
  /** Override the CTA wording. Defaults to "View on Instagram ↗". */
  ctaLabel?: string;
  /** Override the CTA destination. Defaults to `instagramUrl`. */
  ctaUrl?: string;
}

export const ARTISTS: ArtistEntry[] = [
  {
    id: 'tyler-hobbs',
    name: 'Tyler Hobbs',
    handle: 'tylerxhobbs',
    description:
      'Plotter pioneer of "Fidenza" — generative paintings whose flow fields look hand-drawn. A gateway artist for code-as-art.',
    instagramUrl: 'https://www.instagram.com/tylerxhobbs/',
    imageSrc: '/slides/artists/tyler-hobbs.jpg',
    instagramPostUrl: 'https://www.instagram.com/p/DWZA-ZWjfY5/',
  },
  {
    id: 'uon-visuals',
    name: 'UON Visuals',
    handle: 'uon.visuals',
    description:
      'Cinematic 3D motion studies — moody, hyper-detailed renders that feel like stills from a film that doesn\u2019t exist yet.',
    instagramUrl: 'https://www.instagram.com/uon.visuals/',
    instagramPostUrl: 'https://www.instagram.com/p/DWC4c7_vXNN/',
  },
  {
    id: 'zach-lieberman',
    name: 'Zach Lieberman',
    handle: 'zach.lieberman',
    description:
      'Co-creator of openFrameworks. Daily sketches that turn typography, light, and motion into kinetic toys.',
    instagramUrl: 'https://www.instagram.com/zach.lieberman/',
    imageSrc: '/slides/artists/zach-lieberman.jpg',
    instagramPostUrl: 'https://www.instagram.com/p/DXntI69jiSZ/',
  },
  {
    id: 'madmaraca',
    name: 'Mad Maraca',
    handle: 'madmaraca',
    description:
      'Vibrant generative compositions — dense algorithmic patterns layered with bold colour and restless geometric energy.',
    instagramUrl: 'https://www.instagram.com/madmaraca/',
    instagramPostUrl: 'https://www.instagram.com/p/DXR3QkUiv--/',
  },
  {
    id: 'kgolid',
    name: 'Kjetil Golid',
    handle: 'kgolid',
    description:
      'Meticulous algorithmic compositions — precise pen-plotter lines and sharp geometric systems that reward close inspection.',
    instagramUrl: 'https://www.instagram.com/kgolid/',
    instagramPostUrl: 'https://www.instagram.com/p/DPgh_WJjHTx/',
  },
];
