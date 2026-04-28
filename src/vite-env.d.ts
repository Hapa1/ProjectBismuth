/* GLSL ?raw imports */
declare module '*.vert.glsl?raw' {
  const src: string;
  export default src;
}
declare module '*.frag.glsl?raw' {
  const src: string;
  export default src;
}
declare module '*.glsl?raw' {
  const src: string;
  export default src;
}

/* CSS Modules */
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

/* MDX */
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  export const meta: { id: string; title: string; theme?: 'light' | 'dark' };
  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
}
