precision highp float;

uniform float uTime;
uniform float uScrollSpeed;
uniform vec3 uCore;
uniform vec3 uGlow;

varying vec2 vUv;
varying float vBand;
varying float vPhase;
varying float vAudio;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  // Horizontal profile — bright core, soft glow
  float dx = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edge
  float core = smoothstep(0.18, 0.0, dx);
  float glow = smoothstep(1.0, 0.15, dx);

  // Vertical profile — fade tips, scroll upward
  float v = vUv.y;
  float topFade = smoothstep(1.0, 0.65, v);
  float botFade = smoothstep(0.0, 0.12, v);

  // Scroll striations upward over time — modulo wraps continuously
  float scroll = fract(v * 3.0 - uTime * uScrollSpeed + vPhase);
  float bands = smoothstep(0.0, 0.45, scroll) * smoothstep(1.0, 0.55, scroll);
  // Sparse brighter pulses
  float pulses = smoothstep(0.92, 1.0, fract(scroll * 2.0 + hash(vPhase) * 3.0));

  vec3 col = uGlow * glow * 0.55;
  col += uCore * core * (1.2 + bands * 0.8);
  col += uCore * pulses * 1.4;

  float alpha = (glow * 0.35 + core * 0.95 + pulses * 0.6) * topFade * botFade;
  alpha *= 0.65 + vAudio * 0.55;

  gl_FragColor = vec4(col, alpha);
}
