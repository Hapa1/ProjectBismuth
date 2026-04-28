import{r as l,j as n,C as y,E as S,k as D,e as g,P as T,S as R,al as j,V as w,b as k,a8 as t}from"./index-Cn0ECLdO.js";import{O as C}from"./OrbitControls-D45tMVmH.js";const P="_root_12kik_5",B="_canvasHost_12kik_21",_="_panel_12kik_35",M="_panelTitle_12kik_79",I="_subtitle_12kik_95",O="_section_12kik_109",N="_sectionTitle_12kik_117",F="_toggleRow_12kik_139",H="_label_12kik_157",E="_checkbox_12kik_167",i={root:P,canvasHost:B,panel:_,panelTitle:M,subtitle:I,section:O,sectionTitle:N,toggleRow:F,label:H,checkbox:E},z=`// Full-screen quad — bypass projection so the fragment shader covers the viewport.\r
varying vec2 vUv;\r
void main() {\r
  vUv = uv;\r
  gl_Position = vec4(position.xy, 0.0, 1.0);\r
}\r
`,A=`// Raymarched black hole.\r
// Inspired by rmarchet/blackhole-ts (geodesic ray bending, Doppler) and\r
// ArjunSNair00/Gargantua (cinematic disk look). Original shader code.\r
//\r
// Per pixel we cast a ray, bend it each step toward the singularity using\r
// a 1/r^2 pull (a stable visual approximation of the Schwarzschild geodesic),\r
// detect disk-plane crossings, and finally sample a procedural starfield in\r
// whatever direction the bent ray ended up pointing.\r
\r
precision highp float;\r
\r
#define PI       3.14159265358979\r
#define TWO_PI   6.28318530717958\r
#define MAX_STEP 256\r
\r
// ---- Camera ----\r
uniform vec3  uCamPos;\r
uniform mat3  uCamBasis;     // columns: right, up, -forward\r
uniform float uTanHalfFov;\r
uniform float uAspect;\r
uniform float uTime;\r
\r
// ---- Black hole / lensing ----\r
uniform float uMass;            // event-horizon radius (Rs)\r
uniform float uLensStrength;    // gravitational pull multiplier\r
uniform float uPhotonIntensity; // photon-ring brightness\r
\r
// ---- Accretion disk ----\r
uniform float uDiskInner;\r
uniform float uDiskOuter;\r
uniform float uDiskBrightness;\r
uniform float uDiskOpacity;\r
uniform float uDiskTemp;\r
uniform float uDiskSpin;\r
uniform float uTurbulence;\r
uniform float uDiskTilt;        // radians\r
uniform float uDopplerStrength;\r
\r
// ---- Stars ----\r
uniform float uStarBrightness;\r
uniform float uStarDensity;\r
\r
// ---- Performance ----\r
uniform int   uSteps;\r
\r
varying vec2 vUv;\r
\r
// ============================================================\r
// Hash + noise helpers\r
// ============================================================\r
float hash12(vec2 p) {\r
  p = fract(p * vec2(234.34, 435.345));\r
  p += dot(p, p + 34.23);\r
  return fract(p.x * p.y);\r
}\r
\r
float vnoise(vec2 p) {\r
  vec2 i = floor(p);\r
  vec2 f = fract(p);\r
  f = f * f * (3.0 - 2.0 * f);\r
  float a = hash12(i);\r
  float b = hash12(i + vec2(1.0, 0.0));\r
  float c = hash12(i + vec2(0.0, 1.0));\r
  float d = hash12(i + vec2(1.0, 1.0));\r
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);\r
}\r
\r
float fbm(vec2 p) {\r
  float v = 0.0;\r
  float a = 0.5;\r
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);\r
  for (int i = 0; i < 5; i++) {\r
    v += a * vnoise(p);\r
    p = r * p * 2.0 + vec2(1.7, 9.2);\r
    a *= 0.5;\r
  }\r
  return v;\r
}\r
\r
// ============================================================\r
// Procedural starfield, sampled by ray direction\r
// ============================================================\r
vec3 starsBackground(vec3 dir) {\r
  vec3 d = normalize(dir);\r
  vec2 uv = vec2(\r
    atan(d.z, d.x) / TWO_PI + 0.5,\r
    asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5\r
  );\r
\r
  vec3 col = vec3(0.0);\r
\r
  // Three octaves of point stars\r
  for (int oct = 0; oct < 3; oct++) {\r
    float scale = 80.0 * pow(2.0, float(oct));\r
    vec2 p = uv * scale;\r
    vec2 ic = floor(p);\r
    vec2 fc = fract(p);\r
\r
    float gate = hash12(ic + float(oct) * 13.7);\r
    float threshold = 1.0 - uStarDensity * 0.04 / pow(1.6, float(oct));\r
    if (gate > threshold) {\r
      vec2 jitter = vec2(hash12(ic + 1.7), hash12(ic + 3.1)) - 0.5;\r
      vec2 cp = fc - 0.5 - jitter * 0.6;\r
      float d2 = dot(cp, cp);\r
      float intensity = exp(-d2 * 250.0) * (0.4 + 0.6 * hash12(ic + 7.0));\r
      // Subtle twinkle\r
      intensity *= 0.75 + 0.25 * sin(uTime * 1.7 + gate * 28.0);\r
      // Spectral colour (blue-white → warm white → orange)\r
      float spec = hash12(ic + 5.0);\r
      vec3 c =\r
        spec < 0.20 ? vec3(0.65, 0.78, 1.0) :\r
        spec < 0.55 ? vec3(1.0,  0.97, 0.92) :\r
        spec < 0.85 ? vec3(1.0,  0.86, 0.6)  :\r
                      vec3(1.0,  0.66, 0.38);\r
      col += c * intensity;\r
    }\r
  }\r
\r
  // Faint Milky-Way-like band running through the equator\r
  float band = exp(-pow((uv.y - 0.5) * 6.0, 2.0));\r
  col += band * 0.04 * vec3(0.55, 0.45, 0.7) * fbm(uv * 8.0);\r
\r
  return col * uStarBrightness;\r
}\r
\r
// ============================================================\r
// Disk sampling — heat gradient + FBM turbulence + Doppler shift\r
// ============================================================\r
vec3 hotColor(float t) {\r
  vec3 deep  = vec3(0.45, 0.02, 0.0);\r
  vec3 warm  = vec3(1.0,  0.42, 0.04);\r
  vec3 gold  = vec3(1.0,  0.88, 0.52);\r
  vec3 white = vec3(1.0,  0.97, 0.90);\r
  if (t < 0.33) return mix(deep, warm, t / 0.33);\r
  if (t < 0.66) return mix(warm, gold, (t - 0.33) / 0.33);\r
  return mix(gold, white, (t - 0.66) / 0.34);\r
}\r
\r
vec4 sampleDisk(vec3 hitPoint, vec3 rayDir) {\r
  float r        = length(hitPoint.xz);\r
  float angle    = atan(hitPoint.z, hitPoint.x);\r
  float rNorm    = clamp((r - uDiskInner) / max(uDiskOuter - uDiskInner, 0.001), 0.0, 1.0);\r
\r
  // Polar noise: spirals inward as time advances\r
  float a       = angle + uTime * uDiskSpin;\r
  vec2  noiseUV = vec2(a * 5.0, r * 3.0 - uTime * 0.4);\r
  float density = mix(fbm(noiseUV), fbm(noiseUV * 2.3 + 5.0), 0.4);\r
\r
  // Heat: hottest at the inner edge\r
  float heat = pow(1.0 - rNorm, mix(1.8, 0.9, uDiskTemp));\r
  vec3  col  = hotColor(heat);\r
\r
  // Brightness profile\r
  float bri  = pow(1.0 - rNorm, 1.4) * 2.2;\r
  bri       += pow(density, 3.5) * uTurbulence * 1.6;\r
\r
  // Doppler: relativistic beaming on the side of the disk moving toward us\r
  vec3  orbit   = normalize(vec3(-hitPoint.z, 0.0, hitPoint.x));\r
  float doppler = dot(orbit, -rayDir);\r
  float dShift  = 1.0 + doppler * uDopplerStrength * (1.0 - rNorm * 0.6);\r
  bri          *= clamp(dShift * dShift, 0.15, 4.5);\r
  col          *= mix(vec3(1.05, 0.95, 0.85), vec3(0.85, 0.95, 1.10),\r
                      0.5 + 0.5 * doppler);\r
\r
  // Soft inner / outer fades\r
  float innerFade = smoothstep(0.0, 0.06, rNorm);\r
  float outerFade = smoothstep(1.0, 0.85, rNorm);\r
  float alpha     = innerFade * outerFade * uDiskOpacity;\r
\r
  return vec4(col * bri * uDiskBrightness, alpha);\r
}\r
\r
// ============================================================\r
// Raymarcher\r
// ============================================================\r
vec3 traceRay(vec3 ro, vec3 rd) {\r
  vec3  pos    = ro;\r
  vec3  vel    = rd;\r
  vec3  accum  = vec3(0.0);\r
  float opa    = 0.0;       // accumulated disk opacity\r
  bool  ate    = false;     // crossed event horizon\r
\r
  float Rs    = uMass;\r
  float Rs2   = Rs * Rs;\r
\r
  for (int i = 0; i < MAX_STEP; i++) {\r
    if (i >= uSteps) break;\r
\r
    float r = length(pos);\r
\r
    // Event horizon — absorb the ray\r
    if (r < Rs) { ate = true; break; }\r
    // Escape — let the ray hit the starfield with whatever direction it has\r
    if (r > 90.0) break;\r
\r
    // Adaptive step: small near the BH, large far from it\r
    float dt = clamp(r * 0.18, 0.04, 1.6);\r
\r
    // Gravitational pull (1/r^2 toward origin). uLensStrength scales the bend.\r
    vec3  toBH = -pos / max(r, 1e-4);\r
    float pull = uLensStrength * Rs2 / max(r * r, 1e-4);\r
    vel += toBH * pull * dt;\r
\r
    // Photon-ring brightening — light tracing close to ~1.5 Rs glows\r
    float photonR = 1.5 * Rs;\r
    float pd      = abs(r - photonR);\r
    if (pd < 0.18 * Rs) {\r
      float falloff = 1.0 - pd / (0.18 * Rs);\r
      accum += vec3(1.0, 0.78, 0.32) * uPhotonIntensity * 0.05 * falloff;\r
    }\r
\r
    vec3 newPos = pos + vel * dt;\r
\r
    // Disk crossing: sign change in y while inside the disk's radial range\r
    if (sign(pos.y) != sign(newPos.y) && opa < 0.99) {\r
      float t   = -pos.y / (vel.y + sign(vel.y) * 1e-5);\r
      vec3  hit = pos + vel * t;\r
      float hr  = length(hit.xz);\r
      if (hr > uDiskInner && hr < uDiskOuter) {\r
        vec4 d = sampleDisk(hit, normalize(vel));\r
        accum += d.rgb * (1.0 - opa);\r
        opa   += d.a   * (1.0 - opa);\r
      }\r
    }\r
\r
    pos = newPos;\r
  }\r
\r
  // Background stars fill whatever's left\r
  if (!ate) {\r
    accum += starsBackground(normalize(vel)) * (1.0 - opa);\r
  }\r
\r
  return accum;\r
}\r
\r
void main() {\r
  // Pixel → camera-space ray\r
  vec2 ndc      = vUv * 2.0 - 1.0;\r
  vec3 dirLocal = normalize(vec3(\r
    ndc.x * uAspect * uTanHalfFov,\r
    ndc.y * uTanHalfFov,\r
    -1.0\r
  ));\r
  vec3 dirWorld = uCamBasis * dirLocal;\r
\r
  // Tilt the world around X by -uDiskTilt so the disk (on y=0) appears tilted\r
  float ct = cos(-uDiskTilt);\r
  float st = sin(-uDiskTilt);\r
  mat3  tiltM = mat3(\r
    1.0, 0.0, 0.0,\r
    0.0,  ct,  st,\r
    0.0, -st,  ct\r
  );\r
  vec3 ro = tiltM * uCamPos;\r
  vec3 rd = tiltM * dirWorld;\r
\r
  vec3 col = traceRay(ro, rd);\r
\r
  // Soft Reinhard tone-map; bloom pass picks up highlights afterwards\r
  col = col / (1.0 + col * 0.55);\r
\r
  gl_FragColor = vec4(col, 1.0);\r
}\r
`,s={mass:1,lensStrength:1,photonIntensity:1,diskInner:1.6,diskOuter:6,diskBrightness:1.5,diskOpacity:.95,diskRotationSpeed:.45,diskTemp:.65,diskTilt:18,turbulence:.85,dopplerStrength:.55,starBrightness:.95,starDensity:.55,bloomIntensity:1.4,bloomRadius:.75,bloomThreshold:.1,cameraDistance:14,animationSpeed:1,autoRotate:!1,rayMarchSteps:90};function L(){const[e,c]=l.useState(!1);return l.useEffect(()=>{const r=window.matchMedia("(prefers-reduced-motion: reduce)"),a=()=>c(r.matches);return a(),r.addEventListener("change",a),()=>r.removeEventListener("change",a)},[]),e}function U({controls:e,width:c,height:r,reduceMotion:a}){const{camera:u}=g(),d=l.useRef(null),h=l.useRef(0),p=l.useMemo(()=>new T(2,2),[]),f=l.useMemo(()=>new R({vertexShader:z,fragmentShader:A,depthTest:!1,depthWrite:!1,uniforms:{uCamPos:{value:new w},uCamBasis:{value:new j},uTanHalfFov:{value:.5},uAspect:{value:1},uTime:{value:0},uMass:{value:s.mass},uLensStrength:{value:s.lensStrength},uPhotonIntensity:{value:s.photonIntensity},uDiskInner:{value:s.diskInner},uDiskOuter:{value:s.diskOuter},uDiskBrightness:{value:s.diskBrightness},uDiskOpacity:{value:s.diskOpacity},uDiskTemp:{value:s.diskTemp},uDiskSpin:{value:s.diskRotationSpeed},uTurbulence:{value:s.turbulence},uDiskTilt:{value:s.diskTilt*Math.PI/180},uDopplerStrength:{value:s.dopplerStrength},uStarBrightness:{value:s.starBrightness},uStarDensity:{value:s.starDensity},uSteps:{value:s.rayMarchSteps}}}),[]);return l.useEffect(()=>{const o=f.uniforms;o.uMass.value=e.mass,o.uLensStrength.value=e.lensStrength,o.uPhotonIntensity.value=e.photonIntensity,o.uDiskInner.value=e.diskInner,o.uDiskOuter.value=Math.max(e.diskOuter,e.diskInner+.1),o.uDiskBrightness.value=e.diskBrightness,o.uDiskOpacity.value=e.diskOpacity,o.uDiskTemp.value=e.diskTemp,o.uDiskSpin.value=e.diskRotationSpeed,o.uTurbulence.value=e.turbulence,o.uDiskTilt.value=e.diskTilt*Math.PI/180,o.uDopplerStrength.value=e.dopplerStrength,o.uStarBrightness.value=e.starBrightness,o.uStarDensity.value=e.starDensity,o.uSteps.value=Math.round(e.rayMarchSteps)},[f,e]),l.useEffect(()=>()=>p.dispose(),[p]),l.useEffect(()=>()=>f.dispose(),[f]),k((o,x)=>{const v=f.uniforms;a||(h.current+=x*e.animationSpeed),v.uTime.value=h.current,v.uCamPos.value.copy(u.position);const m=u.matrixWorld.elements;v.uCamBasis.value.set(m[0],m[4],m[8],m[1],m[5],m[9],m[2],m[6],m[10]);const b=u.fov*(Math.PI/180);v.uTanHalfFov.value=Math.tan(b/2),v.uAspect.value=c/Math.max(r,1)}),n.jsx("mesh",{ref:d,geometry:p,material:f,frustumCulled:!1,renderOrder:-1})}function W({cameraDistance:e,autoRotate:c}){const{camera:r}=g(),a=l.useRef(e);return l.useEffect(()=>{a.current=e},[e]),k((u,d)=>{const h=r.position.length();if(Math.abs(h-a.current)>.01){const p=h+(a.current-h)*Math.min(d*2.5,1);r.position.setLength(p)}}),n.jsx(C,{enableDamping:!0,dampingFactor:.06,minDistance:3.5,maxDistance:70,autoRotate:c,autoRotateSpeed:.35,enablePan:!1})}function G({controls:e,setControls:c}){const r=a=>u=>c(d=>({...d,[a]:u}));return n.jsxs("aside",{className:i.panel,"aria-label":"Gargantua controls",children:[n.jsx("h3",{className:i.panelTitle,children:"Gargantua · Black Hole"}),n.jsx("p",{className:i.subtitle,children:"Raymarched · drag to orbit · zoom with wheel"}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Black Hole"}),n.jsx(t,{label:"Mass (Rs)",min:.4,max:2.5,step:.05,value:e.mass,onChange:r("mass")}),n.jsx(t,{label:"Lensing Strength",min:0,max:2,step:.05,value:e.lensStrength,onChange:r("lensStrength")}),n.jsx(t,{label:"Photon Ring",min:0,max:3,step:.05,value:e.photonIntensity,onChange:r("photonIntensity")})]}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Accretion Disk"}),n.jsx(t,{label:"Inner Radius",min:1.05,max:3.5,step:.05,value:e.diskInner,onChange:r("diskInner")}),n.jsx(t,{label:"Outer Radius",min:2,max:12,step:.1,value:e.diskOuter,onChange:r("diskOuter")}),n.jsx(t,{label:"Brightness",min:.2,max:4,step:.05,value:e.diskBrightness,onChange:r("diskBrightness")}),n.jsx(t,{label:"Opacity",min:.1,max:1,step:.05,value:e.diskOpacity,onChange:r("diskOpacity")}),n.jsx(t,{label:"Rotation Speed",min:0,max:2.5,step:.05,value:e.diskRotationSpeed,onChange:r("diskRotationSpeed")}),n.jsx(t,{label:"Color Temp",min:0,max:1,step:.02,value:e.diskTemp,onChange:r("diskTemp"),format:a=>a.toFixed(2)}),n.jsx(t,{label:"Tilt (°)",min:0,max:75,step:1,value:e.diskTilt,onChange:r("diskTilt"),format:a=>`${a}°`}),n.jsx(t,{label:"Turbulence",min:0,max:2,step:.05,value:e.turbulence,onChange:r("turbulence")}),n.jsx(t,{label:"Doppler",min:0,max:1.5,step:.05,value:e.dopplerStrength,onChange:r("dopplerStrength")})]}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Stars"}),n.jsx(t,{label:"Brightness",min:0,max:2.5,step:.05,value:e.starBrightness,onChange:r("starBrightness")}),n.jsx(t,{label:"Density",min:0,max:1.5,step:.05,value:e.starDensity,onChange:r("starDensity")})]}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Bloom"}),n.jsx(t,{label:"Intensity",min:0,max:5,step:.1,value:e.bloomIntensity,onChange:r("bloomIntensity")}),n.jsx(t,{label:"Radius",min:.1,max:1.5,step:.05,value:e.bloomRadius,onChange:r("bloomRadius")}),n.jsx(t,{label:"Threshold",min:0,max:1,step:.02,value:e.bloomThreshold,onChange:r("bloomThreshold")})]}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Camera & Animation"}),n.jsx(t,{label:"Distance",min:4,max:60,step:.5,value:e.cameraDistance,onChange:r("cameraDistance")}),n.jsx(t,{label:"Anim Speed",min:0,max:3,step:.05,value:e.animationSpeed,onChange:r("animationSpeed")}),n.jsx(t,{label:"Ray Steps",min:40,max:150,step:5,value:e.rayMarchSteps,onChange:r("rayMarchSteps"),format:a=>a.toFixed(0)}),n.jsxs("div",{className:i.toggleRow,children:[n.jsx("span",{className:i.label,children:"Auto-Rotate"}),n.jsx("input",{type:"checkbox",className:i.checkbox,checked:e.autoRotate,onChange:a=>c(u=>({...u,autoRotate:a.target.checked})),"aria-label":"Toggle camera auto-rotation"})]})]})]})}function X({width:e,height:c}){const r=l.useMemo(()=>{if(typeof window>"u")return s;const p=e<640;return{...s,rayMarchSteps:p?60:s.rayMarchSteps,starDensity:p?.4:s.starDensity}},[]),[a,u]=l.useState(r),d=L(),h=[0,4,a.cameraDistance];return n.jsxs("div",{className:i.root,style:{width:e,height:c},children:[n.jsxs(y,{className:i.canvasHost,camera:{position:h,fov:50,near:.1,far:500},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[n.jsx(U,{controls:a,width:e,height:c,reduceMotion:d}),n.jsx(W,{cameraDistance:a.cameraDistance,autoRotate:a.autoRotate}),n.jsx(S,{children:n.jsx(D,{intensity:a.bloomIntensity,radius:a.bloomRadius,luminanceThreshold:a.bloomThreshold,luminanceSmoothing:.6,mipmapBlur:!0})})]}),n.jsx(G,{controls:a,setControls:u})]})}export{X as default};
