attribute vec3 aOffset;     // xz position + y base
attribute float aHeight;
attribute float aWidth;
attribute float aPhase;
attribute float aBand;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;

varying vec2 vUv;
varying float vBand;
varying float vPhase;
varying float vAudio;

void main() {
  // position is plane (-0.5..0.5, 0..1, 0). x=width, y=height fraction.
  vUv = vec2(position.x + 0.5, position.y);

  float band = aBand < 0.5 ? uBass : (aBand < 1.5 ? uMid : uTreble);
  vAudio = band;
  vBand = aBand;
  vPhase = aPhase;

  vec3 local = position;
  local.x *= aWidth * (1.0 + band * 0.4);
  local.y *= aHeight;

  // Billboard around Y axis: face camera on xz plane
  vec3 base = aOffset;
  vec3 toCam = cameraPosition - base;
  toCam.y = 0.0;
  vec3 right = normalize(vec3(-toCam.z, 0.0, toCam.x));
  vec3 up = vec3(0.0, 1.0, 0.0);

  vec3 world = base + right * local.x + up * local.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
