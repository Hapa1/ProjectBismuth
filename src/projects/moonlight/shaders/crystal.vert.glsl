attribute float aHeight;
attribute float aHue;
attribute float aSeed;
attribute float aBand;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uReactivity;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHue;
varying float vSeed;
varying float vAudio;
varying float vY01;

float pickBand(float band) {
  if (band < 0.5) return uBass;
  if (band < 1.5) return uMid;
  return uTreble;
}

void main() {
  vHue = aHue;
  vSeed = aSeed;

  // y in geometry runs 0..1 (base..tip)
  float y01 = clamp(position.y, 0.0, 1.0);
  vY01 = y01;

  float audio = pickBand(aBand);
  vAudio = audio;

  // Mostly static crystals — only the very tip breathes a tiny amount with audio.
  float pulse = audio * uReactivity;
  float stretched = position.y * aHeight * (1.0 + pulse * 0.06 * y01 * y01);

  // Very gentle sway, more at tip
  float sway = sin(uTime * 0.6 + aSeed * 8.0) * 0.015 * y01;

  vec3 local = vec3(position.x + sway, stretched, position.z + sway * 0.6);

  vec4 worldPos = modelMatrix * instanceMatrix * vec4(local, 1.0);
  vWorldPos = worldPos.xyz;

  vec3 nrm = normalize(mat3(instanceMatrix) * normal);
  vNormalW = normalize(mat3(modelMatrix) * nrm);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
