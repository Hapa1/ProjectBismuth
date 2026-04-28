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
