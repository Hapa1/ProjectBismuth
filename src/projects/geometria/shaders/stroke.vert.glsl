precision highp float;

attribute float aArc;
attribute float aIntensityMod;

varying float vArc;
varying vec2 vWorld;
varying float vIntensityMod;

void main() {
  vArc = aArc;
  vIntensityMod = aIntensityMod;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xy;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
