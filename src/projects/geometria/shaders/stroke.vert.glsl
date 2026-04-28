precision highp float;

attribute float aArc;

varying float vArc;
varying vec2 vWorld;

void main() {
  vArc = aArc;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xy;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
