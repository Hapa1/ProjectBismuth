// Seam vertex shader — narrow emissive strip along a grid line.

varying vec2 vUv;
varying vec2 vWorldXY;

void main() {
  vUv = uv;
  vec4 instanceWorld = instanceMatrix * vec4(position, 1.0);
  vWorldXY = instanceWorld.xy;
  gl_Position = projectionMatrix * modelViewMatrix * instanceWorld;
}
