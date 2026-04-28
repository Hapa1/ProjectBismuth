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
  },
  {
    id: 'manolo-gamboa-naon',
    name: 'Manolo Gamboa Naon',
    handle: 'manoloide',
    description:
      'Color-saturated geometric studies in Processing. His work feels like Bauhaus posters built by a stochastic algorithm.',
    instagramUrl: 'https://www.instagram.com/manoloide/',
    imageSrc: '/slides/artists/manolo-gamboa-naon.jpg',
  },
  {
    id: 'zach-lieberman',
    name: 'Zach Lieberman',
    handle: 'zach.lieberman',
    description:
      'Co-creator of openFrameworks. Daily sketches that turn typography, light, and motion into kinetic toys.',
    instagramUrl: 'https://www.instagram.com/zach.lieberman/',
    imageSrc: '/slides/artists/zach-lieberman.jpg',
  },
  {
    id: 'memo-akten',
    name: 'Memo Akten',
    handle: 'memotv',
    description:
      'Trains neural nets to dream — luminous, painterly video where the model is the brush, the artist is the prompt.',
    instagramUrl: 'https://www.instagram.com/memotv/',
    imageSrc: '/slides/artists/memo-akten.jpg',
  },
  {
    id: 'casey-reas',
    name: 'Casey Reas',
    handle: 'reas',
    description:
      'Co-creator of Processing. Software-as-material work that influenced an entire generation of creative coders.',
    instagramUrl: 'https://www.instagram.com/reas/',
    imageSrc: '/slides/artists/casey-reas.jpg',
  },
  {
    id: 'refik-anadol',
    name: 'Refik Anadol',
    handle: 'refikanadol',
    description:
      'Data sculptures at architectural scale — museum collections, weather, and memory rendered as flowing pigment.',
    instagramUrl: 'https://www.instagram.com/refikanadol/',
    imageSrc: '/slides/artists/refik-anadol.jpg',
  },
  {
    id: 'jared-tarbell',
    name: 'Jared Tarbell',
    handle: 'jared.tarbell',
    description:
      'Early Flash-era generative art ("Substrate", "Happy Place"). Quietly gorgeous geometry that still reads as fresh.',
    instagramUrl: 'https://www.instagram.com/jared.tarbell/',
    imageSrc: '/slides/artists/jared-tarbell.jpg',
  },
  {
    id: 'lauren-lee-mccarthy',
    name: 'Lauren Lee McCarthy',
    handle: 'laurenleemccarthy',
    description:
      'Creator of p5.js. Performance and software work probing what it feels like to live alongside automated systems.',
    instagramUrl: 'https://www.instagram.com/laurenleemccarthy/',
    imageSrc: '/slides/artists/lauren-lee-mccarthy.jpg',
  },
];
