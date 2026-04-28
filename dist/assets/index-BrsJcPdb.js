import{r as l,c as N,k as A,j as n,C as T,E as L,l as W,e as F,P as I,V as R,R as D,b as C,m as H,S as V,A as k}from"./index-lOdmXX78.js";const B="_root_1nra7_1",X="_canvasHost_1nra7_17",G="_panel_1nra7_27",$="_panelTitle_1nra7_61",U="_subtitle_1nra7_77",z="_section_1nra7_91",Y="_sectionTitle_1nra7_95",q="_row_1nra7_111",K="_label_1nra7_127",Z="_value_1nra7_129",J="_slider_1nra7_133",O="_audioGrid_1nra7_147",Q="_button_1nra7_161",ee="_buttonActive_1nra7_193",ne="_fileLabel_1nra7_205",te="_fileInput_1nra7_207",re="_meters_1nra7_211",ae="_meter_1nra7_211",se="_meterLabel_1nra7_229",oe="_meterBar_1nra7_243",ie="_meterFill_1nra7_257",a={root:B,canvasHost:X,panel:G,panelTitle:$,subtitle:U,section:z,sectionTitle:Y,row:q,label:K,value:Z,slider:J,audioGrid:O,button:Q,buttonActive:ee,fileLabel:ne,fileInput:te,meters:re,meter:ae,meterLabel:se,meterBar:oe,meterFill:ie},le=`// Voronoi vertex shader — full-screen plane that exposes world XY + view direction\r
// for parallax-aware fragment work.\r
\r
varying vec2 vWorldXY;\r
varying vec3 vViewDir;\r
\r
void main() {\r
  vec4 worldPos = modelMatrix * vec4(position, 1.0);\r
  vWorldXY = worldPos.xy;\r
  // cameraPosition is provided automatically by three.js for ShaderMaterial.\r
  vViewDir = normalize(worldPos.xyz - cameraPosition);\r
  gl_Position = projectionMatrix * viewMatrix * worldPos;\r
}\r
`,ce=`// Voronoi fragment shader — seeded cells with edge SDF, parallax-shifted by per-cell\r
// height, and pointer + audio-pulse spotlights identical to the lattice piece.\r
\r
precision highp float;\r
\r
#define MAX_PULSES 8\r
\r
uniform float uTime;\r
uniform float uIntensity;\r
uniform float uSeed;\r
uniform float uDensity;\r
uniform float uParallax;\r
uniform float uSeamWidth;\r
\r
uniform vec2  uPointer;\r
uniform float uPointerStrength;\r
uniform float uPointerRadius;\r
\r
uniform int   uPulseCount;\r
uniform vec2  uPulsePos[MAX_PULSES];\r
uniform float uPulseI[MAX_PULSES];\r
uniform float uPulseHue[MAX_PULSES];\r
uniform float uPulseAge[MAX_PULSES];\r
uniform float uPulseTravel; // max world-space distance the wave travels\r
\r
varying vec2 vWorldXY;\r
varying vec3 vViewDir;\r
\r
vec2 hash2(vec2 p) {\r
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));\r
  return fract(sin(p) * 43758.5453);\r
}\r
\r
float hash1(vec2 p) {\r
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\r
}\r
\r
vec3 hsv2rgb(vec3 c) {\r
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\r
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\r
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\r
}\r
\r
vec3 colorField(vec2 p, float t) {\r
  float a = sin(p.x * 0.55 + t * 0.13);\r
  float b = sin(p.y * 0.47 - t * 0.11);\r
  float c = sin((p.x + p.y) * 0.31 + t * 0.07);\r
  float d = sin(length(p) * 0.62 - t * 0.09);\r
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * (c + d);\r
  float sat = 0.62 + 0.22 * sin(t * 0.05 + p.x * 0.4);\r
  return hsv2rgb(vec3(fract(hue), clamp(sat, 0.3, 0.9), 1.0));\r
}\r
\r
// Two-pass voronoi: first finds the nearest site, second computes the distance to\r
// the closest edge between that site and any neighbor. Returns:\r
//   x = edge distance\r
//   y = cell id hash (0..1)\r
//   z = per-cell height hash (-1..1)\r
struct VR {\r
  float edge;\r
  float cellId;\r
  float height;\r
};\r
\r
VR voronoi(vec2 x, float seed) {\r
  vec2 n = floor(x);\r
  vec2 f = fract(x);\r
\r
  vec2 mr = vec2(0.0);\r
  vec2 mg = vec2(0.0);\r
  float md = 1e9;\r
  for (int j = -1; j <= 1; j++) {\r
    for (int i = -1; i <= 1; i++) {\r
      vec2 g = vec2(float(i), float(j));\r
      vec2 o = hash2(n + g + seed);\r
      vec2 r = g + o - f;\r
      float d = dot(r, r);\r
      if (d < md) { md = d; mr = r; mg = g; }\r
    }\r
  }\r
\r
  float edge = 1e9;\r
  for (int j = -2; j <= 2; j++) {\r
    for (int i = -2; i <= 2; i++) {\r
      vec2 g = mg + vec2(float(i), float(j));\r
      vec2 o = hash2(n + g + seed);\r
      vec2 r = g + o - f;\r
      vec2 diff = r - mr;\r
      float lenSq = dot(diff, diff);\r
      if (lenSq > 1e-5) {\r
        float d = dot(0.5 * (mr + r), normalize(diff));\r
        edge = min(edge, d);\r
      }\r
    }\r
  }\r
\r
  vec2 cellCoord = n + mg;\r
  float cellId = hash1(cellCoord + seed * 17.0);\r
  float height = hash1(cellCoord + seed * 53.0 + 7.13) * 2.0 - 1.0;\r
\r
  VR vr;\r
  vr.edge = edge;\r
  vr.cellId = cellId;\r
  vr.height = height;\r
  return vr;\r
}\r
\r
void main() {\r
  // Density 1 ≈ one cell per world unit. Higher = more cells.\r
  vec2 p = vWorldXY * uDensity;\r
  float seed = uSeed;\r
\r
  // Pass 1: get height at unshifted position to drive parallax.\r
  VR vr0 = voronoi(p, seed);\r
  vec2 shift = vViewDir.xy * vr0.height * uParallax;\r
\r
  // Pass 2: re-evaluate at shifted position so cells appear lifted/sunken.\r
  VR vr = voronoi(p + shift, seed);\r
\r
  // Seam mask using edge distance. Width is in cell units.\r
  float halo = 1.0 - smoothstep(0.0, uSeamWidth * 6.0, vr.edge);\r
  float core = pow(1.0 - smoothstep(0.0, uSeamWidth, vr.edge), 2.0);\r
\r
  // World-space coords of the *visible* cell center (approximate, used for\r
  // pointer / pulse distance so spotlights track the parallaxed surface).\r
  vec2 worldShifted = vWorldXY + shift / max(uDensity, 0.0001);\r
\r
  // Pointer\r
  float pr = max(uPointerRadius, 0.001);\r
  float pd = length(worldShifted - uPointer);\r
  float pointerSpot = exp(-(pd * pd) / (pr * pr)) * uPointerStrength;\r
  vec3 pointerColor = colorField(worldShifted, uTime) * pointerSpot;\r
\r
  // Pulses — traveling waves that ripple outward and are gated by the seam\r
  // mask, so light effectively "follows" the voronoi edges for ~1–2 cells.\r
  float maxR = max(uPulseTravel, 0.001);\r
  vec3 pulseColor = vec3(0.0);\r
  float pulseSpot = 0.0;\r
  float edgePhase = vr.cellId * 6.2831 + vr.height * 3.0\r
                  + worldShifted.x * 0.6 + worldShifted.y * 0.4;\r
  for (int i = 0; i < MAX_PULSES; i++) {\r
    if (i >= uPulseCount) break;\r
    float ai = uPulseI[i];\r
    if (ai <= 0.001) continue;\r
\r
    float age = uPulseAge[i];\r
    vec2 d = worldShifted - uPulsePos[i];\r
    float dist = length(d);\r
\r
    // Wave front position grows with age. Slight ease-out for a snappy start.\r
    float front = maxR * (1.0 - pow(1.0 - age, 1.8));\r
    // Gaussian ring around the front. Wider than before so the wave reads with\r
    // similar luminance to the steady pointer spotlight.\r
    float ringSigma = max(0.32, maxR * 0.28 * (1.0 - age * 0.5));\r
    float ring = exp(-pow((dist - front) / ringSigma, 2.0));\r
\r
    // Fade the wave's amplitude as it ages — gentler curve so the tail stays\r
    // legible after the front passes.\r
    float life = pow(1.0 - age, 0.9);\r
\r
    // Keep beats legible but avoid overpowering the baseline pattern.\r
    float spot = ring * life * ai * 1.35;\r
    pulseSpot += spot;\r
\r
    // Iridescent hue sweep along the wave front.\r
    float ang = atan(d.y, d.x);\r
    float h = uPulseHue[i] + 0.18 * sin(ang * 2.0 + edgePhase) + 0.10 * vr.cellId;\r
    float sat = 0.65 + 0.30 * core;\r
    vec3 hue = hsv2rgb(vec3(fract(h), sat, 1.0));\r
    pulseColor += hue * spot;\r
  }\r
\r
  float totalSpot = pointerSpot + pulseSpot;\r
  if (totalSpot < 0.001) discard;\r
\r
  // Cells with greater height get a subtle warmth bias so 3D structure reads\r
  // even on lit seams.\r
  vec3 col = (pointerColor + pulseColor) * (halo * 0.48 + core * 2.25) * uIntensity;\r
  col *= 1.0 + 0.12 * vr.height;\r
\r
  gl_FragColor = vec4(col, halo * clamp(totalSpot, 0.0, 1.0));\r
}\r
`,S=8;function ue(){const[c,m]=l.useState(!1);return l.useEffect(()=>{const h=window.matchMedia("(prefers-reduced-motion: reduce)"),e=()=>m(h.matches);return e(),h.addEventListener("change",e),()=>h.removeEventListener("change",e)},[]),c}const E={audioGain:.95,smoothing:.82,reactivity:.62,beatThreshold:1.62,pulseRadius:4.1,pulseDecay:.9,pointerRadius:2.8,bloomIntensity:0,seed:137,density:.45,parallax:.08,seamWidth:.012};function de(c,m,h,e){const i=h*Math.PI/180,s=Math.tan(i/2)*e,o=Math.max(1e-4,c/m);return{worldHalfW:s*o,worldHalfH:s}}function me({sharedRef:c}){const{camera:m,gl:h}=F(),e=l.useRef(new A(0,0)),i=l.useMemo(()=>new I(new R(0,0,1),0),[]),s=l.useMemo(()=>new D,[]),o=l.useMemo(()=>new R,[]);return l.useEffect(()=>{const u=h.domElement,p=g=>{const d=u.getBoundingClientRect();e.current.set((g.clientX-d.left)/d.width*2-1,-((g.clientY-d.top)/d.height*2-1)),c.current.pointer.targetStrength=1},x=()=>{c.current.pointer.targetStrength=0};return u.addEventListener("pointermove",p),u.addEventListener("pointerleave",x),u.addEventListener("pointercancel",x),()=>{u.removeEventListener("pointermove",p),u.removeEventListener("pointerleave",x),u.removeEventListener("pointercancel",x)}},[h,c]),C((u,p)=>{s.setFromCamera(e.current,m),s.ray.intersectPlane(i,o)&&c.current.pointer.world.set(o.x,o.y);const x=1-Math.exp(-p*6),g=c.current.pointer;g.strength+=(g.targetStrength-g.strength)*x}),null}function he({dims:c,reduceMotion:m,sharedRef:h,controls:e,pulseDecayRef:i}){const s=l.useMemo(()=>new H(1,1),[]),o=l.useMemo(()=>{const x=new Array(S).fill(0).map(()=>new A(0,0)),g=new Float32Array(S),d=new Float32Array(S),f=new Float32Array(S);return new V({vertexShader:le,fragmentShader:ce,uniforms:{uTime:{value:0},uIntensity:{value:e.reactivity},uSeed:{value:e.seed},uDensity:{value:e.density},uParallax:{value:e.parallax},uSeamWidth:{value:e.seamWidth},uPointer:{value:new A(0,0)},uPointerStrength:{value:0},uPointerRadius:{value:e.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:x},uPulseI:{value:g},uPulseHue:{value:d},uPulseAge:{value:f},uPulseTravel:{value:e.pulseRadius}},transparent:!0,depthWrite:!1,blending:k})},[]);l.useEffect(()=>{o.uniforms.uIntensity.value=e.reactivity,o.uniforms.uSeed.value=e.seed,o.uniforms.uDensity.value=e.density,o.uniforms.uParallax.value=e.parallax,o.uniforms.uSeamWidth.value=e.seamWidth,o.uniforms.uPointerRadius.value=e.pointerRadius,o.uniforms.uPulseTravel.value=e.pulseRadius},[e,o]),l.useEffect(()=>{i.current=e.pulseDecay},[e.pulseDecay,i]),l.useEffect(()=>()=>{s.dispose(),o.dispose()},[s,o]),C((x,g)=>{const d=Math.min(g,.05);m||(o.uniforms.uTime.value+=d*.55);const f=h.current;o.uniforms.uPointer.value.copy(f.pointer.world),o.uniforms.uPointerStrength.value=f.pointer.strength;const _=i.current,t=f.pulses;for(let v=t.length-1;v>=0;v-=1){const b=t[v];b.age+=d/Math.max(b.lifetime,.05),b.intensity-=_*d*.4,(b.age>=1||b.intensity<=0)&&t.splice(v,1)}const r=Math.min(t.length,S),y=o.uniforms.uPulsePos.value,P=o.uniforms.uPulseI.value,j=o.uniforms.uPulseHue.value,M=o.uniforms.uPulseAge.value;for(let v=0;v<r;v+=1){const b=t[v];y[v].copy(b.pos),P[v]=b.intensity,j[v]=b.hue,M[v]=Math.min(1,b.age)}o.uniforms.uPulseCount.value=r});const u=c.worldHalfW*2.2,p=c.worldHalfH*2.2;return n.jsx("mesh",{geometry:s,material:o,scale:[u,p,1]})}function fe({bandsRef:c,sharedRef:m,dims:h,controls:e}){const i=l.useRef(0),s=l.useRef(0),o=l.useRef(999),u=l.useRef(0),p=l.useRef(Math.random());return C((x,g)=>{const d=Math.min(g,.1),f=c.current;f.bass>s.current?s.current=f.bass:s.current=Math.max(f.bass,s.current-d*4.5),i.current=i.current*.985+f.bass*.015,o.current+=d,u.current+=d;const _=e.beatThreshold,r=f.bass>.08&&s.current>i.current*_&&o.current>.28,y=!r&&u.current>1.6&&f.level>.08;if(r||y){o.current=r?0:o.current,u.current=0;const P=m.current.pulses;P.length>=S&&P.shift();const j=(Math.random()*2-1)*h.worldHalfW*.85,M=(Math.random()*2-1)*h.worldHalfH*.85,v=r?Math.max(f.bass,s.current-i.current):f.level*.7,b=Math.min(1.35,.32+v*.95);p.current=(p.current+.31+f.treble*.25)%1,P.push({pos:new A(j,M),intensity:b,hue:p.current,age:0,lifetime:2.1+Math.random()*.9})}}),null}function w({label:c,min:m,max:h,step:e,value:i,onChange:s,format:o}){const u=o?o(i):i.toFixed(2);return n.jsxs("div",{className:a.row,children:[n.jsx("span",{className:a.label,children:c}),n.jsx("span",{className:a.value,children:u}),n.jsx("input",{type:"range",className:a.slider,min:m,max:h,step:e,value:i,onChange:p=>s(Number(p.target.value))})]})}function ve({width:c,height:m}){const h=ue(),[e,i]=l.useState(E),s=N(),o=l.useRef(null),u=l.useRef(e.pulseDecay),p=22,x=l.useMemo(()=>{const t=Math.max(1e-4,c/m),r=c<480?4:6,y=p*Math.PI/180;return r/2/E.density/(Math.tan(y/2)*t)},[c,m]),g=l.useMemo(()=>de(c,m,p,x),[c,m,x]),d=l.useRef({pointer:{world:new A(0,0),strength:0,targetStrength:0},pulses:[]});l.useEffect(()=>{s.setGain(e.audioGain)},[s,e.audioGain]),l.useEffect(()=>{s.setSmoothing(e.smoothing)},[s,e.smoothing]),l.useEffect(()=>{let t=0;const r=()=>{const y=o.current;if(y){const P=s.bands.current,j=y.querySelectorAll(`.${a.meterFill}`),M=[P.bass,P.mid,P.treble,P.level];j.forEach((v,b)=>{v.style.width=`${Math.min(100,M[b]*130)}%`})}t=requestAnimationFrame(r)};return t=requestAnimationFrame(r),()=>cancelAnimationFrame(t)},[s.bands]);const f=t=>{var y;const r=(y=t.target.files)==null?void 0:y[0];r&&s.loadFile(r),t.target.value=""},_=()=>i(t=>({...t,seed:Math.floor(Math.random()*9999)}));return n.jsxs("div",{className:a.root,style:{width:c,height:m},children:[n.jsxs(T,{className:a.canvasHost,camera:{position:[0,0,x],fov:p,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[n.jsx(me,{sharedRef:d}),n.jsx(he,{dims:g,reduceMotion:h,sharedRef:d,controls:e,pulseDecayRef:u}),n.jsx(fe,{bandsRef:s.bands,sharedRef:d,dims:g,controls:e}),n.jsx(L,{children:n.jsx(W,{intensity:e.bloomIntensity,luminanceThreshold:.2,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),n.jsxs("aside",{className:a.panel,"aria-label":"Voronoi controls",children:[n.jsx("h3",{className:a.panelTitle,children:"Voronoi · Beat Cells"}),n.jsx("p",{className:a.subtitle,children:"Seeded voronoi tessellation with per-cell parallax. Hover to light edges with the cursor; every audio beat emits a pulse that ripples through the cells."}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Audio Source"}),n.jsxs("div",{className:a.audioGrid,children:[n.jsx("button",{type:"button",className:`${a.button} ${s.source==="demo"?a.buttonActive:""}`,onClick:()=>void s.loadDemo(),children:"Demo Pad"}),n.jsx("button",{type:"button",className:`${a.button} ${s.source==="mic"?a.buttonActive:""}`,onClick:()=>void s.enableMic(),children:"Microphone"}),n.jsx("button",{type:"button",className:`${a.button} ${s.source==="tab"?a.buttonActive:""}`,onClick:()=>{s.captureTab().catch(t=>{const r=t instanceof Error?t.message:String(t);window.alert(`Tab audio capture failed:

${r}`)})},children:"Tab Audio"}),n.jsxs("label",{className:`${a.button} ${a.fileLabel} ${s.source==="file"?a.buttonActive:""}`,children:["Load File",n.jsx("input",{className:a.fileInput,type:"file",accept:"audio/*",onChange:f})]}),n.jsx("button",{type:"button",className:a.button,onClick:()=>s.stop(),disabled:!s.isActive,children:"Stop"})]}),n.jsx("div",{className:a.meters,ref:o,children:["BASS","MID","TREBLE","LEVEL"].map(t=>n.jsxs("div",{className:a.meter,children:[n.jsx("span",{className:a.meterLabel,children:t}),n.jsx("span",{className:a.meterBar,children:n.jsx("span",{className:a.meterFill})})]},t))})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Audio Mix"}),n.jsx(w,{label:"Audio Gain",min:0,max:1.5,step:.01,value:e.audioGain,onChange:t=>i(r=>({...r,audioGain:t}))}),n.jsx(w,{label:"Smoothing",min:0,max:.96,step:.01,value:e.smoothing,onChange:t=>i(r=>({...r,smoothing:t}))}),n.jsx(w,{label:"Reactivity",min:0,max:2,step:.05,value:e.reactivity,onChange:t=>i(r=>({...r,reactivity:t}))}),n.jsx(w,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:e.beatThreshold,onChange:t=>i(r=>({...r,beatThreshold:t}))})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Cells"}),n.jsxs("div",{className:a.row,children:[n.jsx("span",{className:a.label,children:"Seed"}),n.jsx("span",{className:a.value,children:e.seed.toFixed(0)}),n.jsx("input",{type:"range",className:a.slider,min:0,max:9999,step:1,value:e.seed,onChange:t=>i(r=>({...r,seed:Number(t.target.value)}))})]}),n.jsx("button",{type:"button",className:a.button,onClick:_,children:"Randomize Seed"}),n.jsx(w,{label:"Density",min:.3,max:3,step:.05,value:e.density,onChange:t=>i(r=>({...r,density:t}))}),n.jsx(w,{label:"Parallax",min:0,max:1,step:.01,value:e.parallax,onChange:t=>i(r=>({...r,parallax:t}))}),n.jsx(w,{label:"Seam Width",min:.005,max:.06,step:.001,value:e.seamWidth,onChange:t=>i(r=>({...r,seamWidth:t})),format:t=>t.toFixed(3)})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Light"}),n.jsx(w,{label:"Pointer Radius",min:.5,max:6,step:.05,value:e.pointerRadius,onChange:t=>i(r=>({...r,pointerRadius:t}))}),n.jsx(w,{label:"Pulse Travel",min:.5,max:8,step:.05,value:e.pulseRadius,onChange:t=>i(r=>({...r,pulseRadius:t}))}),n.jsx(w,{label:"Pulse Decay",min:.3,max:4,step:.05,value:e.pulseDecay,onChange:t=>i(r=>({...r,pulseDecay:t}))}),n.jsx(w,{label:"Bloom",min:0,max:2.5,step:.05,value:e.bloomIntensity,onChange:t=>i(r=>({...r,bloomIntensity:t}))})]})]})]})}export{ve as default};
