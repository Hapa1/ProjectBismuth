// Accretion disk vertex shader
// RingGeometry vertices lie in the XZ plane; we compute radial distance
// in local space and pass it to the fragment shader as a normalized 0→1 value.

uniform float uInnerRadius;
uniform float uOuterRadius;

varying float vRadiusNorm; // 0 = inner edge, 1 = outer edge
varying float vAngle;      // -PI to PI around the ring

void main() {
  float r = length(position.xz);
  vRadiusNorm = (r - uInnerRadius) / max(uOuterRadius - uInnerRadius, 0.001);
  vAngle = atan(position.z, position.x);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
