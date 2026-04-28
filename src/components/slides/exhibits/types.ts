import type { ReactElement } from 'react';

/** A single slider definition for an exhibit's parameter panel. */
export interface ControlDef {
  /** Stable key used in the `params` record. */
  id: string;
  /** Human-readable label, shown above the slider. */
  label: string;
  /** Minimum value (inclusive). */
  min: number;
  /** Maximum value (inclusive). */
  max: number;
  /** Slider granularity. */
  step: number;
  /** Initial value. */
  default: number;
  /** Optional formatter for the live value readout next to the label. */
  format?: (v: number) => string;
}

/** Attribution for a Wikimedia Commons photograph. */
export interface Credit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

/** Props handed to a scene component. */
export interface SceneProps {
  /** Numeric values keyed by ControlDef.id. */
  params: Record<string, number>;
}

/** A single exhibit: photo + caption + interactive scene + sliders. */
export interface ExhibitDef {
  /** Unique slug, used for keys. */
  id: string;
  /** Title displayed beneath the photograph. */
  label: string;
  /** Public-relative path to the source photograph. */
  image: string;
  /** Alt text for the photograph. */
  imageAlt: string;
  /** CC attribution metadata for the photograph. */
  credit: Credit;
  /** Slider definitions for this exhibit. Only used when `render` is provided. */
  controls: ControlDef[];
  /**
   * Render function for a Three.js scene. Runs inside the shared exhibit Canvas.
   * Mutually exclusive with `projectId`.
   */
  render?: (props: SceneProps) => ReactElement;
  /**
   * Project id from the project registry. When set, the full project component
   * is rendered via SlideDemo instead of the shared Canvas + render function.
   * The controls panel is hidden; the project supplies its own UI.
   */
  projectId?: string;
}
