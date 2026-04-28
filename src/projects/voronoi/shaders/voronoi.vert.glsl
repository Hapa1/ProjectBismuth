// Voronoi vertex shader — full-screen plane that exposes world XY + view direction
// for parallax-aware fragment work.

varying vec2 vWorldXY;
varying vec3 vViewDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldXY = worldPos.xy;
  // cameraPosition is provided automatically by three.js for ShaderMaterial.
  vViewDir = normalize(worldPos.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
