varying vec3 vDir;

void main() {
  vDir = normalize(position);
  // Render at the far plane regardless of distance — sky dome.
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
