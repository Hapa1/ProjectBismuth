varying vec3 vN;
varying vec3 vV;
uniform float uTime;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t));
}

void main() {
  float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);
  vec3 col = spectrum(fres + uTime * 0.05);
  gl_FragColor = vec4(col * (0.3 + 0.7 * fres), 1.0);
}
