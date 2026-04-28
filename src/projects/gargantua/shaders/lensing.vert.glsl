// Lensing halo vertex shader
// Passes surface normal and view-space direction to the fragment shader
// so the fragment can compute a Fresnel/rim glow.

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec4 mvPos  = modelViewMatrix * vec4(position, 1.0);
  vNormal     = normalize(normalMatrix * normal);
  vViewDir    = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
