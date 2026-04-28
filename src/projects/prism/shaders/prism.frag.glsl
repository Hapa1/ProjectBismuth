varying vec3 vNormal;
varying vec3 vViewDir;
uniform float uTime;

vec3 cosineSpectrum(float t) {
  // Violet/cyan/pink bias via palette offset 0.55
  return 0.5 + 0.5 * cos(6.2831 * (vec3(0.55, 0.88, 1.22) + t));
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);

  // Fresnel iridescence
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.5);
  vec3 iridColor = cosineSpectrum(fresnel * 1.2 + uTime * 0.04);
  iridColor *= 0.25 + 0.75 * fresnel;

  // Blinn-Phong specular — single warm key light
  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
  vec3 halfVec = normalize(lightDir + v);
  float spec = pow(max(dot(halfVec, n), 0.0), 64.0) * 1.8;

  // Dark ambient so unlit faces stay near-black
  vec3 ambient = vec3(0.02);

  vec3 col = iridColor + vec3(spec) + ambient;
  gl_FragColor = vec4(col, 1.0);
}
