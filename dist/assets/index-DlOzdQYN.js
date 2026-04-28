import{r as i,j as n}from"./index-3TOd4URH.js";import{C as G,u as E,_ as L,S as F,D as B,A as V,V as C,c as W,s as X,a0 as H}from"./react-three-fiber.esm-CSHYMaLq.js";import{E as U,B as K}from"./Bloom-DNvQo9IW.js";import{u as q}from"./useAudioAnalyser-BDNtSOon.js";const Z="_root_1nra7_1",O="_canvasHost_1nra7_17",Y="_panel_1nra7_27",J="_panelTitle_1nra7_61",Q="_subtitle_1nra7_77",ee="_section_1nra7_91",ne="_sectionTitle_1nra7_95",re="_row_1nra7_111",te="_label_1nra7_127",ae="_value_1nra7_129",oe="_slider_1nra7_133",se="_audioGrid_1nra7_147",ie="_button_1nra7_161",le="_buttonActive_1nra7_193",ue="_fileLabel_1nra7_205",ce="_fileInput_1nra7_207",me="_meters_1nra7_211",de="_meter_1nra7_211",fe="_meterLabel_1nra7_229",ve="_meterBar_1nra7_243",pe="_meterFill_1nra7_257",a={root:Z,canvasHost:O,panel:Y,panelTitle:J,subtitle:Q,section:ee,sectionTitle:ne,row:re,label:te,value:ae,slider:oe,audioGrid:se,button:ie,buttonActive:le,fileLabel:ue,fileInput:ce,meters:me,meter:de,meterLabel:fe,meterBar:ve,meterFill:pe},z=`// Apex vertex shader — inverted pyramid with bass-driven outward breathing.\r
\r
varying vec3 vNormal;\r
varying vec3 vViewDir;\r
varying vec3 vWorldPos;\r
\r
void main() {\r
  vec4 worldPos = modelMatrix * vec4(position, 1.0);\r
  vWorldPos = worldPos.xyz;\r
  vec4 mvPosition = viewMatrix * worldPos;\r
  vNormal = normalize(normalMatrix * normal);\r
  vViewDir = normalize(-mvPosition.xyz);\r
  gl_Position = projectionMatrix * mvPosition;\r
}\r
`,he=`// Apex fragment shader — luminescent iridescent mirage. The pyramid surface\r
// renders as fresnel-rim iridescence on a transparent additive layer, with\r
// overall presence driven by uMirage (1.0 on a beat, fading to a small floor).\r
\r
precision highp float;\r
\r
varying vec3 vNormal;\r
varying vec3 vViewDir;\r
varying vec3 vWorldPos;\r
\r
uniform float uTime;\r
uniform float uMirage;  // 0..1+ — beat-driven presence envelope\r
uniform float uTreble;  // hue sweep\r
uniform float uMid;     // body wash\r
uniform float uLevel;   // overall energy\r
\r
vec3 cosineSpectrum(float t, vec3 offset) {\r
  return 0.5 + 0.5 * cos(6.2831 * (offset + t));\r
}\r
\r
void main() {\r
  vec3 n = normalize(vNormal);\r
  vec3 v = normalize(vViewDir);\r
\r
  // Strong fresnel falloff — most of the visible body sits on the silhouette,\r
  // reading as a glowing wireframe-like outline rather than a solid form.\r
  float ndv = max(dot(n, v), 0.0);\r
  float rim = pow(1.0 - ndv, 3.0);\r
  float facing = pow(ndv, 1.5); // softer inner glow\r
\r
  // Per-face base hue from XZ angle so the four sides read distinctly.\r
  float faceAngle = atan(n.x, n.z) / 6.2831 + 0.5;\r
  float hueShift = uTime * 0.05 + uTreble * 0.6 + faceAngle * 0.3;\r
  vec3 iridColor = cosineSpectrum(rim * 1.1 + hueShift, vec3(0.55, 0.88, 1.22));\r
\r
  // Body colour — iridescent rim dominates, with a faint inner mid-band wash.\r
  vec3 rimColor = iridColor * (1.6 + uLevel * 1.4) * rim;\r
  vec3 innerWash = vec3(0.18, 0.42, 0.95) * uMid * 0.6 * facing;\r
\r
  vec3 col = rimColor + innerWash;\r
\r
  // Mirage envelope shapes both colour intensity and alpha so the shape\r
  // visibly emerges from black on each beat then dissolves back into haze.\r
  float mirage = clamp(uMirage, 0.0, 1.4);\r
  col *= mirage;\r
\r
  // Alpha: rim is mostly visible; inner faces are more translucent.\r
  float alpha = (rim * 0.95 + facing * 0.18) * mirage;\r
\r
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));\r
}\r
`,ge=`// Apex bleed shader — pyramid surface lit only by pointer + audio-pulse\r
// spotlights, exactly like the voronoi piece. Beat-driven pulses spawn at\r
// random points on the surface and bleed light outward across world space.\r
\r
precision highp float;\r
\r
#define MAX_PULSES 8\r
\r
varying vec3 vNormal;\r
varying vec3 vViewDir;\r
varying vec3 vWorldPos;\r
\r
uniform float uTime;\r
uniform float uIntensity;\r
\r
uniform vec3  uPointer;        // world-space pointer hit (xyz)\r
uniform float uPointerStrength;\r
uniform float uPointerRadius;\r
\r
uniform int   uPulseCount;\r
uniform vec3  uPulsePos[MAX_PULSES];\r
uniform float uPulseI[MAX_PULSES];\r
uniform float uPulseHue[MAX_PULSES];\r
uniform float uPulseAge[MAX_PULSES];\r
uniform float uPulseTravel;\r
\r
vec3 hsv2rgb(vec3 c) {\r
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\r
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\r
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\r
}\r
\r
vec3 colorField(vec3 p, float t) {\r
  float a = sin(p.x * 0.55 + t * 0.13);\r
  float b = sin(p.y * 0.47 - t * 0.11);\r
  float c = sin((p.x + p.z) * 0.31 + t * 0.07);\r
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * c;\r
  return hsv2rgb(vec3(fract(hue), 0.75, 1.0));\r
}\r
\r
void main() {\r
  vec3 n = normalize(vNormal);\r
  vec3 v = normalize(vViewDir);\r
\r
  // Subtle fresnel rim so the pyramid silhouette is always faintly visible\r
  // even between beats — gives the lights a surface to bleed across.\r
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.5);\r
  vec3 baseRim = vec3(0.18, 0.12, 0.32) * rim * 0.45;\r
\r
  // Pointer spotlight in 3D world space.\r
  float pr = max(uPointerRadius, 0.001);\r
  float pd = length(vWorldPos - uPointer);\r
  float pointerSpot = exp(-(pd * pd) / (pr * pr)) * uPointerStrength;\r
  vec3 pointerColor = colorField(vWorldPos, uTime) * pointerSpot;\r
\r
  // Audio pulses — traveling rings expanding from each pulse origin.\r
  float maxR = max(uPulseTravel, 0.001);\r
  vec3 pulseColor = vec3(0.0);\r
  float pulseSpot = 0.0;\r
  for (int i = 0; i < MAX_PULSES; i++) {\r
    if (i >= uPulseCount) break;\r
    float ai = uPulseI[i];\r
    if (ai <= 0.001) continue;\r
\r
    float age = uPulseAge[i];\r
    vec3 d = vWorldPos - uPulsePos[i];\r
    float dist = length(d);\r
\r
    // Wave front grows with age, with a slight ease-out start.\r
    float front = maxR * (1.0 - pow(1.0 - age, 1.8));\r
    float ringSigma = max(0.32, maxR * 0.28 * (1.0 - age * 0.5));\r
    float ring = exp(-pow((dist - front) / ringSigma, 2.0));\r
\r
    float life = pow(1.0 - age, 0.9);\r
    float spot = ring * life * ai * 2.4;\r
    pulseSpot += spot;\r
\r
    // Iridescent hue sweep around the wave.\r
    float ang = atan(d.y, d.x);\r
    float h = uPulseHue[i] + 0.18 * sin(ang * 2.0 + uTime * 0.4);\r
    vec3 hue = hsv2rgb(vec3(fract(h), 0.85, 1.0));\r
    pulseColor += hue * spot;\r
  }\r
\r
  // Brighten contributions on the rim so highlights "rake" along edges.\r
  float rimBoost = 0.6 + rim * 1.6;\r
  vec3 col = (pointerColor + pulseColor) * rimBoost * uIntensity + baseRim;\r
\r
  // Premultiplied additive — never write below baseRim.\r
  gl_FragColor = vec4(col, 1.0);\r
}\r
`,S=8;function be(){const[v,c]=i.useState(!1);return i.useEffect(()=>{const p=window.matchMedia("(prefers-reduced-motion: reduce)"),r=()=>c(p.matches);return r(),p.addEventListener("change",r),()=>p.removeEventListener("change",r)},[]),v}const N={mode:"mirage",audioGain:1.2,smoothing:.34,rotationSpeed:.25,reactivity:1.4,bloomIntensity:.9,zoom:12,beatThreshold:1.32,fadeDecay:1.3,mirageFloor:.06,pulseRadius:2.6,pulseDecay:1.2,pointerRadius:1.6};function w({label:v,min:c,max:p,step:r,value:o,onChange:s,format:m}){const h=m?m(o):o.toFixed(2);return n.jsxs("div",{className:a.row,children:[n.jsx("span",{className:a.label,children:v}),n.jsx("span",{className:a.value,children:h}),n.jsx("input",{type:"range",className:a.slider,min:c,max:p,step:r,value:o,onChange:e=>s(Number(e.target.value))})]})}function xe(){return{pointer:{world:new C,strength:0,targetStrength:0},pulses:[]}}function ye({sharedRef:v,meshRef:c}){const{camera:p,gl:r}=W(),o=i.useRef(new X(0,0)),s=i.useMemo(()=>new H,[]);return i.useEffect(()=>{const m=r.domElement,h=t=>{const l=m.getBoundingClientRect();o.current.set((t.clientX-l.left)/l.width*2-1,-((t.clientY-l.top)/l.height*2-1)),v.current.pointer.targetStrength=1},e=()=>{v.current.pointer.targetStrength=0};return m.addEventListener("pointermove",h),m.addEventListener("pointerleave",e),m.addEventListener("pointercancel",e),()=>{m.removeEventListener("pointermove",h),m.removeEventListener("pointerleave",e),m.removeEventListener("pointercancel",e)}},[r,v]),E((m,h)=>{s.setFromCamera(o.current,p);const e=c.current;if(e){const u=s.intersectObject(e,!1);u.length>0&&v.current.pointer.world.copy(u[0].point)}const t=1-Math.exp(-h*6),l=v.current.pointer;l.strength+=(l.targetStrength-l.strength)*t}),null}function Pe({zoom:v}){return E((c,p)=>{const r=1-Math.exp(-p*6),o=c.camera;o.position.x+=(0-o.position.x)*r,o.position.y+=(.6-o.position.y)*r,o.position.z+=(v-o.position.z)*r,o.lookAt(0,0,0)}),null}function we({bandsRef:v,controls:c,reduceMotion:p}){const r=i.useRef(null),o=i.useRef(0),s=i.useRef(0),m=i.useRef(999),h=i.useRef(0),e=i.useRef(0),t=i.useMemo(()=>{const u=new L(1,2,4,1);return u.rotateX(Math.PI),u},[]),l=i.useMemo(()=>new F({vertexShader:z,fragmentShader:he,uniforms:{uTime:{value:0},uMirage:{value:0},uTreble:{value:0},uMid:{value:0},uLevel:{value:0}},transparent:!0,depthWrite:!1,blending:V,side:B}),[]);return i.useEffect(()=>()=>{t.dispose(),l.dispose()},[t,l]),E((u,j)=>{const g=Math.min(j,.05),d=v.current,f=c.reactivity;d.bass>s.current?s.current=d.bass:s.current=Math.max(d.bass,s.current-g*4.5),o.current=o.current*.985+d.bass*.015,m.current+=g,h.current+=g;const _=d.bass>.08&&s.current>o.current*c.beatThreshold&&m.current>.16,M=!_&&h.current>1.1&&d.level>.05;if(_||M){m.current=_?0:m.current,h.current=0;const y=_?Math.max(d.bass,s.current-o.current):d.level*.7,T=Math.min(1.3,.7+y*f*1.6);e.current=Math.max(e.current,T)}const A=c.mirageFloor,R=Math.max(0,e.current-A);if(e.current=A+R*Math.exp(-g*c.fadeDecay),l.uniforms.uTime.value+=g,l.uniforms.uMirage.value=e.current,l.uniforms.uTreble.value=d.treble*f,l.uniforms.uMid.value=d.mid*f,l.uniforms.uLevel.value=d.level*f,!p&&r.current){const y=1+d.level*1.4;r.current.rotation.y+=g*c.rotationSpeed*y,r.current.rotation.x=Math.sin(l.uniforms.uTime.value*.3)*.06}}),n.jsx("mesh",{ref:r,geometry:t,material:l})}function _e({bandsRef:v,controls:c,reduceMotion:p}){const r=i.useRef(null),o=i.useRef(0),s=i.useRef(0),m=i.useRef(999),h=i.useRef(0),e=i.useRef(Math.random()),t=i.useRef(xe()),l=i.useMemo(()=>{const g=new L(1,2,4,1);return g.rotateX(Math.PI),g},[]),u=i.useMemo(()=>{const g=new Array(S).fill(0).map(()=>new C),d=new Float32Array(S),f=new Float32Array(S),x=new Float32Array(S);return new F({vertexShader:z,fragmentShader:ge,uniforms:{uTime:{value:0},uIntensity:{value:c.reactivity},uPointer:{value:new C},uPointerStrength:{value:0},uPointerRadius:{value:c.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:g},uPulseI:{value:d},uPulseHue:{value:f},uPulseAge:{value:x},uPulseTravel:{value:c.pulseRadius}},side:B})},[]);i.useEffect(()=>{u.uniforms.uIntensity.value=c.reactivity,u.uniforms.uPointerRadius.value=c.pointerRadius,u.uniforms.uPulseTravel.value=c.pulseRadius},[c,u]),i.useEffect(()=>()=>{l.dispose(),u.dispose()},[l,u]);const j=g=>{const d=r.current;if(!d)return;const f=Math.random()*Math.PI*2,x=Math.pow(Math.random(),.7),_=x,M=-1+2*x,R=new C(Math.cos(f)*_,M,Math.sin(f)*_).applyMatrix4(d.matrixWorld),y=t.current.pulses;y.length>=S&&y.shift(),e.current=(e.current+.31)%1,y.push({pos:R,intensity:g,hue:e.current,age:0,lifetime:.85+Math.random()*.4})};return E((g,d)=>{const f=Math.min(d,.05),x=v.current;x.bass>s.current?s.current=x.bass:s.current=Math.max(x.bass,s.current-f*4.5),o.current=o.current*.985+x.bass*.015,m.current+=f,h.current+=f;const M=x.bass>.08&&s.current>o.current*c.beatThreshold&&m.current>.14,A=!M&&h.current>.9&&x.level>.06;if(M||A){m.current=M?0:m.current,h.current=0;const b=M?Math.max(x.bass,s.current-o.current):x.level*.7,P=Math.min(2.2,.5+b*1.8);j(P)}const R=c.pulseDecay,y=t.current.pulses;for(let b=y.length-1;b>=0;b-=1){const P=y[b];P.age+=f/Math.max(P.lifetime,.05),P.intensity-=R*f*.4,(P.age>=1||P.intensity<=0)&&y.splice(b,1)}const T=Math.min(y.length,S),D=u.uniforms.uPulsePos.value,I=u.uniforms.uPulseI.value,k=u.uniforms.uPulseHue.value,$=u.uniforms.uPulseAge.value;for(let b=0;b<T;b+=1){const P=y[b];D[b].copy(P.pos),I[b]=P.intensity,k[b]=P.hue,$[b]=Math.min(1,P.age)}if(u.uniforms.uPulseCount.value=T,u.uniforms.uTime.value+=f,u.uniforms.uPointer.value.copy(t.current.pointer.world),u.uniforms.uPointerStrength.value=t.current.pointer.strength,!p&&r.current){const b=1+x.level*1.4;r.current.rotation.y+=f*c.rotationSpeed*b,r.current.rotation.x=Math.sin(u.uniforms.uTime.value*.3)*.06}}),n.jsxs(n.Fragment,{children:[n.jsx(ye,{sharedRef:t,meshRef:r}),n.jsx("mesh",{ref:r,geometry:l,material:u})]})}function Re({width:v,height:c}){const p=be(),[r,o]=i.useState(N),s=q(),m=i.useRef(null);i.useEffect(()=>{s.setGain(r.audioGain)},[s,r.audioGain]),i.useEffect(()=>{s.setSmoothing(r.smoothing)},[s,r.smoothing]),i.useEffect(()=>{let e=0;const t=()=>{const l=m.current;if(l){const u=s.bands.current,j=l.querySelectorAll(`.${a.meterFill}`),g=[u.bass,u.mid,u.treble,u.level];j.forEach((d,f)=>{d.style.width=`${Math.min(100,g[f]*130)}%`})}e=requestAnimationFrame(t)};return e=requestAnimationFrame(t),()=>cancelAnimationFrame(e)},[s.bands]);const h=e=>{var l;const t=(l=e.target.files)==null?void 0:l[0];t&&s.loadFile(t),e.target.value=""};return n.jsxs("div",{className:a.root,style:{width:v,height:c},children:[n.jsxs(G,{className:a.canvasHost,camera:{position:[0,.6,N.zoom],fov:35},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[n.jsx(Pe,{zoom:r.zoom}),r.mode==="mirage"?n.jsx(we,{bandsRef:s.bands,controls:r,reduceMotion:p}):n.jsx(_e,{bandsRef:s.bands,controls:r,reduceMotion:p}),n.jsx(U,{children:n.jsx(K,{intensity:r.bloomIntensity,luminanceThreshold:.15,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),n.jsxs("aside",{className:a.panel,"aria-label":"Apex controls",children:[n.jsx("h3",{className:a.panelTitle,children:"Apex · Inverted Pyramid"}),n.jsx("p",{className:a.subtitle,children:r.mode==="mirage"?"A luminescent iridescent mirage. The pyramid surfaces from the dark on every beat, then fades back into haze.":"Voronoi-style pointer + audio-pulse spotlights bleed iridescent light across the pyramid surface."}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Mode"}),n.jsxs("div",{className:a.audioGrid,children:[n.jsx("button",{type:"button",className:`${a.button} ${r.mode==="mirage"?a.buttonActive:""}`,onClick:()=>o(e=>({...e,mode:"mirage"})),children:"Mirage"}),n.jsx("button",{type:"button",className:`${a.button} ${r.mode==="bleed"?a.buttonActive:""}`,onClick:()=>o(e=>({...e,mode:"bleed"})),children:"Bleed Lights"})]})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Audio Source"}),n.jsxs("div",{className:a.audioGrid,children:[n.jsx("button",{type:"button",className:`${a.button} ${s.source==="demo"?a.buttonActive:""}`,onClick:()=>void s.loadDemo(),children:"Demo Pad"}),n.jsx("button",{type:"button",className:`${a.button} ${s.source==="mic"?a.buttonActive:""}`,onClick:()=>void s.enableMic(),children:"Microphone"}),n.jsx("button",{type:"button",className:`${a.button} ${s.source==="tab"?a.buttonActive:""}`,onClick:()=>{s.captureTab().catch(e=>{const t=e instanceof Error?e.message:String(e);window.alert(`Tab audio capture failed:

${t}`)})},children:"Tab Audio"}),n.jsxs("label",{className:`${a.button} ${a.fileLabel} ${s.source==="file"?a.buttonActive:""}`,children:["Load File",n.jsx("input",{className:a.fileInput,type:"file",accept:"audio/*",onChange:h})]}),n.jsx("button",{type:"button",className:a.button,onClick:()=>s.stop(),disabled:!s.isActive,children:"Stop"})]}),n.jsx("div",{className:a.meters,ref:m,children:["BASS","MID","TREBLE","LEVEL"].map(e=>n.jsxs("div",{className:a.meter,children:[n.jsx("span",{className:a.meterLabel,children:e}),n.jsx("span",{className:a.meterBar,children:n.jsx("span",{className:a.meterFill})})]},e))})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Audio"}),n.jsx(w,{label:"Audio Gain",min:0,max:1.5,step:.01,value:r.audioGain,onChange:e=>o(t=>({...t,audioGain:e}))}),n.jsx(w,{label:"Smoothing",min:0,max:.96,step:.01,value:r.smoothing,onChange:e=>o(t=>({...t,smoothing:e}))}),n.jsx(w,{label:"Reactivity",min:0,max:2.5,step:.05,value:r.reactivity,onChange:e=>o(t=>({...t,reactivity:e}))}),n.jsx(w,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:r.beatThreshold,onChange:e=>o(t=>({...t,beatThreshold:e}))})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Visuals"}),n.jsx(w,{label:"Zoom",min:3,max:30,step:.1,value:r.zoom,onChange:e=>o(t=>({...t,zoom:e})),format:e=>e.toFixed(1)}),n.jsx(w,{label:"Rotation Speed",min:0,max:1,step:.01,value:r.rotationSpeed,onChange:e=>o(t=>({...t,rotationSpeed:e}))}),r.mode==="mirage"&&n.jsxs(n.Fragment,{children:[n.jsx(w,{label:"Fade Decay",min:.3,max:4,step:.05,value:r.fadeDecay,onChange:e=>o(t=>({...t,fadeDecay:e}))}),n.jsx(w,{label:"Mirage Floor",min:0,max:.4,step:.01,value:r.mirageFloor,onChange:e=>o(t=>({...t,mirageFloor:e}))})]}),r.mode==="bleed"&&n.jsxs(n.Fragment,{children:[n.jsx(w,{label:"Pulse Radius",min:.5,max:6,step:.05,value:r.pulseRadius,onChange:e=>o(t=>({...t,pulseRadius:e}))}),n.jsx(w,{label:"Pulse Decay",min:.2,max:4,step:.05,value:r.pulseDecay,onChange:e=>o(t=>({...t,pulseDecay:e}))}),n.jsx(w,{label:"Pointer Radius",min:.3,max:4,step:.05,value:r.pointerRadius,onChange:e=>o(t=>({...t,pointerRadius:e}))})]}),n.jsx(w,{label:"Bloom",min:0,max:2.5,step:.05,value:r.bloomIntensity,onChange:e=>o(t=>({...t,bloomIntensity:e}))})]})]})]})}export{Re as default};
