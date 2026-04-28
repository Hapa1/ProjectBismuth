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

// 3D hash → 3D point. Cheap, no textures.
vec3 hash33(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453123);
}

// Voronoi (F1, F2) on the unit sphere using direction-based cells.
// Returns vec3(F1, F2, cellId) where cellId is a per-cell hash.
vec3 voronoi3(vec3 p, float t) {
  vec3 g = floor(p);
  vec3 f = fract(p);
  float f1 = 1e9;
  float f2 = 1e9;
  float id = 0.0;

  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 b = vec3(float(x), float(y), float(z));
        vec3 cell = g + b;
        vec3 h = hash33(cell);
        // Animate cell points: they orbit inside their cell to make the sky shimmer.
        vec3 jitter = 0.5 + 0.5 * sin(t * (0.7 + h * 1.3) + h * 6.2831);
        vec3 r = b + jitter - f;
        float d = dot(r, r);
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = h.x + h.y * 0.31 + h.z * 0.17;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}

void main() {
  vec3 dir = normalize(vDir);

  // Vertical gradient as the base sky.
  float horizon = smoothstep(-0.15, 0.55, dir.y);
  vec3 sky = mix(uFog, uTintA, horizon);
  sky = mix(sky, uTintB, smoothstep(0.35, 1.0, dir.y) * 0.6);

  // Drift the sky pattern over time + audio.
  float drift = uTime * (0.18 + uMid * 0.6 * uReactivity);

  // Two octaves of voronoi: large slow cells + small fast shimmer.
  float scaleA = 3.0 + uBass * 1.4 * uReactivity;
  float scaleB = 11.0 + uTreble * 8.0 * uReactivity;

  vec3 pA = dir * scaleA + vec3(drift * 0.4, drift * 0.25, -drift * 0.3);
  vec3 pB = dir * scaleB + vec3(-drift * 0.9, drift * 0.6, drift * 0.7);

  vec3 vA = voronoi3(pA, uTime * (0.6 + uBass * 1.2));
  vec3 vB = voronoi3(pB, uTime * (1.4 + uTreble * 2.5));

  // Cell edges = F2 - F1 inverted. Thin glowing seams between cells.
  float edgeA = 1.0 - smoothstep(0.0, 0.18 + uBass * 0.2, vB.y - vB.x);
  float edgeB = 1.0 - smoothstep(0.0, 0.06 + uTreble * 0.05, vA.y - vA.x);

  // Cell core glow (closer to center = brighter), modulated by bass.
  float coreA = pow(1.0 - smoothstep(0.0, 0.6, vA.x), 2.0);
  float coreB = pow(1.0 - smoothstep(0.0, 0.5, vB.x), 4.0);

  // Per-cell color: hue derived from the cell id.
  float idA = fract(vA.z + uTime * 0.05);
  vec3 cellTintA = mix(uTintB, uTintC, idA);
  cellTintA = mix(cellTintA, uTintA, 0.3);

  float idB = fract(vB.z * 1.7 + uTime * 0.13);
  vec3 cellTintB = mix(uTintC, uTintB, idB);

  // Compose: sky base + slow cell glow + fast shimmer edges.
  vec3 col = sky;
  col += cellTintA * coreA * (0.35 + uBass * 0.9 * uReactivity);
  col += cellTintB * edgeA * (0.25 + uMid * 0.8 * uReactivity);
  col += vec3(1.0, 0.95, 0.85) * edgeB * (0.18 + uTreble * 1.3 * uReactivity);

  // Fade out below horizon to fog so the ground/scene blends in.
  float belowFade = smoothstep(-0.05, 0.15, dir.y);
  col = mix(uFog, col, belowFade);

  // Subtle moon halo: brighten direction roughly toward moon.
  vec3 moonDir = normalize(vec3(0.18, uMoonY, -0.92));
  float halo = pow(max(dot(dir, moonDir), 0.0), 24.0);
  col += vec3(0.95, 0.9, 0.75) * halo * 0.6;

  // Lift overall with level so the whole sky breathes with the music.
  col *= 0.85 + uLevel * 0.35 * uReactivity;

  gl_FragColor = vec4(col, 1.0);
}
