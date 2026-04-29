precision highp float;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uLevel;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform vec3 uTintC;
uniform vec3 uFog;
uniform float uReactivity;
uniform float uMoonY;

varying vec3 vDir;

void main() {
  vec3 dir = normalize(vDir);

  // Multi-stop vertical gradient: deep zenith → mid → warm horizon.
  // Slightly darker zenith gives the sky more depth without drawing attention.
  vec3 zenith   = mix(uFog, uTintA, 0.55);
  vec3 midSky   = mix(uTintA, uTintB, 0.35);
  vec3 horizonC = mix(uFog, uTintA, 0.85);

  // Smooth blend between three stops along dir.y.
  float t1 = smoothstep(-0.05, 0.45, dir.y);            // horizon → mid
  float t2 = smoothstep(0.35,  0.95, dir.y);            // mid     → zenith
  vec3 sky = mix(horizonC, midSky, t1);
  sky = mix(sky, zenith, t2);

  // Subtle warm tint exactly at the horizon line.
  float horizonGlow = exp(-pow((dir.y - 0.02) * 6.0, 2.0));
  sky += mix(vec3(0.0), uTintC, 0.18) * horizonGlow * 0.35;

  vec3 col = sky;

  // Fade out below horizon to fog so the ground/scene blends in.
  float belowFade = smoothstep(-0.05, 0.15, dir.y);
  col = mix(uFog, col, belowFade);

  // Subtle moon halo: brighten direction roughly toward moon.
  vec3 moonDir = normalize(vec3(0.18, uMoonY, -0.92));
  float halo = pow(max(dot(dir, moonDir), 0.0), 24.0);
  col += vec3(0.95, 0.9, 0.75) * halo * 0.6;

  // Lift overall with level so the whole sky breathes with the music.
  col *= 0.85 + uLevel * 0.35 * uReactivity;

  // Suppress unused-uniform warnings without contributing visual noise.
  col += 0.0 * (uBass + uMid + uTreble + uTintC.r + uTime);

  gl_FragColor = vec4(col, 1.0);
}
