import type { MDXComponents } from 'mdx/types';
import { SlideDemo } from '../components/slides/SlideDemo';
import { SlideOverlay } from '../components/slides/SlideOverlay';
import { SlideTitle, SlideEyebrow, SlideBody } from '../components/slides/SlideText';
import { SlidePlaceholder } from '../components/slides/SlidePlaceholder';
import { SlidePrompt } from '../components/slides/SlidePrompt';
import { SlideCode } from '../components/slides/SlideCode';
import { SlideCompare } from '../components/slides/SlideCompare';
import { SlideAnnotation } from '../components/slides/SlideAnnotation';
import { SymbolWall } from '../components/slides/SymbolWall';
import { SymbolExhibits } from '../components/slides/exhibits/SymbolExhibits';
import { ArtistCarousel } from '../components/slides/ArtistCarousel';

/**
 * Components automatically available inside any slide MDX file. Authors can
 * use <Demo>, <Placeholder>, <SymbolWall>, <SymbolExhibits>, <Overlay>,
 * <Title>, <Eyebrow>, <Body>, <Prompt>, <Code>, <Compare>, <Annotation>,
 * and <ArtistCarousel> with no per-file imports thanks to MDXProvider in
 * SlideshowView.
 *
 * <Annotation> is the generic dismissable floating widget host — a prompt is
 * just one kind of annotation. Any child widget can be placed inside it.
 *
 * For the carousel:
 *   <ArtistCarousel />                          — full-width, default artists
 *   <ArtistCarousel rightInset="calc(min(18.5rem, 36vw) + 1.5rem)" />
 *                                               — leaves room for a right panel
 */
export const slideMdxComponents: MDXComponents = {
  Demo: SlideDemo,
  Placeholder: SlidePlaceholder,
  SymbolWall,
  SymbolExhibits,
  Overlay: SlideOverlay,
  Title: SlideTitle,
  Eyebrow: SlideEyebrow,
  Body: SlideBody,
  Prompt: SlidePrompt,
  Code: SlideCode,
  Compare: SlideCompare,
  Annotation: SlideAnnotation,
  ArtistCarousel,
};
