// Starfield fragment shader
// Renders each point as a circular, soft star with spectral color variation.

varying float vSeed;
varying float vAlpha;

// Approximate stellar spectral class colors
vec3 starColor(float seed) {
  if (seed < 0.10) return vec3(0.55, 0.72, 1.00); // O — hot blue
  if (seed < 0.25) return vec3(0.78, 0.88, 1.00); // A — blue-white
  if (seed < 0.55) return vec3(1.00, 1.00, 1.00); // F/G — white
  if (seed < 0.76) return vec3(1.00, 0.97, 0.80); // G — warm white
  if (seed < 0.90) return vec3(1.00, 0.84, 0.52); // K — yellow-orange
               return vec3(1.00, 0.58, 0.32);      // M — orange-red
}

void main() {
  // Discard pixels outside the circular point boundary
  vec2  coord = gl_PointCoord - 0.5;
  float dist  = length(coord);
  if (dist > 0.5) discard;

  // Soft radial falloff: bright center, transparent edge
  float alpha = pow(1.0 - dist * 2.0, 2.2) * vAlpha;

  gl_FragColor = vec4(starColor(vSeed), alpha);
}
