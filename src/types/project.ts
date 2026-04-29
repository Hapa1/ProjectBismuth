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

/**
 * Long-form context for an exhibit, surfaced via the "?" info modal in the
 * project header. Each section is plain text; paragraphs are separated by
 * blank lines and rendered as <p> elements.
 */
export interface ExhibitInfo {
  /** Why the exhibit matters — cultural, artistic, historical framing. */
  significance: string;
  /** The math, science, or algorithm under the hood. */
  science: string;
  /** Where you encounter this in the wild — practical & applied uses. */
  practice: string;
  /** Optional further reading. URLs only when verifiable & canonical. */
  references?: { label: string; url: string }[];
}
