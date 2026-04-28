import{r as i,c as V,j as n,C as W,E as X,k as H,b as C,a0 as L,S as k,D as B,A as U,V as T,e as K,w as q,a2 as Z}from"./index-CFoTI59D.js";const O="_root_1nra7_1",Y="_canvasHost_1nra7_17",J="_panel_1nra7_27",Q="_panelTitle_1nra7_61",ee="_subtitle_1nra7_77",ne="_section_1nra7_91",re="_sectionTitle_1nra7_95",te="_row_1nra7_111",ae="_label_1nra7_127",oe="_value_1nra7_129",se="_slider_1nra7_133",ie="_audioGrid_1nra7_147",le="_button_1nra7_161",ce="_buttonActive_1nra7_193",ue="_fileLabel_1nra7_205",me="_fileInput_1nra7_207",de="_meters_1nra7_211",fe="_meter_1nra7_211",pe="_meterLabel_1nra7_229",ve="_meterBar_1nra7_243",he="_meterFill_1nra7_257",a={root:O,canvasHost:Y,panel:J,panelTitle:Q,subtitle:ee,section:ne,sectionTitle:re,row:te,label:ae,value:oe,slider:se,audioGrid:ie,button:le,buttonActive:ce,fileLabel:ue,fileInput:me,meters:de,meter:fe,meterLabel:pe,meterBar:ve,meterFill:he},z=`// Apex vertex shader — inverted pyramid with bass-driven outward breathing.\r
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
`,ge=`// Apex fragment shader — luminescent iridescent mirage. The pyramid surface\r
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
`,be=`// Apex bleed shader — pyramid surface lit only by pointer + audio-pulse\r
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
uniform int   uEffect; // 0=rings, 1=bloom, 2=streaks, 3=sparkle\r
\r
float hash13(vec3 p) {\r
  p = fract(p * 0.1031);\r
  p += dot(p, p.yzx + 19.19);\r
  return fract((p.x + p.y) * p.z);\r
}\r
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
  // Audio pulses — behavior depends on uEffect.\r
  float maxR = max(uPulseTravel, 0.001);\r
  vec3 pulseColor = vec3(0.0);\r
  for (int i = 0; i < MAX_PULSES; i++) {\r
    if (i >= uPulseCount) break;\r
    float ai = uPulseI[i];\r
    if (ai <= 0.001) continue;\r
\r
    float age = uPulseAge[i];\r
    vec3 d = vWorldPos - uPulsePos[i];\r
    float dist = length(d);\r
    float life = pow(1.0 - age, 0.9);\r
\r
    float spot = 0.0;\r
    if (uEffect == 0) {\r
      // Rings: traveling expanding wavefront.\r
      float front = maxR * (1.0 - pow(1.0 - age, 1.8));\r
      float ringSigma = max(0.32, maxR * 0.28 * (1.0 - age * 0.5));\r
      float ring = exp(-pow((dist - front) / ringSigma, 2.0));\r
      spot = ring * life * ai * 1.5;\r
    } else if (uEffect == 1) {\r
      // Bloom: stationary radial glow that softly grows then fades.\r
      float grow = mix(0.55, 1.15, smoothstep(0.0, 0.4, age));\r
      float sigma = max(0.001, maxR * 0.55 * grow);\r
      float glow = exp(-(dist * dist) / (sigma * sigma));\r
      spot = glow * life * ai * 1.3;\r
    } else if (uEffect == 2) {\r
      // Streaks: anisotropic vertical sweep that travels upward.\r
      float front = maxR * (1.0 - pow(1.0 - age, 1.8));\r
      float dy = abs(d.y - front * 0.5);\r
      float dxz = length(d.xz);\r
      float bandSigma = max(0.25, maxR * 0.22);\r
      float widthSigma = max(0.001, maxR * 0.9);\r
      float band = exp(-pow(dy / bandSigma, 2.0));\r
      float width = exp(-pow(dxz / widthSigma, 2.0));\r
      spot = band * width * life * ai * 1.6;\r
    } else {\r
      // Sparkle: many short-lived granular hotspots around the pulse pos.\r
      float sigma = max(0.001, maxR * 0.7);\r
      float falloff = exp(-(dist * dist) / (sigma * sigma));\r
      vec3 cell = floor(vWorldPos * 6.0);\r
      float n = hash13(cell + floor(uTime * 9.0 + float(i) * 3.7));\r
      float sparkle = step(0.78, n) * (1.0 + n * 0.6);\r
      spot = falloff * sparkle * life * ai * 1.8;\r
    }\r
\r
    // Iridescent hue sweep around the wave.\r
    float ang = atan(d.y, d.x);\r
    float h = uPulseHue[i] + 0.18 * sin(ang * 2.0 + uTime * 0.4);\r
    vec3 hue = hsv2rgb(vec3(fract(h), 0.85, 1.0));\r
    pulseColor += hue * spot;\r
  }\r
\r
  // Brighten contributions on the rim so highlights "rake" along edges.\r
  float rimBoost = 0.45 + rim * 1.2;\r
  vec3 col = (pointerColor + pulseColor) * rimBoost * uIntensity + baseRim;\r
\r
  // Premultiplied additive — never write below baseRim.\r
  gl_FragColor = vec4(col, 1.0);\r
}\r
`,M=8,xe=[{id:"rings",label:"Rings"},{id:"bloom",label:"Bloom"},{id:"streaks",label:"Streaks"},{id:"sparkle",label:"Sparkle"}],N={rings:0,bloom:1,streaks:2,sparkle:3};function ye(){const[p,c]=i.useState(!1);return i.useEffect(()=>{const v=window.matchMedia("(prefers-reduced-motion: reduce)"),r=()=>c(v.matches);return r(),v.addEventListener("change",r),()=>v.removeEventListener("change",r)},[]),p}const F={mode:"bleed",bleedEffect:"rings",audioGain:1.2,smoothing:.34,rotationSpeed:.25,reactivity:1,bloomIntensity:.7,zoom:12,beatThreshold:1.32,fadeDecay:1.3,mirageFloor:.06,pulseRadius:2.6,pulseDecay:1.2,pointerRadius:1.6};function P({label:p,min:c,max:v,step:r,value:o,onChange:s,format:m}){const h=m?m(o):o.toFixed(2);return n.jsxs("div",{className:a.row,children:[n.jsx("span",{className:a.label,children:p}),n.jsx("span",{className:a.value,children:h}),n.jsx("input",{type:"range",className:a.slider,min:c,max:v,step:r,value:o,onChange:e=>s(Number(e.target.value))})]})}function we(){return{pointer:{world:new T,strength:0,targetStrength:0},pulses:[]}}function Pe({sharedRef:p,meshRef:c}){const{camera:v,gl:r}=K(),o=i.useRef(new q(0,0)),s=i.useMemo(()=>new Z,[]);return i.useEffect(()=>{const m=r.domElement,h=t=>{const u=m.getBoundingClientRect();o.current.set((t.clientX-u.left)/u.width*2-1,-((t.clientY-u.top)/u.height*2-1)),p.current.pointer.targetStrength=1},e=()=>{p.current.pointer.targetStrength=0};return m.addEventListener("pointermove",h),m.addEventListener("pointerleave",e),m.addEventListener("pointercancel",e),()=>{m.removeEventListener("pointermove",h),m.removeEventListener("pointerleave",e),m.removeEventListener("pointercancel",e)}},[r,p]),C((m,h)=>{s.setFromCamera(o.current,v);const e=c.current;if(e){const l=s.intersectObject(e,!1);l.length>0&&p.current.pointer.world.copy(l[0].point)}const t=1-Math.exp(-h*6),u=p.current.pointer;u.strength+=(u.targetStrength-u.strength)*t}),null}function _e({zoom:p}){return C((c,v)=>{const r=1-Math.exp(-v*6),o=c.camera;o.position.x+=(0-o.position.x)*r,o.position.y+=(.6-o.position.y)*r,o.position.z+=(p-o.position.z)*r,o.lookAt(0,0,0)}),null}function Se({bandsRef:p,controls:c,reduceMotion:v}){const r=i.useRef(null),o=i.useRef(0),s=i.useRef(0),m=i.useRef(999),h=i.useRef(0),e=i.useRef(0),t=i.useMemo(()=>{const l=new L(1,2,4,1);return l.rotateX(Math.PI),l},[]),u=i.useMemo(()=>new k({vertexShader:z,fragmentShader:ge,uniforms:{uTime:{value:0},uMirage:{value:0},uTreble:{value:0},uMid:{value:0},uLevel:{value:0}},transparent:!0,depthWrite:!1,blending:U,side:B}),[]);return i.useEffect(()=>()=>{t.dispose(),u.dispose()},[t,u]),C((l,j)=>{const g=Math.min(j,.05),d=p.current,f=c.reactivity;d.bass>s.current?s.current=d.bass:s.current=Math.max(d.bass,s.current-g*4.5),o.current=o.current*.985+d.bass*.015,m.current+=g,h.current+=g;const _=d.bass>.08&&s.current>o.current*c.beatThreshold&&m.current>.16,S=!_&&h.current>1.1&&d.level>.05;if(_||S){m.current=_?0:m.current,h.current=0;const y=_?Math.max(d.bass,s.current-o.current):d.level*.7,R=Math.min(1.3,.7+y*f*1.6);e.current=Math.max(e.current,R)}const E=c.mirageFloor,A=Math.max(0,e.current-E);if(e.current=E+A*Math.exp(-g*c.fadeDecay),u.uniforms.uTime.value+=g,u.uniforms.uMirage.value=e.current,u.uniforms.uTreble.value=d.treble*f,u.uniforms.uMid.value=d.mid*f,u.uniforms.uLevel.value=d.level*f,!v&&r.current){const y=1+d.level*1.4;r.current.rotation.y+=g*c.rotationSpeed*y,r.current.rotation.x=Math.sin(u.uniforms.uTime.value*.3)*.06}}),n.jsx("mesh",{ref:r,geometry:t,material:u})}function Me({bandsRef:p,controls:c,reduceMotion:v}){const r=i.useRef(null),o=i.useRef(0),s=i.useRef(0),m=i.useRef(999),h=i.useRef(0),e=i.useRef(Math.random()),t=i.useRef(we()),u=i.useMemo(()=>{const g=new L(1,2,4,1);return g.rotateX(Math.PI),g},[]),l=i.useMemo(()=>{const g=new Array(M).fill(0).map(()=>new T),d=new Float32Array(M),f=new Float32Array(M),x=new Float32Array(M);return new k({vertexShader:z,fragmentShader:be,uniforms:{uTime:{value:0},uIntensity:{value:c.reactivity},uPointer:{value:new T},uPointerStrength:{value:0},uPointerRadius:{value:c.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:g},uPulseI:{value:d},uPulseHue:{value:f},uPulseAge:{value:x},uPulseTravel:{value:c.pulseRadius},uEffect:{value:N[c.bleedEffect]}},side:B})},[]);i.useEffect(()=>{l.uniforms.uIntensity.value=c.reactivity,l.uniforms.uPointerRadius.value=c.pointerRadius,l.uniforms.uPulseTravel.value=c.pulseRadius,l.uniforms.uEffect.value=N[c.bleedEffect]},[c,l]),i.useEffect(()=>()=>{u.dispose(),l.dispose()},[u,l]);const j=g=>{const d=r.current;if(!d)return;const f=Math.random()*Math.PI*2,x=Math.pow(Math.random(),.7),_=x,S=-1+2*x,A=new T(Math.cos(f)*_,S,Math.sin(f)*_).applyMatrix4(d.matrixWorld),y=t.current.pulses;y.length>=M&&y.shift(),e.current=(e.current+.31)%1,y.push({pos:A,intensity:g,hue:e.current,age:0,lifetime:.85+Math.random()*.4})};return C((g,d)=>{const f=Math.min(d,.05),x=p.current;x.bass>s.current?s.current=x.bass:s.current=Math.max(x.bass,s.current-f*4.5),o.current=o.current*.985+x.bass*.015,m.current+=f,h.current+=f;const S=x.bass>.08&&s.current>o.current*c.beatThreshold&&m.current>.14,E=!S&&h.current>.9&&x.level>.06;if(S||E){m.current=S?0:m.current,h.current=0;const b=S?Math.max(x.bass,s.current-o.current):x.level*.7,w=Math.min(2.2,.5+b*1.8);j(w)}const A=c.pulseDecay,y=t.current.pulses;for(let b=y.length-1;b>=0;b-=1){const w=y[b];w.age+=f/Math.max(w.lifetime,.05),w.intensity-=A*f*.4,(w.age>=1||w.intensity<=0)&&y.splice(b,1)}const R=Math.min(y.length,M),D=l.uniforms.uPulsePos.value,I=l.uniforms.uPulseI.value,$=l.uniforms.uPulseHue.value,G=l.uniforms.uPulseAge.value;for(let b=0;b<R;b+=1){const w=y[b];D[b].copy(w.pos),I[b]=w.intensity,$[b]=w.hue,G[b]=Math.min(1,w.age)}if(l.uniforms.uPulseCount.value=R,l.uniforms.uTime.value+=f,l.uniforms.uPointer.value.copy(t.current.pointer.world),l.uniforms.uPointerStrength.value=t.current.pointer.strength,!v&&r.current){const b=1+x.level*1.4;r.current.rotation.y+=f*c.rotationSpeed*b,r.current.rotation.x=Math.sin(l.uniforms.uTime.value*.3)*.06}}),n.jsxs(n.Fragment,{children:[n.jsx(Pe,{sharedRef:t,meshRef:r}),n.jsx("mesh",{ref:r,geometry:u,material:l})]})}function Ee({width:p,height:c}){const v=ye(),[r,o]=i.useState(F),s=V(),m=i.useRef(null);i.useEffect(()=>{s.setGain(r.audioGain)},[s,r.audioGain]),i.useEffect(()=>{s.setSmoothing(r.smoothing)},[s,r.smoothing]),i.useEffect(()=>{let e=0;const t=()=>{const u=m.current;if(u){const l=s.bands.current,j=u.querySelectorAll(`.${a.meterFill}`),g=[l.bass,l.mid,l.treble,l.level];j.forEach((d,f)=>{d.style.width=`${Math.min(100,g[f]*130)}%`})}e=requestAnimationFrame(t)};return e=requestAnimationFrame(t),()=>cancelAnimationFrame(e)},[s.bands]);const h=e=>{var u;const t=(u=e.target.files)==null?void 0:u[0];t&&s.loadFile(t),e.target.value=""};return n.jsxs("div",{className:a.root,style:{width:p,height:c},children:[n.jsxs(W,{className:a.canvasHost,camera:{position:[0,.6,F.zoom],fov:35},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[n.jsx(_e,{zoom:r.zoom}),r.mode==="mirage"?n.jsx(Se,{bandsRef:s.bands,controls:r,reduceMotion:v}):n.jsx(Me,{bandsRef:s.bands,controls:r,reduceMotion:v}),n.jsx(X,{children:n.jsx(H,{intensity:r.bloomIntensity,luminanceThreshold:.15,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),n.jsxs("aside",{className:a.panel,"aria-label":"Apex controls",children:[n.jsx("h3",{className:a.panelTitle,children:"Apex · Inverted Pyramid"}),n.jsx("p",{className:a.subtitle,children:r.mode==="mirage"?"A luminescent iridescent mirage. The pyramid surfaces from the dark on every beat, then fades back into haze.":"Voronoi-style pointer + audio-pulse spotlights bleed iridescent light across the pyramid surface."}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Mode"}),n.jsxs("div",{className:a.audioGrid,children:[n.jsx("button",{type:"button",className:`${a.button} ${r.mode==="mirage"?a.buttonActive:""}`,onClick:()=>o(e=>({...e,mode:"mirage"})),children:"Mirage"}),n.jsx("button",{type:"button",className:`${a.button} ${r.mode==="bleed"?a.buttonActive:""}`,onClick:()=>o(e=>({...e,mode:"bleed"})),children:"Bleed Lights"})]})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Audio Source"}),n.jsxs("div",{className:a.audioGrid,children:[n.jsx("button",{type:"button",className:`${a.button} ${s.source==="demo"?a.buttonActive:""}`,onClick:()=>void s.loadDemo(),children:"Demo Pad"}),n.jsx("button",{type:"button",className:`${a.button} ${s.source==="mic"?a.buttonActive:""}`,onClick:()=>void s.enableMic(),children:"Microphone"}),n.jsx("button",{type:"button",className:`${a.button} ${s.source==="tab"?a.buttonActive:""}`,onClick:()=>{s.captureTab().catch(e=>{const t=e instanceof Error?e.message:String(e);window.alert(`Tab audio capture failed:

${t}`)})},children:"Tab Audio"}),n.jsxs("label",{className:`${a.button} ${a.fileLabel} ${s.source==="file"?a.buttonActive:""}`,children:["Load File",n.jsx("input",{className:a.fileInput,type:"file",accept:"audio/*",onChange:h})]}),n.jsx("button",{type:"button",className:a.button,onClick:()=>s.stop(),disabled:!s.isActive,children:"Stop"})]}),n.jsx("div",{className:a.meters,ref:m,children:["BASS","MID","TREBLE","LEVEL"].map(e=>n.jsxs("div",{className:a.meter,children:[n.jsx("span",{className:a.meterLabel,children:e}),n.jsx("span",{className:a.meterBar,children:n.jsx("span",{className:a.meterFill})})]},e))})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Audio"}),n.jsx(P,{label:"Audio Gain",min:0,max:1.5,step:.01,value:r.audioGain,onChange:e=>o(t=>({...t,audioGain:e}))}),n.jsx(P,{label:"Smoothing",min:0,max:.96,step:.01,value:r.smoothing,onChange:e=>o(t=>({...t,smoothing:e}))}),n.jsx(P,{label:"Reactivity",min:0,max:2.5,step:.05,value:r.reactivity,onChange:e=>o(t=>({...t,reactivity:e}))}),n.jsx(P,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:r.beatThreshold,onChange:e=>o(t=>({...t,beatThreshold:e}))})]}),n.jsxs("section",{className:a.section,children:[n.jsx("p",{className:a.sectionTitle,children:"Visuals"}),n.jsx(P,{label:"Zoom",min:3,max:30,step:.1,value:r.zoom,onChange:e=>o(t=>({...t,zoom:e})),format:e=>e.toFixed(1)}),n.jsx(P,{label:"Rotation Speed",min:0,max:1,step:.01,value:r.rotationSpeed,onChange:e=>o(t=>({...t,rotationSpeed:e}))}),r.mode==="mirage"&&n.jsxs(n.Fragment,{children:[n.jsx(P,{label:"Fade Decay",min:.3,max:4,step:.05,value:r.fadeDecay,onChange:e=>o(t=>({...t,fadeDecay:e}))}),n.jsx(P,{label:"Mirage Floor",min:0,max:.4,step:.01,value:r.mirageFloor,onChange:e=>o(t=>({...t,mirageFloor:e}))})]}),r.mode==="bleed"&&n.jsxs(n.Fragment,{children:[n.jsx("div",{className:a.row,children:n.jsx("span",{className:a.label,children:"Effect"})}),n.jsx("div",{className:a.audioGrid,children:xe.map(e=>n.jsx("button",{type:"button",className:`${a.button} ${r.bleedEffect===e.id?a.buttonActive:""}`,onClick:()=>o(t=>({...t,bleedEffect:e.id})),children:e.label},e.id))}),n.jsx(P,{label:"Pulse Radius",min:.5,max:6,step:.05,value:r.pulseRadius,onChange:e=>o(t=>({...t,pulseRadius:e}))}),n.jsx(P,{label:"Pulse Decay",min:.2,max:4,step:.05,value:r.pulseDecay,onChange:e=>o(t=>({...t,pulseDecay:e}))}),n.jsx(P,{label:"Pointer Radius",min:.3,max:4,step:.05,value:r.pointerRadius,onChange:e=>o(t=>({...t,pointerRadius:e}))})]}),n.jsx(P,{label:"Bloom",min:0,max:2.5,step:.05,value:r.bloomIntensity,onChange:e=>o(t=>({...t,bloomIntensity:e}))})]})]})]})}export{Ee as default};
