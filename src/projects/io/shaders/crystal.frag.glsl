precision highp float;

uniform vec3 uTintCool;   // deep cyan/blue
uniform vec3 uTintIce;    // pale cyan/white
uniform vec3 uTintGold;   // hero highlight
uniform float uCelSteps;
uniform float uTime;
uniform float uAuraStrength;

varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vHeight01;
varying float vSeed;
varying float vBand;
varying float vShimmer;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);

  // Fresnel rim
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);

  // Stepped (cel) shading on simple top-light
  float lambert = max(dot(N, normalize(vec3(0.2, 1.0, 0.35))), 0.0);
  float steps = max(uCelSteps, 1.0);
  float cel = floor(lambert * steps) / steps;

  // Base gradient cool→ice driven by height
  vec3 base = mix(uTintCool, uTintIce, smoothstep(0.1, 0.9, vHeight01));
  // Cel band layer
  vec3 col = mix(base * 0.55, base, 0.4 + cel * 0.6);

  // Rim glow — stepped for cel feel
  float rim = floor(fres * 4.0) / 4.0;
  col += uTintIce * rim * 0.85;

  // Golden top-face highlight (only steeply upward-facing, near tip)
  float upFacing = smoothstep(0.55, 0.95, N.y);
  float topMask = upFacing * smoothstep(0.55, 1.0, vHeight01);
  col = mix(col, uTintGold, topMask * 0.55);

  // Treble shimmer flicker on rim
  col += uTintIce * vShimmer * fres * 0.6;

  // Aura strength bleed — cyan glow fading from base
  float baseGlow = smoothstep(0.45, 0.0, vHeight01);
  col += uTintCool * baseGlow * uAuraStrength * 0.35;

  gl_FragColor = vec4(col, 1.0);
}
