import{r as d,u as L,j as a}from"./index-Brqux3uL.js";import{C as D,b as c,c as P,S as A,d as W,F as V,u as T,h as I,I as S,P as $,A as E,e as H,i as B,j as q,V as M,f as k,O as U}from"./react-three-fiber.esm-Cfkc_fHU.js";import{E as O,B as Y}from"./Bloom-BpmSYQeS.js";import{M as X}from"./MeshReflectorMaterial-BqxYrbu-.js";import"./extends-CF3RwP-h.js";const J="_root_uw60d_1",K="_canvasHost_uw60d_17",Q="_panel_uw60d_27",Z="_panelTitle_uw60d_61",ee="_subtitle_uw60d_77",ne="_section_uw60d_91",re="_sectionTitle_uw60d_95",te="_row_uw60d_111",ae="_label_uw60d_127",oe="_value_uw60d_129",ie="_slider_uw60d_133",se="_audioGrid_uw60d_147",le="_button_uw60d_161",ue="_buttonActive_uw60d_193",ce="_fileLabel_uw60d_205",fe="_fileInput_uw60d_207",me="_paletteGrid_uw60d_211",de="_meters_uw60d_223",ve="_meter_uw60d_223",he="_meterLabel_uw60d_241",pe="_meterBar_uw60d_255",be="_meterFill_uw60d_269",m={root:J,canvasHost:K,panel:Q,panelTitle:Z,subtitle:ee,section:ne,sectionTitle:re,row:te,label:ae,value:oe,slider:ie,audioGrid:se,button:le,buttonActive:ue,fileLabel:ce,fileInput:fe,paletteGrid:me,meters:de,meter:ve,meterLabel:he,meterBar:pe,meterFill:be},ge=`varying vec3 vWorldDir;\r
\r
void main() {\r
  vec4 wp = modelMatrix * vec4(position, 1.0);\r
  vWorldDir = normalize(wp.xyz);\r
  gl_Position = projectionMatrix * viewMatrix * wp;\r
}\r
`,ye=`precision highp float;\r
\r
uniform float uTime;\r
uniform float uLevel;\r
uniform vec3 uTop;\r
uniform vec3 uMid;\r
uniform vec3 uHorizon;\r
\r
varying vec3 vWorldDir;\r
\r
// Cheap hash noise\r
float hash(vec2 p) {\r
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\r
}\r
float noise(vec2 p) {\r
  vec2 i = floor(p);\r
  vec2 f = fract(p);\r
  vec2 u = f * f * (3.0 - 2.0 * f);\r
  return mix(\r
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),\r
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),\r
    u.y);\r
}\r
\r
void main() {\r
  // y in [-1, 1] with 1 at zenith\r
  float y = clamp(vWorldDir.y, -1.0, 1.0);\r
  // Remap so horizon (y≈0) is the lavender band, zenith deep indigo\r
  float t = smoothstep(-0.05, 0.95, y);\r
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.55, t));\r
  col = mix(col, uTop, smoothstep(0.45, 1.0, t));\r
\r
  // Subtle noise breathing — lifts slightly with audio level\r
  float n = noise(vWorldDir.xz * 4.0 + uTime * 0.03);\r
  col += (n - 0.5) * 0.04 * (1.0 + uLevel * 1.5);\r
\r
  // Soft glow toward horizon to blend with beams\r
  float horizonGlow = smoothstep(0.25, -0.05, abs(y));\r
  col += uHorizon * horizonGlow * 0.18 * (0.6 + uLevel * 0.6);\r
\r
  gl_FragColor = vec4(col, 1.0);\r
}\r
`,we=`varying vec2 vUv;\r
varying vec3 vWorld;\r
\r
void main() {\r
  vUv = uv;\r
  vec4 wp = modelMatrix * vec4(position, 1.0);\r
  vWorld = wp.xyz;\r
  gl_Position = projectionMatrix * viewMatrix * wp;\r
}\r
`,xe=`precision highp float;\r
\r
uniform float uTime;\r
uniform float uMid;\r
uniform float uTreble;\r
uniform float uBass;\r
uniform vec3 uBase;\r
uniform vec3 uRune;\r
uniform vec3 uBleed; // beam color bleed\r
\r
varying vec3 vWorld;\r
\r
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\r
float noise(vec2 p) {\r
  vec2 i = floor(p);\r
  vec2 f = fract(p);\r
  vec2 u = f * f * (3.0 - 2.0 * f);\r
  return mix(\r
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),\r
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),\r
    u.y);\r
}\r
float fbm(vec2 p) {\r
  float v = 0.0;\r
  float a = 0.5;\r
  for (int i = 0; i < 5; i++) {\r
    v += a * noise(p);\r
    p *= 2.02;\r
    a *= 0.5;\r
  }\r
  return v;\r
}\r
\r
void main() {\r
  vec2 p = vWorld.xz;\r
  float r = length(p);\r
\r
  // Distance fade to fog edge\r
  float fade = smoothstep(70.0, 18.0, r);\r
  if (fade < 0.001) discard;\r
\r
  // Domain-warped rune linework — concentric drifting curves\r
  vec2 q = p * 0.12 + vec2(uTime * 0.03, -uTime * 0.02);\r
  float warp = fbm(q);\r
  vec2 q2 = q + warp * 1.3;\r
  float lines = sin(q2.x * 4.0 + warp * 6.0 + uTime * 0.4)\r
              * sin(q2.y * 3.5 - warp * 5.0 - uTime * 0.3);\r
  float rune = smoothstep(0.55, 0.95, abs(lines));\r
\r
  // Add a few sharp polar arcs\r
  float ang = atan(p.y, p.x);\r
  float arcs = smoothstep(0.94, 0.99, sin(ang * 6.0 + r * 0.4 + uTime * 0.2));\r
\r
  // Base lavender-white ice (transparent overlay — let reflective floor show through)\r
  vec3 col = uBase * 0.55;\r
  // Subtle noise tint\r
  col += (fbm(p * 0.4) - 0.5) * 0.04;\r
\r
  // Magenta/pink rune glow — pulses with mid/treble\r
  float runeMix = (rune + arcs * 0.6) * (0.6 + uMid * 0.7 + uTreble * 0.4);\r
  col = mix(col, uRune, clamp(runeMix, 0.0, 0.85));\r
\r
  // Beam-color bleed near origin (faux reflection of beams)\r
  float beamRing = exp(-pow(r - 5.0, 2.0) * 0.025);\r
  col += uBleed * beamRing * (0.18 + uBass * 0.5);\r
\r
  // Soft vignette toward edge — blends into sky\r
  col *= mix(0.45, 1.0, fade);\r
\r
  // Alpha so the reflective floor underneath shows through, denser near runes\r
  float alpha = mix(0.45, 0.95, clamp(runeMix + 0.25, 0.0, 1.0)) * fade;\r
\r
  gl_FragColor = vec4(col, alpha);\r
}\r
`,Se=`attribute float aHeight;\r
attribute float aWidth;\r
attribute float aSeed;\r
attribute float aBand;\r
\r
uniform float uTime;\r
uniform float uBass;\r
uniform float uMid;\r
uniform float uTreble;\r
uniform float uReactivity;\r
\r
varying vec3 vNormalW;\r
varying vec3 vViewDir;\r
varying float vHeight01;\r
varying float vSeed;\r
varying float vBand;\r
varying float vShimmer;\r
\r
void main() {\r
  // Pick band response per instance\r
  float band = aBand < 0.5 ? uBass : (aBand < 1.5 ? uMid : uTreble);\r
  float audio = band * uReactivity;\r
\r
  // Stretch along Y by height * audio scale; subtle width breathing\r
  vec3 p = position;\r
  float yScale = aHeight * (1.0 + audio * 0.18);\r
  float xzScale = aWidth * (1.0 + audio * 0.04);\r
  p.x *= xzScale;\r
  p.z *= xzScale;\r
  p.y *= yScale;\r
\r
  // Tiny per-vertex jitter for organic facets (deterministic via seed)\r
  float jitter = sin(aSeed * 12.34 + position.y * 3.0) * 0.015;\r
  p.x += jitter;\r
  p.z -= jitter;\r
\r
  vec4 wp = modelMatrix * vec4(p, 1.0);\r
  vNormalW = normalize(mat3(modelMatrix) * normal);\r
  vViewDir = normalize(cameraPosition - wp.xyz);\r
  vHeight01 = clamp(p.y / max(yScale, 0.001), 0.0, 1.0);\r
  vSeed = aSeed;\r
  vBand = aBand;\r
  vShimmer = uTreble * uReactivity * (0.6 + 0.6 * sin(uTime * 6.0 + aSeed * 30.0));\r
\r
  gl_Position = projectionMatrix * viewMatrix * wp;\r
}\r
`,Ce=`precision highp float;\r
\r
uniform vec3 uTintCool;   // deep cyan/blue\r
uniform vec3 uTintIce;    // pale cyan/white\r
uniform vec3 uTintGold;   // hero highlight\r
uniform float uCelSteps;\r
uniform float uTime;\r
uniform float uAuraStrength;\r
\r
varying vec3 vNormalW;\r
varying vec3 vViewDir;\r
varying float vHeight01;\r
varying float vSeed;\r
varying float vBand;\r
varying float vShimmer;\r
\r
void main() {\r
  vec3 N = normalize(vNormalW);\r
  vec3 V = normalize(vViewDir);\r
\r
  // Fresnel rim\r
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);\r
\r
  // Stepped (cel) shading on simple top-light\r
  float lambert = max(dot(N, normalize(vec3(0.2, 1.0, 0.35))), 0.0);\r
  float steps = max(uCelSteps, 1.0);\r
  float cel = floor(lambert * steps) / steps;\r
\r
  // Base gradient cool→ice driven by height\r
  vec3 base = mix(uTintCool, uTintIce, smoothstep(0.1, 0.9, vHeight01));\r
  // Cel band layer\r
  vec3 col = mix(base * 0.55, base, 0.4 + cel * 0.6);\r
\r
  // Rim glow — stepped for cel feel\r
  float rim = floor(fres * 4.0) / 4.0;\r
  col += uTintIce * rim * 0.85;\r
\r
  // Golden top-face highlight (only steeply upward-facing, near tip)\r
  float upFacing = smoothstep(0.55, 0.95, N.y);\r
  float topMask = upFacing * smoothstep(0.55, 1.0, vHeight01);\r
  col = mix(col, uTintGold, topMask * 0.55);\r
\r
  // Treble shimmer flicker on rim\r
  col += uTintIce * vShimmer * fres * 0.6;\r
\r
  // Aura strength bleed — cyan glow fading from base\r
  float baseGlow = smoothstep(0.45, 0.0, vHeight01);\r
  col += uTintCool * baseGlow * uAuraStrength * 0.35;\r
\r
  gl_FragColor = vec4(col, 1.0);\r
}\r
`,Me=`attribute vec3 aOffset;     // xz position + y base\r
attribute float aHeight;\r
attribute float aWidth;\r
attribute float aPhase;\r
attribute float aBand;\r
\r
uniform float uTime;\r
uniform float uBass;\r
uniform float uMid;\r
uniform float uTreble;\r
\r
varying vec2 vUv;\r
varying float vBand;\r
varying float vPhase;\r
varying float vAudio;\r
\r
void main() {\r
  // position is plane (-0.5..0.5, 0..1, 0). x=width, y=height fraction.\r
  vUv = vec2(position.x + 0.5, position.y);\r
\r
  float band = aBand < 0.5 ? uBass : (aBand < 1.5 ? uMid : uTreble);\r
  vAudio = band;\r
  vBand = aBand;\r
  vPhase = aPhase;\r
\r
  vec3 local = position;\r
  local.x *= aWidth * (1.0 + band * 0.4);\r
  local.y *= aHeight;\r
\r
  // Billboard around Y axis: face camera on xz plane\r
  vec3 base = aOffset;\r
  vec3 toCam = cameraPosition - base;\r
  toCam.y = 0.0;\r
  vec3 right = normalize(vec3(-toCam.z, 0.0, toCam.x));\r
  vec3 up = vec3(0.0, 1.0, 0.0);\r
\r
  vec3 world = base + right * local.x + up * local.y;\r
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);\r
}\r
`,Te=`precision highp float;\r
\r
uniform float uTime;\r
uniform float uScrollSpeed;\r
uniform vec3 uCore;\r
uniform vec3 uGlow;\r
\r
varying vec2 vUv;\r
varying float vBand;\r
varying float vPhase;\r
varying float vAudio;\r
\r
float hash(float n) { return fract(sin(n) * 43758.5453); }\r
\r
void main() {\r
  // Horizontal profile — bright core, soft glow\r
  float dx = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edge\r
  float core = smoothstep(0.18, 0.0, dx);\r
  float glow = smoothstep(1.0, 0.15, dx);\r
\r
  // Vertical profile — fade tips, scroll upward\r
  float v = vUv.y;\r
  float topFade = smoothstep(1.0, 0.65, v);\r
  float botFade = smoothstep(0.0, 0.12, v);\r
\r
  // Scroll striations upward over time — modulo wraps continuously\r
  float scroll = fract(v * 3.0 - uTime * uScrollSpeed + vPhase);\r
  float bands = smoothstep(0.0, 0.45, scroll) * smoothstep(1.0, 0.55, scroll);\r
  // Sparse brighter pulses\r
  float pulses = smoothstep(0.92, 1.0, fract(scroll * 2.0 + hash(vPhase) * 3.0));\r
\r
  vec3 col = uGlow * glow * 0.55;\r
  col += uCore * core * (1.2 + bands * 0.8);\r
  col += uCore * pulses * 1.4;\r
\r
  float alpha = (glow * 0.35 + core * 0.95 + pulses * 0.6) * topFade * botFade;\r
  alpha *= 0.65 + vAudio * 0.55;\r
\r
  gl_FragColor = vec4(col, alpha);\r
}\r
`,je=`attribute vec3 aAnchor;\r
attribute float aSeed;\r
attribute float aLife;\r
\r
uniform float uTime;\r
uniform float uBass;\r
uniform float uMid;\r
uniform float uReactivity;\r
uniform float uPixelScale;\r
\r
varying float vAlpha;\r
varying float vSeed;\r
\r
// 2D curl-noise approximation via gradient of noise\r
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\r
float noise(vec2 p) {\r
  vec2 i = floor(p);\r
  vec2 f = fract(p);\r
  vec2 u = f * f * (3.0 - 2.0 * f);\r
  return mix(\r
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),\r
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),\r
    u.y);\r
}\r
vec2 curl(vec2 p) {\r
  float e = 0.05;\r
  float n1 = noise(p + vec2(0.0, e));\r
  float n2 = noise(p - vec2(0.0, e));\r
  float n3 = noise(p + vec2(e, 0.0));\r
  float n4 = noise(p - vec2(e, 0.0));\r
  return vec2((n1 - n2), -(n3 - n4)) / (2.0 * e);\r
}\r
\r
void main() {\r
  // Loop life [0..1] across particle\r
  float t = fract(uTime * 0.35 + aLife);\r
\r
  // Spiral upward from anchor with curl drift\r
  float angle = aSeed * 6.2831 + uTime * (1.5 + aSeed * 0.8);\r
  float radius = 0.05 + t * 0.55 * (1.0 + uBass * 0.7);\r
  vec3 pos = aAnchor;\r
  pos.x += cos(angle) * radius;\r
  pos.z += sin(angle) * radius;\r
  pos.y += t * (1.6 + aSeed * 1.2 + uBass * 0.8);\r
\r
  // Curl noise lateral drift\r
  vec2 c = curl(vec2(aSeed * 11.0, t * 4.0 + uTime * 0.3));\r
  pos.x += c.x * 0.3;\r
  pos.z += c.y * 0.3;\r
\r
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);\r
  gl_Position = projectionMatrix * mv;\r
\r
  // Size fades in/out across life\r
  float sizeShape = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.55, t);\r
  float size = 14.0 * sizeShape * (0.7 + uMid * 0.6 * uReactivity);\r
  gl_PointSize = size * uPixelScale / max(-mv.z, 0.1);\r
\r
  vAlpha = sizeShape * (0.55 + uBass * 0.45);\r
  vSeed = aSeed;\r
}\r
`,_e=`precision highp float;\r
\r
uniform vec3 uColor;\r
\r
varying float vAlpha;\r
varying float vSeed;\r
\r
void main() {\r
  vec2 d = gl_PointCoord - 0.5;\r
  float r = length(d);\r
  if (r > 0.5) discard;\r
  float core = smoothstep(0.5, 0.0, r);\r
  float glow = smoothstep(0.5, 0.18, r);\r
  vec3 col = uColor * (glow * 0.7 + core * 1.5);\r
  float a = (glow * 0.4 + core) * vAlpha;\r
  gl_FragColor = vec4(col, a);\r
}\r
`,G=[{name:"io · cyan",skyTop:new c("#1a0d4d"),skyMid:new c("#5b2da8"),skyHorizon:new c("#c9b3ff"),groundBase:new c("#dcd2ff"),groundRune:new c("#ff5cc8"),crystalCool:new c("#1f6dff"),crystalIce:new c("#cdf3ff"),crystalGold:new c("#ffd07b"),beamCore:new c("#aef6ff"),beamGlow:new c("#3aa0ff"),wisp:new c("#6cf6ff")},{name:"amaranth",skyTop:new c("#240a3d"),skyMid:new c("#a32d8a"),skyHorizon:new c("#ffc1e6"),groundBase:new c("#f0d8ee"),groundRune:new c("#ffe27a"),crystalCool:new c("#7d2bff"),crystalIce:new c("#ffd6f3"),crystalGold:new c("#ffb04a"),beamCore:new c("#ffd6f9"),beamGlow:new c("#ff5cc8"),wisp:new c("#ff85e0")},{name:"aurora",skyTop:new c("#04203a"),skyMid:new c("#0e7a8c"),skyHorizon:new c("#a8ffe0"),groundBase:new c("#cdf0e3"),groundRune:new c("#ff7ab8"),crystalCool:new c("#0fa3a3"),crystalIce:new c("#dffff5"),crystalGold:new c("#ffe07a"),beamCore:new c("#c8ffec"),beamGlow:new c("#3ce0a0"),wisp:new c("#7af0c0")},{name:"ember",skyTop:new c("#3d0820"),skyMid:new c("#a8341a"),skyHorizon:new c("#ffd098"),groundBase:new c("#ffe7d0"),groundRune:new c("#7d3aff"),crystalCool:new c("#ff5a2a"),crystalIce:new c("#ffe7c0"),crystalGold:new c("#fff1a8"),beamCore:new c("#fff0c8"),beamGlow:new c("#ff7a3c"),wisp:new c("#ffb86c")}],Ae={paletteIndex:0,crystalCount:60,fieldRadius:9,beamCount:8,beamHeight:32,beamScrollSpeed:.55,reactivity:1,wispDensity:1,bloomIntensity:1.1,reflections:!0,audioGain:.9,smoothing:.82};function z(t){let u=t>>>0;return()=>{u=u+1831565813>>>0;let o=u;return o=Math.imul(o^o>>>15,o|1),o^=o+Math.imul(o^o>>>7,o|61),((o^o>>>14)>>>0)/4294967296}}function Be(){const[t,u]=d.useState(!1);return d.useEffect(()=>{const o=window.matchMedia("(prefers-reduced-motion: reduce)"),l=()=>u(o.matches);return l(),o.addEventListener("change",l),()=>o.removeEventListener("change",l)},[]),t}function ze({palette:t,bandsRef:u,reduceMotion:o}){const{scene:l}=P(),r=d.useMemo(()=>new A({vertexShader:ge,fragmentShader:ye,side:W,depthWrite:!1,uniforms:{uTime:{value:0},uLevel:{value:0},uTop:{value:t.skyTop.clone()},uMid:{value:t.skyMid.clone()},uHorizon:{value:t.skyHorizon.clone()}}}),[]);return d.useEffect(()=>{r.uniforms.uTop.value.copy(t.skyTop),r.uniforms.uMid.value.copy(t.skyMid),r.uniforms.uHorizon.value.copy(t.skyHorizon)},[r,t]),d.useEffect(()=>(l.fog=new V(t.skyTop.getHex(),.018),()=>{l.fog=null}),[l,t]),d.useEffect(()=>()=>r.dispose(),[r]),T((p,f)=>{o||(r.uniforms.uTime.value+=f),r.uniforms.uLevel.value=u.current.level}),a.jsxs("mesh",{frustumCulled:!1,renderOrder:-2,children:[a.jsx("sphereGeometry",{args:[120,48,32]}),a.jsx("primitive",{object:r,attach:"material"})]})}function Fe({palette:t,bandsRef:u,reflections:o,reduceMotion:l}){const r=d.useMemo(()=>new A({vertexShader:we,fragmentShader:xe,transparent:!0,depthWrite:!1,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uBase:{value:t.groundBase.clone()},uRune:{value:t.groundRune.clone()},uBleed:{value:t.beamCore.clone()}}}),[]);return d.useEffect(()=>{r.uniforms.uBase.value.copy(t.groundBase),r.uniforms.uRune.value.copy(t.groundRune),r.uniforms.uBleed.value.copy(t.beamCore)},[r,t]),d.useEffect(()=>()=>r.dispose(),[r]),T((p,f)=>{l||(r.uniforms.uTime.value+=f);const s=u.current;r.uniforms.uBass.value=s.bass,r.uniforms.uMid.value=s.mid,r.uniforms.uTreble.value=s.treble}),a.jsxs("group",{children:[o&&a.jsxs("mesh",{"rotation-x":-Math.PI/2,position:[0,0,0],children:[a.jsx("circleGeometry",{args:[80,64]}),a.jsx(X,{blur:[300,80],resolution:512,mixBlur:1.4,mixStrength:.35,mirror:.4,depthScale:.5,minDepthThreshold:.3,maxDepthThreshold:1.2,color:t.groundBase.clone().multiplyScalar(.18),metalness:.4,roughness:.95})]}),a.jsxs("mesh",{"rotation-x":-Math.PI/2,position:[0,.012,0],renderOrder:1,children:[a.jsx("circleGeometry",{args:[80,96]}),a.jsx("primitive",{object:r,attach:"material"})]})]})}function Re(){const u=[],o=[],l=[],r=[],p=[],f=z(16436906);for(let i=0;i<6;i+=1){const v=i/6*Math.PI*2,h=.5*(.85+f()*.3),g=.22*(.7+f()*.6);r.push(new M(Math.cos(v)*h,0,Math.sin(v)*h)),p.push(new M(Math.cos(v)*g,.72,Math.sin(v)*g))}const s=new M((f()-.5)*.1,1.05,(f()-.5)*.1),n=i=>{const v=new M().subVectors(i[1],i[0]).cross(new M().subVectors(i[2],i[0])).normalize(),h=u.length/3;for(const g of i)u.push(g.x,g.y,g.z),o.push(v.x,v.y,v.z);i.length===3?l.push(h,h+1,h+2):l.push(h,h+1,h+2,h,h+2,h+3)};for(let i=0;i<6;i+=1){const v=(i+1)%6;n([r[i],r[v],p[v],p[i]]),n([p[i],p[v],s])}const e=new H;return e.setAttribute("position",new k(u,3)),e.setAttribute("normal",new k(o,3)),e.setIndex(l),e.computeBoundingSphere(),e}function Ge(t,u){const o=new Float32Array(t*16),l=new Float32Array(t),r=new Float32Array(t),p=new Float32Array(t),f=new Float32Array(t),s=[],n=new U,e=z(68618);for(let i=0;i<t;i+=1){let v,h,g,y;if(i===0)v=0,h=-.5,g=5.2,y=1.4;else{const b=Math.sqrt(e())*u,C=e()*Math.PI*2;v=Math.cos(C)*b,h=Math.sin(C)*b*.75,g=1.4+e()*3.2+(1-b/u)*1.2,y=.45+e()*.7}n.position.set(v,0,h),n.rotation.set(0,e()*Math.PI*2,0),n.scale.set(1,1,1),n.updateMatrix(),n.matrix.toArray(o,i*16),l[i]=g,r[i]=y,p[i]=e(),f[i]=i===0?0:Math.floor(e()*3),s.push({x:v,z:h,baseY:0,size:y})}return{matrices:o,heights:l,widths:r,seeds:p,bands:f,anchors:s}}function Ne({controls:t,palette:u,bandsRef:o,reduceMotion:l,onLayout:r}){const p=d.useRef(null),f=d.useMemo(Re,[]),s=d.useMemo(()=>new A({vertexShader:Se,fragmentShader:Ce,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uReactivity:{value:t.reactivity},uTintCool:{value:u.crystalCool.clone()},uTintIce:{value:u.crystalIce.clone()},uTintGold:{value:u.crystalGold.clone()},uCelSteps:{value:4},uAuraStrength:{value:1}}}),[]);return d.useEffect(()=>{s.uniforms.uReactivity.value=t.reactivity,s.uniforms.uTintCool.value.copy(u.crystalCool),s.uniforms.uTintIce.value.copy(u.crystalIce),s.uniforms.uTintGold.value.copy(u.crystalGold)},[s,t.reactivity,u]),d.useEffect(()=>{const n=p.current;if(!n)return;const e=Ge(t.crystalCount,t.fieldRadius);n.count=t.crystalCount;const i=new I;for(let h=0;h<t.crystalCount;h+=1)i.fromArray(e.matrices,h*16),n.setMatrixAt(h,i);n.instanceMatrix.needsUpdate=!0,console.log("[io] crystals laid out",{count:n.count,sample0:[e.matrices[12],e.matrices[13],e.matrices[14]],sample5:[e.matrices[5*16+12],e.matrices[5*16+13],e.matrices[5*16+14]],heights:Array.from(e.heights).slice(0,6),instanceMatrixLen:n.instanceMatrix.array.length});const v=n.geometry;v.setAttribute("aHeight",new S(e.heights,1)),v.setAttribute("aWidth",new S(e.widths,1)),v.setAttribute("aSeed",new S(e.seeds,1)),v.setAttribute("aBand",new S(e.bands,1)),r(e)},[t.crystalCount,t.fieldRadius,r]),d.useEffect(()=>()=>{f.dispose(),s.dispose()},[f,s]),T((n,e)=>{l||(s.uniforms.uTime.value+=e);const i=o.current;s.uniforms.uBass.value=i.bass,s.uniforms.uMid.value=i.mid,s.uniforms.uTreble.value=i.treble}),a.jsx("instancedMesh",{ref:p,args:[f,s,t.crystalCount],frustumCulled:!1,castShadow:!1,receiveShadow:!1})}function ke({controls:t,palette:u,bandsRef:o,reduceMotion:l,anchors:r}){const p=d.useRef(null),f=d.useMemo(()=>{const n=new $(1,1,1,1);return n.translate(0,.5,0),n},[]),s=d.useMemo(()=>new A({vertexShader:Me,fragmentShader:Te,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uScrollSpeed:{value:t.beamScrollSpeed},uCore:{value:u.beamCore.clone()},uGlow:{value:u.beamGlow.clone()}},transparent:!0,depthWrite:!1,blending:E}),[]);return d.useEffect(()=>{s.uniforms.uScrollSpeed.value=l?0:t.beamScrollSpeed,s.uniforms.uCore.value.copy(u.beamCore),s.uniforms.uGlow.value.copy(u.beamGlow)},[s,t.beamScrollSpeed,u,l]),d.useEffect(()=>{const n=p.current;if(!n)return;const e=t.beamCount;n.count=e;const i=new Float32Array(e*3),v=new Float32Array(e),h=new Float32Array(e),g=new Float32Array(e),y=new Float32Array(e),b=z(12493569);for(let w=0;w<e;w+=1){let F,R;if(r.length>0&&w<r.length){const _=r[Math.floor(b()*r.length)];F=_.x+(b()-.5)*1.5,R=_.z+(b()-.5)*1.5-.5}else{const _=2+b()*(t.fieldRadius-1),N=b()*Math.PI*2;F=Math.cos(N)*_,R=Math.sin(N)*_*.7}i[w*3+0]=F,i[w*3+1]=0,i[w*3+2]=R,v[w]=t.beamHeight*(.7+b()*.6),h[w]=.55+b()*.9,g[w]=b(),y[w]=Math.floor(b()*3)}const C=new I;for(let w=0;w<e;w+=1)n.setMatrixAt(w,C);n.instanceMatrix.needsUpdate=!0;const j=n.geometry;j.setAttribute("aOffset",new S(i,3)),j.setAttribute("aHeight",new S(v,1)),j.setAttribute("aWidth",new S(h,1)),j.setAttribute("aPhase",new S(g,1)),j.setAttribute("aBand",new S(y,1))},[t.beamCount,t.beamHeight,t.fieldRadius,r]),d.useEffect(()=>()=>{f.dispose(),s.dispose()},[f,s]),T((n,e)=>{l||(s.uniforms.uTime.value+=e);const i=o.current;s.uniforms.uBass.value=i.bass,s.uniforms.uMid.value=i.mid,s.uniforms.uTreble.value=i.treble}),a.jsx("instancedMesh",{ref:p,args:[f,s,t.beamCount],frustumCulled:!1,renderOrder:3})}function Pe({controls:t,palette:u,bandsRef:o,reduceMotion:l,anchors:r}){const p=d.useRef(null),f=d.useMemo(()=>new H,[]),s=d.useMemo(()=>new A({vertexShader:je,fragmentShader:_e,transparent:!0,depthWrite:!1,blending:E,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uReactivity:{value:t.reactivity},uPixelScale:{value:window.devicePixelRatio||1},uColor:{value:u.wisp.clone()}}}),[]);return d.useEffect(()=>{s.uniforms.uReactivity.value=t.reactivity,s.uniforms.uColor.value.copy(u.wisp)},[s,t.reactivity,u]),d.useEffect(()=>{if(r.length===0)return;const n=Math.max(2,Math.round(14*t.wispDensity)),e=r.length*n,i=new Float32Array(e*3),v=new Float32Array(e),h=new Float32Array(e),g=z(41201);let y=0;for(const b of r)for(let C=0;C<n;C+=1)i[y*3+0]=b.x,i[y*3+1]=b.baseY,i[y*3+2]=b.z,v[y]=g(),h[y]=g(),y+=1;f.setAttribute("position",new B(new Float32Array(e*3),3)),f.setAttribute("aAnchor",new B(i,3)),f.setAttribute("aSeed",new B(v,1)),f.setAttribute("aLife",new B(h,1)),f.setDrawRange(0,e),f.computeBoundingSphere=()=>{f.boundingSphere=new q(new M(0,2,0),80)},f.computeBoundingSphere()},[f,r,t.wispDensity]),d.useEffect(()=>()=>{f.dispose(),s.dispose()},[f,s]),T((n,e)=>{l||(s.uniforms.uTime.value+=e);const i=o.current;s.uniforms.uBass.value=i.bass,s.uniforms.uMid.value=i.mid}),a.jsx("points",{ref:p,args:[f,s],frustumCulled:!1,renderOrder:2})}function Ie({bandsRef:t,reduceMotion:u,width:o}){const{camera:l}=P(),r=d.useRef(0);return d.useEffect(()=>{l.position.set(0,8,30),l.lookAt(0,2.6,0)},[l,o]),T((p,f)=>{if(u)return;r.current+=f*.18;const s=t.current.bass;l.position.x=Math.sin(r.current*.4)*1.1,l.position.y=8+Math.sin(r.current*.7)*.15+s*.4,l.lookAt(0,2.4+s*.3,0)}),null}function Ee({controls:t,bandsRef:u,reduceMotion:o,width:l}){const r=G[t.paletteIndex]??G[0],[p,f]=d.useState(null),s=(p==null?void 0:p.anchors)??[];return a.jsxs(a.Fragment,{children:[a.jsx(ze,{palette:r,bandsRef:u,reduceMotion:o}),a.jsx(Fe,{palette:r,bandsRef:u,reflections:t.reflections,reduceMotion:o}),a.jsx(Ne,{controls:t,palette:r,bandsRef:u,reduceMotion:o,onLayout:f}),a.jsx(ke,{controls:t,palette:r,bandsRef:u,reduceMotion:o,anchors:s}),a.jsx(Pe,{controls:t,palette:r,bandsRef:u,reduceMotion:o,anchors:s}),a.jsx(Ie,{bandsRef:u,reduceMotion:o,width:l}),a.jsx(O,{children:a.jsx(Y,{intensity:t.bloomIntensity,luminanceThreshold:.55,luminanceSmoothing:.4,mipmapBlur:!0})})]})}function x({label:t,min:u,max:o,step:l,value:r,onChange:p,format:f}){const s=f?f(r):r.toFixed(2);return a.jsxs("div",{className:m.row,children:[a.jsx("span",{className:m.label,children:t}),a.jsx("span",{className:m.value,children:s}),a.jsx("input",{type:"range",className:m.slider,min:u,max:o,step:l,value:r,onChange:n=>p(Number(n.target.value))})]})}function $e({width:t,height:u}){const[o,l]=d.useState(Ae),r=L(),p=Be(),f=d.useRef(null);d.useEffect(()=>{r.setGain(o.audioGain)},[r,o.audioGain]),d.useEffect(()=>{r.setSmoothing(o.smoothing)},[r,o.smoothing]),d.useEffect(()=>{let n=0;const e=()=>{const i=f.current;if(i){const v=r.bands.current,h=i.querySelectorAll(`.${m.meterFill}`),g=[v.bass,v.mid,v.treble,v.level];h.forEach((y,b)=>{y.style.width=`${Math.min(100,g[b]*130)}%`})}n=requestAnimationFrame(e)};return n=requestAnimationFrame(e),()=>cancelAnimationFrame(n)},[r.bands]);const s=n=>{var i;const e=(i=n.target.files)==null?void 0:i[0];e&&r.loadFile(e),n.target.value=""};return a.jsxs("div",{className:m.root,style:{width:t,height:u},children:[a.jsx("div",{className:m.canvasHost,children:a.jsx(D,{gl:{antialias:!0,powerPreference:"high-performance",alpha:!1},dpr:[1,Math.min(window.devicePixelRatio,2)],camera:{fov:55,position:[0,2.4,11],near:.1,far:220},children:a.jsx(Ee,{controls:o,bandsRef:r.bands,reduceMotion:p,width:t})})}),a.jsxs("aside",{className:m.panel,"aria-label":"Io controls",children:[a.jsx("h3",{className:m.panelTitle,children:"Io · Crystal Resonance"}),a.jsx("p",{className:m.subtitle,children:"Procedural crystal field with rising plasma beams. Pick an audio source to drive shimmer."}),a.jsxs("section",{className:m.section,children:[a.jsx("p",{className:m.sectionTitle,children:"Audio Source"}),a.jsxs("div",{className:m.audioGrid,children:[a.jsx("button",{type:"button",className:`${m.button} ${r.source==="demo"?m.buttonActive:""}`,onClick:()=>void r.loadDemo(),children:"Demo Pad"}),a.jsx("button",{type:"button",className:`${m.button} ${r.source==="mic"?m.buttonActive:""}`,onClick:()=>void r.enableMic(),children:"Microphone"}),a.jsx("button",{type:"button",className:`${m.button} ${r.source==="tab"?m.buttonActive:""}`,onClick:()=>{r.captureTab().catch(n=>{const e=n instanceof Error?n.message:String(n);window.alert(`Tab audio capture failed:

${e}`)})},children:"Tab Audio"}),a.jsxs("label",{className:`${m.button} ${m.fileLabel} ${r.source==="file"?m.buttonActive:""}`,children:["Load File",a.jsx("input",{className:m.fileInput,type:"file",accept:"audio/*",onChange:s})]}),a.jsx("button",{type:"button",className:m.button,onClick:()=>r.stop(),disabled:!r.isActive,children:"Stop"})]}),a.jsx("div",{className:m.meters,ref:f,children:["BASS","MID","TREBLE","LEVEL"].map(n=>a.jsxs("div",{className:m.meter,children:[a.jsx("span",{className:m.meterLabel,children:n}),a.jsx("span",{className:m.meterBar,children:a.jsx("span",{className:m.meterFill})})]},n))})]}),a.jsxs("section",{className:m.section,children:[a.jsx("p",{className:m.sectionTitle,children:"Palette"}),a.jsx("div",{className:m.paletteGrid,children:G.map((n,e)=>a.jsx("button",{type:"button",className:`${m.button} ${o.paletteIndex===e?m.buttonActive:""}`,onClick:()=>l(i=>({...i,paletteIndex:e})),children:n.name},n.name))})]}),a.jsxs("section",{className:m.section,children:[a.jsx("p",{className:m.sectionTitle,children:"Audio Mix"}),a.jsx(x,{label:"Audio Gain",min:0,max:1.5,step:.01,value:o.audioGain,onChange:n=>l(e=>({...e,audioGain:n}))}),a.jsx(x,{label:"Smoothing",min:0,max:.96,step:.01,value:o.smoothing,onChange:n=>l(e=>({...e,smoothing:n}))}),a.jsx(x,{label:"Reactivity",min:0,max:2,step:.05,value:o.reactivity,onChange:n=>l(e=>({...e,reactivity:n}))})]}),a.jsxs("section",{className:m.section,children:[a.jsx("p",{className:m.sectionTitle,children:"Crystals & Beams"}),a.jsx(x,{label:"Crystal Count",min:20,max:140,step:2,value:o.crystalCount,onChange:n=>l(e=>({...e,crystalCount:n})),format:n=>n.toFixed(0)}),a.jsx(x,{label:"Field Radius",min:4,max:18,step:.5,value:o.fieldRadius,onChange:n=>l(e=>({...e,fieldRadius:n}))}),a.jsx(x,{label:"Beam Count",min:2,max:16,step:1,value:o.beamCount,onChange:n=>l(e=>({...e,beamCount:n})),format:n=>n.toFixed(0)}),a.jsx(x,{label:"Beam Height",min:10,max:60,step:1,value:o.beamHeight,onChange:n=>l(e=>({...e,beamHeight:n})),format:n=>n.toFixed(0)}),a.jsx(x,{label:"Beam Flow",min:0,max:1.6,step:.02,value:o.beamScrollSpeed,onChange:n=>l(e=>({...e,beamScrollSpeed:n}))}),a.jsx(x,{label:"Wisp Density",min:0,max:2,step:.05,value:o.wispDensity,onChange:n=>l(e=>({...e,wispDensity:n}))})]}),a.jsxs("section",{className:m.section,children:[a.jsx("p",{className:m.sectionTitle,children:"Post-FX"}),a.jsx(x,{label:"Bloom",min:0,max:2.5,step:.05,value:o.bloomIntensity,onChange:n=>l(e=>({...e,bloomIntensity:n}))}),a.jsxs("div",{className:m.row,children:[a.jsx("span",{className:m.label,children:"Reflections"}),a.jsx("input",{type:"checkbox",checked:o.reflections,onChange:n=>l(e=>({...e,reflections:n.target.checked})),style:{width:"1.1rem",height:"1.1rem",accentColor:"#6cf6ff"}})]})]})]})]})}export{$e as default};
