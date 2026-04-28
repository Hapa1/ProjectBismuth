// Lensing halo fragment shader
// Approximates gravitational lensing with a Fresnel rim glow.
// The glow peaks at the silhouette (N·V = 0) and fades toward center.

uniform float uStrength;      // shifts fresnel exponent (more = tighter rim)
uniform float uOpacity;
uniform float uGlowIntensity;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float NdotV = abs(dot(normalize(vNormal), normalize(vViewDir)));

  // Fresnel: 1 at rim, 0 at face center
  float fresnel = 1.0 - NdotV;
  float expo    = max(0.4, 3.5 - uStrength * 2.2);
  fresnel       = pow(fresnel, expo);

  // Color: cool blue-white at outer rim, warm gold at inner glow
  vec3 rimColor  = vec3(0.82, 0.90, 1.00);  // blue-white
  vec3 coreColor = vec3(1.00, 0.78, 0.32);  // warm gold
  vec3 color     = mix(coreColor, rimColor, fresnel);

  float alpha = fresnel * uOpacity * uGlowIntensity;

  gl_FragColor = vec4(color * uGlowIntensity, alpha);
}
