precision mediump float;

uniform float uTime;
varying float vTwinkle;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = exp(-d * 18.0);
  float halo = exp(-d * 6.0) * 0.42;

  float sparklePhase = uTime * 0.9 + vTwinkle * 6.2831;
  float spin = sin(sparklePhase) * 0.35;
  vec2 dir = normalize(vec2(cos(spin), sin(spin)));
  float crossA = pow(max(0.0, 1.0 - abs(dot(uv, dir) * 8.5)), 5.0);
  float crossB = pow(max(0.0, 1.0 - abs(dot(uv, vec2(-dir.y, dir.x)) * 8.5)), 5.0);
  float spikes = (crossA + crossB) * exp(-d * 7.5) * (0.18 + 0.14 * sin(sparklePhase * 1.3));

  float a = core + halo + spikes;
  if (a < 0.02) discard;

  vec3 col = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.85, 0.95), vTwinkle);
  gl_FragColor = vec4(col, min(a, 1.0));
}
