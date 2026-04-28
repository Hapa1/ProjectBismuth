export type Renderer = 'three' | 'p5' | 'canvas';

export interface ProjectMeta {
  /** URL-safe slug matching /^[a-z0-9-]+$/. Used as the route param and chunk name. */
  id: string;
  title: string;
  year: number;
  renderer: Renderer;
  description: string;
  /** Use Renderer union values — 'three', 'p5', 'canvas' — plus freeform descriptors. */
  tags: string[];
}

/**
 * Props passed to every project component by the RenderStage.
 * Values are CSS pixels (not device pixels) — the renderer applies DPR internally.
 */
export interface ProjectComponentProps {
  width: number;
  height: number;
}
