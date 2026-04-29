// Apex fragment shader — luminescent iridescent mirage. The pyramid surface
// renders as fresnel-rim iridescence on a transparent additive layer, with
// overall presence driven by uMirage (1.0 on a beat, fading to a small floor).

precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

uniform float uTime;
uniform float uMirage;  // 0..1+ — beat-driven presence envelope
uniform float uTreble;  // hue sweep
uniform float uMid;     // body wash
uniform float uLevel;   // overall energy

vec3 cosineSpectrum(float t, vec3 offset) {
  return 0.5 + 0.5 * cos(6.2831 * (offset + t));
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);

  // Strong fresnel falloff — most of the visible body sits on the silhouette,
  // reading as a glowing wireframe-like outline rather than a solid form.
  float ndv = max(dot(n, v), 0.0);
  float rim = pow(1.0 - ndv, 3.0);
  float facing = pow(ndv, 1.5); // softer inner glow

  // Per-face base hue from XZ angle so the four sides read distinctly.
  float faceAngle = atan(n.x, n.z) / 6.2831 + 0.5;
  float hueShift = uTime * 0.05 + uTreble * 0.6 + faceAngle * 0.3;
  vec3 iridColor = cosineSpectrum(rim * 1.1 + hueShift, vec3(0.55, 0.88, 1.22));

  // Body colour — iridescent rim dominates, with a faint inner mid-band wash.
  vec3 rimColor = iridColor * (1.1 + uLevel * 1.0) * rim;
  vec3 innerWash = vec3(0.18, 0.42, 0.95) * uMid * 0.45 * facing;

  vec3 col = rimColor + innerWash;

  // Mirage envelope shapes both colour intensity and alpha so the shape
  // visibly emerges from black on each beat then dissolves back into haze.
  float mirage = clamp(uMirage, 0.0, 1.4);
  col *= mirage;

  // Alpha: rim is mostly visible; inner faces are more translucent.
  float alpha = (rim * 0.95 + facing * 0.18) * mirage;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
