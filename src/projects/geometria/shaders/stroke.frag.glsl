// Stroke fragment — discards segments past the pencil tip and emits an
// iridescent body plus a hot bleeding head where aArc ≈ uReveal.

precision highp float;

uniform float uTime;
uniform float uReveal;
uniform float uIntensity;
uniform vec3  uPaletteOffset;
uniform vec2  uPencil;
uniform float uPencilStrength;

varying float vArc;
varying vec2  vWorld;

// __PALETTE_CHUNKS__

void main() {
  float dRev = uReveal - vArc; // < 0 → ahead of the pencil (not yet drawn)
  if (dRev < 0.0) discard;

  // Body iridescence — slow drift along the stroke.
  float t = vArc * 2.4 + uTime * 0.08;
  vec3 body = irCosineSpectrum(t, uPaletteOffset);

  // Hot head: a tight gaussian centred on the pencil's aArc.
  float head = exp(-dRev * dRev * 90.0);

  // Bleeding glow that radiates from the pencil tip in world space onto
  // the already-drawn segments behind it.
  float pd = length(vWorld - uPencil);
  float bleed = exp(-(pd * pd) / 1.6) * uPencilStrength;

  // Body brightens slightly toward the head, settles to a steady wash behind.
  float bodyAmt = 0.55 + 0.45 * exp(-dRev * 3.5);
  vec3 col = body * (bodyAmt + head * 1.6 + bleed * 0.7);
  // Tinted hot core.
  col += vec3(1.0, 0.85, 1.25) * head * 0.55;

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
