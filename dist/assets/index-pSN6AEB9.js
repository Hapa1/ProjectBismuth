import{r as s,j as e,C as H,E as V,k as L,e as N,d as B,ab as c,s as F,i as A,ad as M,ae as W,S as v,D as _,A as g,b as j,a1 as U,g as q,m as S}from"./index-DfGpesBi.js";import{O as K}from"./OrbitControls-BRhsYCJv.js";const X="_root_12kik_5",Z="_canvasHost_12kik_21",$="_panel_12kik_35",J="_panelTitle_12kik_79",Q="_subtitle_12kik_95",Y="_section_12kik_109",ee="_sectionTitle_12kik_117",ne="_toggleRow_12kik_139",re="_label_12kik_157",te="_checkbox_12kik_167",d={root:X,canvasHost:Z,panel:$,panelTitle:J,subtitle:Q,section:Y,sectionTitle:ee,toggleRow:ne,label:re,checkbox:te},O=`// Accretion disk vertex shader\r
// RingGeometry vertices lie in the XZ plane; we compute radial distance\r
// in local space and pass it to the fragment shader as a normalized 0→1 value.\r
\r
uniform float uInnerRadius;\r
uniform float uOuterRadius;\r
\r
varying float vRadiusNorm; // 0 = inner edge, 1 = outer edge\r
varying float vAngle;      // -PI to PI around the ring\r
\r
void main() {\r
  float r = length(position.xz);\r
  vRadiusNorm = (r - uInnerRadius) / max(uOuterRadius - uInnerRadius, 0.001);\r
  vAngle = atan(position.z, position.x);\r
\r
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}\r
`,I=`// Accretion disk fragment shader\r
// Produces a blackbody-gradient disk with procedural turbulence noise.\r
// Inner region is hot (white/yellow), outer is cool (orange/deep red).\r
\r
#define PI 3.14159265358979323\r
\r
uniform float uTime;\r
uniform float uBrightness;\r
uniform float uOpacity;\r
uniform float uColorTemperature; // 0 = cooler, 1 = hotter overall\r
uniform float uTurbulenceStrength;\r
\r
varying float vRadiusNorm; // 0 = inner, 1 = outer\r
varying float vAngle;      // -PI to PI\r
\r
// ---- Procedural noise ----\r
\r
float hash(vec2 p) {\r
  p = fract(p * vec2(234.34, 435.345));\r
  p += dot(p, p + 34.23);\r
  return fract(p.x * p.y);\r
}\r
\r
float valueNoise(vec2 p) {\r
  vec2 i = floor(p);\r
  vec2 f = fract(p);\r
  f = f * f * (3.0 - 2.0 * f); // smoothstep\r
  float a = hash(i);\r
  float b = hash(i + vec2(1.0, 0.0));\r
  float c = hash(i + vec2(0.0, 1.0));\r
  float d = hash(i + vec2(1.0, 1.0));\r
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);\r
}\r
\r
// Fractal Brownian Motion — 5 octaves\r
float fbm(vec2 p) {\r
  float v = 0.0;\r
  float amp = 0.5;\r
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));\r
  for (int i = 0; i < 5; i++) {\r
    v += amp * valueNoise(p);\r
    p = rot * p * 2.1 + vec2(3.1, 7.4);\r
    amp *= 0.5;\r
  }\r
  return v;\r
}\r
\r
// ---- Blackbody color approximation ----\r
// t = 0 (cool/outer) → 1 (hot/inner)\r
vec3 hotColor(float t) {\r
  vec3 deep  = vec3(0.45, 0.02, 0.0);   // deep crimson\r
  vec3 warm  = vec3(1.0,  0.42, 0.04);  // vivid orange\r
  vec3 gold  = vec3(1.0,  0.88, 0.52);  // bright gold\r
  vec3 white = vec3(1.0,  0.97, 0.90);  // near white\r
\r
  if (t < 0.33)  return mix(deep,  warm,  t / 0.33);\r
  if (t < 0.66)  return mix(warm,  gold,  (t - 0.33) / 0.33);\r
               return mix(gold,  white, (t - 0.66) / 0.34);\r
}\r
\r
void main() {\r
  float r = clamp(vRadiusNorm, 0.0, 1.0);\r
\r
  // Normalize angle to [0, 1]\r
  float angleNorm = (vAngle + PI) / (2.0 * PI);\r
\r
  // Polar noise coords: flow radially inward + swirl angularly\r
  vec2 noiseUV = vec2(\r
    angleNorm * 6.0 + uTime * 0.08,\r
    r * 7.0 - uTime * 0.06\r
  );\r
  float turb = fbm(noiseUV);\r
\r
  // Perturb the radial position with turbulence\r
  float rP = r + (turb - 0.5) * uTurbulenceStrength * 0.28;\r
  rP = clamp(rP, 0.0, 1.0);\r
\r
  // Heat: 1 at inner edge, 0 at outer; shifted by colorTemperature\r
  float heat = pow(1.0 - rP, mix(1.8, 0.9, uColorTemperature));\r
  vec3 color = hotColor(heat);\r
\r
  // Brightness: peaks at inner edge, turbulence adds bright hot-spots\r
  float brightness  = pow(1.0 - r, 1.4) * 2.2 * uBrightness;\r
  brightness       += pow(turb, 3.5) * uTurbulenceStrength * 1.8;\r
  brightness        = max(brightness, 0.0);\r
\r
  // Soft fade at inner and outer boundaries\r
  float innerFade = smoothstep(0.0, 0.07, r);\r
  float outerFade = smoothstep(1.0, 0.80, r);\r
  float alpha = innerFade * outerFade * uOpacity;\r
\r
  gl_FragColor = vec4(color * brightness, alpha);\r
}\r
`,ae=`// Lensing halo vertex shader\r
// Passes surface normal and view-space direction to the fragment shader\r
// so the fragment can compute a Fresnel/rim glow.\r
\r
varying vec3 vNormal;\r
varying vec3 vViewDir;\r
\r
void main() {\r
  vec4 mvPos  = modelViewMatrix * vec4(position, 1.0);\r
  vNormal     = normalize(normalMatrix * normal);\r
  vViewDir    = normalize(-mvPos.xyz);\r
  gl_Position = projectionMatrix * mvPos;\r
}\r
`,se=`// Lensing halo fragment shader\r
// Approximates gravitational lensing with a Fresnel rim glow.\r
// The glow peaks at the silhouette (N·V = 0) and fades toward center.\r
\r
uniform float uStrength;      // shifts fresnel exponent (more = tighter rim)\r
uniform float uOpacity;\r
uniform float uGlowIntensity;\r
\r
varying vec3 vNormal;\r
varying vec3 vViewDir;\r
\r
void main() {\r
  float NdotV = abs(dot(normalize(vNormal), normalize(vViewDir)));\r
\r
  // Fresnel: 1 at rim, 0 at face center\r
  float fresnel = 1.0 - NdotV;\r
  float expo    = max(0.4, 3.5 - uStrength * 2.2);\r
  fresnel       = pow(fresnel, expo);\r
\r
  // Color: cool blue-white at outer rim, warm gold at inner glow\r
  vec3 rimColor  = vec3(0.82, 0.90, 1.00);  // blue-white\r
  vec3 coreColor = vec3(1.00, 0.78, 0.32);  // warm gold\r
  vec3 color     = mix(coreColor, rimColor, fresnel);\r
\r
  float alpha = fresnel * uOpacity * uGlowIntensity;\r
\r
  gl_FragColor = vec4(color * uGlowIntensity, alpha);\r
}\r
`,ie=`// Starfield vertex shader\r
// Each star is a point with a per-vertex seed (color type) and base size.\r
// Time-driven twinkle is applied to both brightness and point size.\r
\r
attribute float aSeed;\r
attribute float aSize;\r
\r
uniform float uTime;\r
uniform float uBrightness;\r
\r
varying float vSeed;\r
varying float vAlpha;\r
\r
void main() {\r
  vSeed = aSeed;\r
\r
  // Each star twinkles at its own frequency, seeded by aSeed\r
  float twinkle = 0.80 + 0.20 * sin(uTime * (1.2 + aSeed * 5.0) + aSeed * 6.2832);\r
  vAlpha = twinkle * uBrightness;\r
\r
  vec4 mvPos   = modelViewMatrix * vec4(position, 1.0);\r
  gl_Position  = projectionMatrix * mvPos;\r
\r
  // Perspective-correct point size, clamped for performance\r
  gl_PointSize = clamp(aSize * twinkle * (180.0 / -mvPos.z), 0.5, 5.0);\r
}\r
`,oe=`// Starfield fragment shader\r
// Renders each point as a circular, soft star with spectral color variation.\r
\r
varying float vSeed;\r
varying float vAlpha;\r
\r
// Approximate stellar spectral class colors\r
vec3 starColor(float seed) {\r
  if (seed < 0.10) return vec3(0.55, 0.72, 1.00); // O — hot blue\r
  if (seed < 0.25) return vec3(0.78, 0.88, 1.00); // A — blue-white\r
  if (seed < 0.55) return vec3(1.00, 1.00, 1.00); // F/G — white\r
  if (seed < 0.76) return vec3(1.00, 0.97, 0.80); // G — warm white\r
  if (seed < 0.90) return vec3(1.00, 0.84, 0.52); // K — yellow-orange\r
               return vec3(1.00, 0.58, 0.32);      // M — orange-red\r
}\r
\r
void main() {\r
  // Discard pixels outside the circular point boundary\r
  vec2  coord = gl_PointCoord - 0.5;\r
  float dist  = length(coord);\r
  if (dist > 0.5) discard;\r
\r
  // Soft radial falloff: bright center, transparent edge\r
  float alpha = pow(1.0 - dist * 2.0, 2.2) * vAlpha;\r
\r
  gl_FragColor = vec4(starColor(vSeed), alpha);\r
}\r
`,P={eventHorizonRadius:1,diskInnerRadius:1.35,diskOuterRadius:3.6,diskBrightness:1.4,diskOpacity:.92,diskRotationSpeed:.28,diskColorTemperature:.65,diskTilt:22,turbulenceStrength:.72,lensingStrength:.75,lensingRadius:1.55,lensingOpacity:.58,lensingGlowIntensity:.85,bloomIntensity:1.6,bloomRadius:.75,bloomThreshold:.08,starCount:4e3,starBrightness:.82,starFieldRadius:90,animationSpeed:1,cameraDistance:9,autoRotate:!1};function le(){const[r,u]=s.useState(!1);return s.useEffect(()=>{const n=window.matchMedia("(prefers-reduced-motion: reduce)"),t=()=>u(n.matches);return t(),n.addEventListener("change",t),()=>n.removeEventListener("change",t)},[]),r}function ue(r,u){const n=new Float32Array(r*3),t=new Float32Array(r),a=new Float32Array(r);for(let l=0;l<r;l++){const m=Math.random()*Math.PI*2,o=Math.acos(2*Math.random()-1),f=u*(.85+.15*Math.random());n[l*3]=f*Math.sin(o)*Math.cos(m),n[l*3+1]=f*Math.sin(o)*Math.sin(m),n[l*3+2]=f*Math.cos(o),t[l]=Math.random(),a[l]=.7+Math.random()*2.3}const i=new q;return i.setAttribute("position",new S(n,3)),i.setAttribute("aSeed",new S(t,1)),i.setAttribute("aSize",new S(a,1)),i}function ce({controls:r}){const{eventHorizonRadius:u}=r,n=s.useMemo(()=>new F(u,64,40),[u]),t=s.useMemo(()=>new A({color:0}),[]);return s.useEffect(()=>()=>n.dispose(),[n]),s.useEffect(()=>()=>t.dispose(),[t]),e.jsx("mesh",{geometry:n,material:t,renderOrder:1})}function de({controls:r,reduceMotion:u}){const n=s.useRef(null),t=s.useRef(0),{diskInnerRadius:a,diskOuterRadius:i,diskBrightness:l,diskOpacity:m,diskColorTemperature:o,turbulenceStrength:f,diskTilt:x,diskRotationSpeed:z,animationSpeed:G,eventHorizonRadius:b}=r,w=s.useMemo(()=>new M(a,i,128,8),[a,i]),y=s.useMemo(()=>new M(a,a+(i-a)*.45,128,4),[a,i]),R=s.useMemo(()=>new W(b*1.18,b*.028,32,128),[b]),h=s.useMemo(()=>new v({vertexShader:O,fragmentShader:I,uniforms:{uTime:{value:0},uInnerRadius:{value:a},uOuterRadius:{value:i},uBrightness:{value:l},uOpacity:{value:m},uColorTemperature:{value:o},uTurbulenceStrength:{value:f}},transparent:!0,depthWrite:!1,blending:g,side:_}),[]),p=s.useMemo(()=>new v({vertexShader:O,fragmentShader:I,uniforms:{uTime:{value:0},uInnerRadius:{value:a},uOuterRadius:{value:a+(i-a)*.45},uBrightness:{value:l*.6},uOpacity:{value:m*.5},uColorTemperature:{value:o*.85},uTurbulenceStrength:{value:f*.8}},transparent:!0,depthWrite:!1,blending:g,side:_}),[]),k=s.useMemo(()=>new A({color:new B(1,.75,.25),transparent:!0,opacity:.85,depthWrite:!1,blending:g}),[]);s.useEffect(()=>{h.uniforms.uInnerRadius.value=a,h.uniforms.uOuterRadius.value=i,h.uniforms.uBrightness.value=l,h.uniforms.uOpacity.value=m,h.uniforms.uColorTemperature.value=o,h.uniforms.uTurbulenceStrength.value=f;const C=a+(i-a)*.45;p.uniforms.uInnerRadius.value=a,p.uniforms.uOuterRadius.value=C,p.uniforms.uBrightness.value=l*.6,p.uniforms.uOpacity.value=m*.5,p.uniforms.uColorTemperature.value=o*.85,p.uniforms.uTurbulenceStrength.value=f*.8},[h,p,a,i,l,m,o,f]),s.useEffect(()=>()=>{w.dispose(),y.dispose(),R.dispose()},[w,y,R]),s.useEffect(()=>()=>{h.dispose(),p.dispose(),k.dispose()},[h,p,k]),j((C,D)=>{if(u)return;const T=D*G;t.current+=T,n.current&&(n.current.rotation.y+=z*T),h.uniforms.uTime.value=t.current,p.uniforms.uTime.value=t.current});const E=x*Math.PI/180;return e.jsxs("group",{ref:n,rotation:[E,0,0],children:[e.jsx("mesh",{geometry:w,material:h,renderOrder:2}),e.jsx("mesh",{geometry:y,material:p,rotation:[Math.PI*.42,.15,0],renderOrder:2}),e.jsx("mesh",{geometry:R,material:k,renderOrder:3})]})}function me({controls:r}){const{eventHorizonRadius:u,lensingRadius:n,lensingStrength:t,lensingOpacity:a,lensingGlowIntensity:i}=r,l=u*n,m=s.useMemo(()=>new F(l,64,40),[l]),o=s.useMemo(()=>new v({vertexShader:ae,fragmentShader:se,uniforms:{uStrength:{value:t},uOpacity:{value:a},uGlowIntensity:{value:i}},transparent:!0,depthWrite:!1,blending:g,side:U}),[]);return s.useEffect(()=>{o.uniforms.uStrength.value=t,o.uniforms.uOpacity.value=a,o.uniforms.uGlowIntensity.value=i},[o,t,a,i]),s.useEffect(()=>()=>m.dispose(),[m]),s.useEffect(()=>()=>o.dispose(),[o]),e.jsx("mesh",{geometry:m,material:o,renderOrder:4})}function he({controls:r,reduceMotion:u}){const{starCount:n,starBrightness:t,starFieldRadius:a,animationSpeed:i}=r,l=s.useRef(0),m=s.useMemo(()=>ue(n,a),[n,a]),o=s.useMemo(()=>new v({vertexShader:ie,fragmentShader:oe,uniforms:{uTime:{value:0},uBrightness:{value:t}},transparent:!0,depthWrite:!1,blending:g}),[]);return s.useEffect(()=>{o.uniforms.uBrightness.value=t},[o,t]),s.useEffect(()=>()=>m.dispose(),[m]),s.useEffect(()=>()=>o.dispose(),[o]),j((f,x)=>{u||(l.current+=x*i*.4,o.uniforms.uTime.value=l.current)}),e.jsx("points",{geometry:m,material:o})}function pe({cameraDistance:r,autoRotate:u}){const{camera:n}=N(),t=s.useRef(r);return s.useEffect(()=>{t.current=r},[r]),j((a,i)=>{const l=n.position.length();if(Math.abs(l-t.current)>.01){const m=l+(t.current-l)*Math.min(i*2.5,1);n.position.setLength(m)}}),e.jsx(K,{enableDamping:!0,dampingFactor:.06,minDistance:2.5,maxDistance:60,autoRotate:u,autoRotateSpeed:.35})}function fe({controls:r,reduceMotion:u}){const{scene:n}=N();return s.useEffect(()=>{n.background=new B(0)},[n]),e.jsxs(e.Fragment,{children:[e.jsx(ce,{controls:r}),e.jsx(de,{controls:r,reduceMotion:u}),e.jsx(me,{controls:r}),e.jsx(he,{controls:r,reduceMotion:u}),e.jsx(pe,{cameraDistance:r.cameraDistance,autoRotate:r.autoRotate})]})}function ge({controls:r,setControls:u}){const n=t=>a=>u(i=>({...i,[t]:a}));return e.jsxs("aside",{className:d.panel,"aria-label":"Gargantua controls",children:[e.jsx("h3",{className:d.panelTitle,children:"Gargantua · Black Hole"}),e.jsx("p",{className:d.subtitle,children:"Cinematic black hole · adjust parameters below"}),e.jsxs("section",{className:d.section,children:[e.jsx("p",{className:d.sectionTitle,children:"Event Horizon"}),e.jsx(c,{label:"Radius",min:.4,max:2,step:.05,value:r.eventHorizonRadius,onChange:n("eventHorizonRadius")}),e.jsx(c,{label:"Lensing ϕ",min:1,max:2.5,step:.05,value:r.lensingRadius,onChange:n("lensingRadius")})]}),e.jsxs("section",{className:d.section,children:[e.jsx("p",{className:d.sectionTitle,children:"Accretion Disk"}),e.jsx(c,{label:"Inner Radius",min:1.05,max:2.5,step:.05,value:r.diskInnerRadius,onChange:n("diskInnerRadius")}),e.jsx(c,{label:"Outer Radius",min:2,max:7,step:.1,value:r.diskOuterRadius,onChange:n("diskOuterRadius")}),e.jsx(c,{label:"Brightness",min:.2,max:3,step:.05,value:r.diskBrightness,onChange:n("diskBrightness")}),e.jsx(c,{label:"Opacity",min:.1,max:1,step:.05,value:r.diskOpacity,onChange:n("diskOpacity")}),e.jsx(c,{label:"Rotation Speed",min:0,max:1.5,step:.02,value:r.diskRotationSpeed,onChange:n("diskRotationSpeed")}),e.jsx(c,{label:"Color Temp",min:0,max:1,step:.05,value:r.diskColorTemperature,onChange:n("diskColorTemperature"),format:t=>t.toFixed(2)}),e.jsx(c,{label:"Disk Tilt (°)",min:0,max:60,step:1,value:r.diskTilt,onChange:n("diskTilt"),format:t=>`${t}°`}),e.jsx(c,{label:"Turbulence",min:0,max:2,step:.05,value:r.turbulenceStrength,onChange:n("turbulenceStrength")})]}),e.jsxs("section",{className:d.section,children:[e.jsx("p",{className:d.sectionTitle,children:"Gravitational Lensing"}),e.jsx(c,{label:"Strength",min:0,max:1.5,step:.05,value:r.lensingStrength,onChange:n("lensingStrength")}),e.jsx(c,{label:"Opacity",min:0,max:1,step:.05,value:r.lensingOpacity,onChange:n("lensingOpacity")}),e.jsx(c,{label:"Glow",min:0,max:2,step:.05,value:r.lensingGlowIntensity,onChange:n("lensingGlowIntensity")})]}),e.jsxs("section",{className:d.section,children:[e.jsx("p",{className:d.sectionTitle,children:"Bloom"}),e.jsx(c,{label:"Intensity",min:0,max:5,step:.1,value:r.bloomIntensity,onChange:n("bloomIntensity")}),e.jsx(c,{label:"Radius",min:.1,max:1.5,step:.05,value:r.bloomRadius,onChange:n("bloomRadius")}),e.jsx(c,{label:"Threshold",min:0,max:1,step:.02,value:r.bloomThreshold,onChange:n("bloomThreshold")})]}),e.jsxs("section",{className:d.section,children:[e.jsx("p",{className:d.sectionTitle,children:"Starfield"}),e.jsx(c,{label:"Star Count",min:500,max:1e4,step:100,value:r.starCount,onChange:n("starCount"),format:t=>t.toFixed(0)}),e.jsx(c,{label:"Brightness",min:.1,max:2,step:.05,value:r.starBrightness,onChange:n("starBrightness")}),e.jsx(c,{label:"Field Radius",min:30,max:200,step:5,value:r.starFieldRadius,onChange:n("starFieldRadius"),format:t=>t.toFixed(0)})]}),e.jsxs("section",{className:d.section,children:[e.jsx("p",{className:d.sectionTitle,children:"Animation & Camera"}),e.jsx(c,{label:"Anim Speed",min:0,max:3,step:.05,value:r.animationSpeed,onChange:n("animationSpeed")}),e.jsx(c,{label:"Camera Dist",min:3,max:40,step:.5,value:r.cameraDistance,onChange:n("cameraDistance")}),e.jsxs("div",{className:d.toggleRow,children:[e.jsx("span",{className:d.label,children:"Auto-Rotate"}),e.jsx("input",{type:"checkbox",className:d.checkbox,checked:r.autoRotate,onChange:t=>u(a=>({...a,autoRotate:t.target.checked})),"aria-label":"Toggle camera auto-rotation"})]})]})]})}function be({width:r,height:u}){const[n,t]=s.useState(P),a=le(),i=[3.5,2.8,P.cameraDistance];return e.jsxs("div",{className:d.root,style:{width:r,height:u},children:[e.jsxs(H,{className:d.canvasHost,camera:{position:i,fov:48,near:.1,far:500},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[e.jsx(fe,{controls:n,reduceMotion:a}),e.jsx(V,{children:e.jsx(L,{intensity:n.bloomIntensity,radius:n.bloomRadius,luminanceThreshold:n.bloomThreshold,luminanceSmoothing:.55,mipmapBlur:!0})})]}),e.jsx(ge,{controls:n,setControls:t})]})}export{be as default};
