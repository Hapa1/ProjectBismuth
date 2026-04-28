precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uLevel;
uniform vec3  uRingColor;

// 8 ring cluster centres in UV space (0..1)
const vec2 CENTERS[8] = vec2[8](
  vec2(0.18, 0.22),
  vec2(0.72, 0.15),
  vec2(0.38, 0.55),
  vec2(0.82, 0.65),
  vec2(0.12, 0.78),
  vec2(0.58, 0.85),
  vec2(0.50, 0.30),
  vec2(0.28, 0.92)
);

// Map audio band index to a blend of bass/mid/treble
float bandValue(int i) {
  if (i < 3) return uBass;
  if (i < 6) return uMid;
  return uTreble;
}

void main() {
  vec2 uv = vUv;
  vec3 color = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    float d = distance(uv, CENTERS[i]);
    float band = bandValue(i);

    // 5 concentric rings per cluster
    for (int k = 1; k <= 5; k++) {
      // Ring radius expands outward over time, modulated by audio
      float r = float(k) * 0.055 + fract(uTime * (0.012 + band * 0.018));
      float ringWidth = 0.005 + band * 0.003;
      float glow = exp(-pow((d - r) / ringWidth, 2.0));
      float intensity = 0.5 + band * 0.9;
      color += uRingColor * glow * intensity;
    }
  }

  // Soft vignette to fade edges
  float vignette = smoothstep(0.0, 0.35, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  color *= vignette;

  // Alpha based on accumulated brightness
  float alpha = clamp(length(color) * 0.8, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
