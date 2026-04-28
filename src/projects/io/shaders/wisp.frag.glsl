precision highp float;

uniform vec3 uColor;

varying float vAlpha;
varying float vSeed;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float core = smoothstep(0.5, 0.0, r);
  float glow = smoothstep(0.5, 0.18, r);
  vec3 col = uColor * (glow * 0.7 + core * 1.5);
  float a = (glow * 0.4 + core) * vAlpha;
  gl_FragColor = vec4(col, a);
}
