import { useMemo } from 'react';
import { ARTISTS, type ArtistEntry } from './artists';
import { Carousel, type CarouselItem } from './Carousel';

interface ArtistCarouselProps {
  /** Override the artist list for one-off slides. Defaults to ARTISTS. */
  artists?: ArtistEntry[];
  /** Default CTA label when an entry has no `ctaLabel`. */
  defaultCtaLabel?: string;
  /** Eyebrow label shown above the strip. */
  eyebrow?: string;
  /**
   * CSS value applied as `right` offset on viewports >= 768 px.
   * Prevents the carousel from sliding under a project's right-rail panel.
   *
   * Example (Expanse project panel): `"calc(min(18.5rem, 36vw) + 1.5rem)"`
   */
  rightInset?: string;
}

const DEFAULT_CTA = 'View on Instagram ↗';

/**
 * Artist carousel for slides — wraps the generic `Carousel` with
 * `ArtistEntry` data and artist-specific defaults.
 *
 * Drop it into any MDX slide with zero config:
 *   `<ArtistCarousel />`
 *
 * Or pass a `rightInset` when the slide has a project panel on the right:
 *   `<ArtistCarousel rightInset="calc(min(18.5rem, 36vw) + 1.5rem)" />`
 */
export function ArtistCarousel({
  artists = ARTISTS,
  defaultCtaLabel = DEFAULT_CTA,
  eyebrow = 'Favorite generative artists',
  rightInset,
}: ArtistCarouselProps) {
  const items: CarouselItem[] = useMemo(
    () =>
      artists.map((a) => ({
        id: a.id,
        imageSrc: a.imageSrc,
        title: a.name,
        subtitle: `@${a.handle}`,
        description: a.description,
        ctaUrl: a.ctaUrl ?? a.instagramUrl,
        ctaLabel: a.ctaLabel,
      })),
    [artists],
  );

  return (
    <Carousel
      items={items}
      eyebrow={eyebrow}
      defaultCtaLabel={defaultCtaLabel}
      rightInset={rightInset}
    />
  );
}
