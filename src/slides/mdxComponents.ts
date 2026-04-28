import type { MDXComponents } from 'mdx/types';
import { SlideDemo } from '../components/slides/SlideDemo';
import { SlideOverlay } from '../components/slides/SlideOverlay';
import { SlideTitle, SlideEyebrow, SlideBody } from '../components/slides/SlideText';
import { SlidePlaceholder } from '../components/slides/SlidePlaceholder';
import { SymbolWall } from '../components/slides/SymbolWall';
import { SymbolExhibits } from '../components/slides/exhibits/SymbolExhibits';

/**
 * Components automatically available inside any slide MDX file. Authors can
 * use <Demo>, <Placeholder>, <SymbolWall>, <SymbolExhibits>, <Overlay>,
 * <Title>, <Eyebrow>, and <Body> with no per-file imports thanks to
 * MDXProvider in SlideshowView.
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
};
