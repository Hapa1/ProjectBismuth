attribute float aRadius;
attribute float aTwinkle;

uniform float uTime;
uniform float uTreble;

varying float vTwinkle;

void main() {
  vTwinkle = aTwinkle;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float pulse = 0.5 + 0.5 * sin(uTime * 1.7 + aTwinkle * 6.2831);
  gl_PointSize = aRadius * (1.0 + pulse * 0.6 + uTreble * 1.4) * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
