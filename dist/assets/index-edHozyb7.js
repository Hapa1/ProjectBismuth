import{r as i,a as W,j as n,C as X,E as H,h as U,d as C,l as L,S as B,D as z,A as K,V as T,c as q,g as O,R as Z}from"./index-CsFQQOkc.js";const Y="_root_1nra7_1",J="_canvasHost_1nra7_17",Q="_panel_1nra7_27",ee="_panelTitle_1nra7_61",ne="_subtitle_1nra7_77",re="_section_1nra7_91",te="_sectionTitle_1nra7_95",ae="_row_1nra7_111",oe="_label_1nra7_127",se="_value_1nra7_129",ie="_slider_1nra7_133",le="_audioGrid_1nra7_147",ce="_button_1nra7_161",ue="_buttonActive_1nra7_193",me="_meters_1nra7_211",de="_meter_1nra7_211",fe="_meterLabel_1nra7_229",pe="_meterBar_1nra7_243",ve="_meterFill_1nra7_257",o={root:Y,canvasHost:J,panel:Q,panelTitle:ee,subtitle:ne,section:re,sectionTitle:te,row:ae,label:oe,value:se,slider:ie,audioGrid:le,button:ce,buttonActive:ue,meters:me,meter:de,meterLabel:fe,meterBar:pe,meterFill:ve},D=`// Apex vertex shader — inverted pyramid with bass-driven outward breathing.\r
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
`,M=8,be=[{id:"rings",label:"Rings"},{id:"bloom",label:"Bloom"},{id:"streaks",label:"Streaks"},{id:"sparkle",label:"Sparkle"}],F={rings:0,bloom:1,streaks:2,sparkle:3};function xe(){const[f,l]=i.useState(!1);return i.useEffect(()=>{const h=window.matchMedia("(prefers-reduced-motion: reduce)"),r=()=>l(h.matches);return r(),h.addEventListener("change",r),()=>h.removeEventListener("change",r)},[]),f}const k={mode:"bleed",bleedEffect:"rings",audioGain:1.2,smoothing:.34,rotationSpeed:.25,reactivity:1,bloomIntensity:.7,zoom:12,beatThreshold:1.32,fadeDecay:1.3,mirageFloor:.06,pulseRadius:2.6,pulseDecay:1.2,pointerRadius:1.6};function P({label:f,min:l,max:h,step:r,value:a,onChange:s,format:m}){const e=m?m(a):a.toFixed(2);return n.jsxs("div",{className:o.row,children:[n.jsx("span",{className:o.label,children:f}),n.jsx("span",{className:o.value,children:e}),n.jsx("input",{type:"range",className:o.slider,min:l,max:h,step:r,value:a,onChange:t=>s(Number(t.target.value))})]})}const N=.75;function ye(){return{pointer:{world:new T(0,0,0),strength:N,targetStrength:N},pulses:[]}}function we({sharedRef:f,meshRef:l}){const{camera:h,gl:r}=q(),a=i.useRef(new O(0,0)),s=i.useMemo(()=>new Z,[]);return i.useEffect(()=>{const m=r.domElement,e=p=>{const c=m.getBoundingClientRect();a.current.set((p.clientX-c.left)/c.width*2-1,-((p.clientY-c.top)/c.height*2-1)),f.current.pointer.targetStrength=1},t=()=>{f.current.pointer.targetStrength=N};return m.addEventListener("pointermove",e),m.addEventListener("pointerleave",t),m.addEventListener("pointercancel",t),()=>{m.removeEventListener("pointermove",e),m.removeEventListener("pointerleave",t),m.removeEventListener("pointercancel",t)}},[r,f]),C((m,e)=>{s.setFromCamera(a.current,h);const t=l.current;if(t){const u=s.intersectObject(t,!1);u.length>0&&f.current.pointer.world.copy(u[0].point)}const p=1-Math.exp(-e*6),c=f.current.pointer;c.strength+=(c.targetStrength-c.strength)*p}),null}function Pe({zoom:f}){return C((l,h)=>{const r=1-Math.exp(-h*6),a=l.camera;a.position.x+=(0-a.position.x)*r,a.position.y+=(.6-a.position.y)*r,a.position.z+=(f-a.position.z)*r,a.lookAt(0,0,0)}),null}function _e({bandsRef:f,controls:l,reduceMotion:h}){const r=i.useRef(null),a=i.useRef(0),s=i.useRef(0),m=i.useRef(999),e=i.useRef(0),t=i.useRef(0),p=i.useMemo(()=>{const u=new L(1,2,4,1);return u.rotateX(Math.PI),u},[]),c=i.useMemo(()=>new B({vertexShader:D,fragmentShader:he,uniforms:{uTime:{value:0},uMirage:{value:0},uTreble:{value:0},uMid:{value:0},uLevel:{value:0}},transparent:!0,depthWrite:!1,blending:K,side:z}),[]);return i.useEffect(()=>()=>{p.dispose(),c.dispose()},[p,c]),C((u,E)=>{const g=Math.min(E,.05),d=f.current,v=l.reactivity;d.bass>s.current?s.current=d.bass:s.current=Math.max(d.bass,s.current-g*4.5),a.current=a.current*.985+d.bass*.015,m.current+=g,e.current+=g;const _=d.bass>.08&&s.current>a.current*l.beatThreshold&&m.current>.16,S=!_&&e.current>1.1&&d.level>.05;if(_||S){m.current=_?0:m.current,e.current=0;const y=_?Math.max(d.bass,s.current-a.current):d.level*.7,A=Math.min(1.3,.7+y*v*1.6);t.current=Math.max(t.current,A)}const j=l.mirageFloor,R=Math.max(0,t.current-j);if(t.current=j+R*Math.exp(-g*l.fadeDecay),c.uniforms.uTime.value+=g,c.uniforms.uMirage.value=t.current,c.uniforms.uTreble.value=d.treble*v,c.uniforms.uMid.value=d.mid*v,c.uniforms.uLevel.value=d.level*v,!h&&r.current){const y=1+d.level*1.4;r.current.rotation.y+=g*l.rotationSpeed*y,r.current.rotation.x=Math.sin(c.uniforms.uTime.value*.3)*.06}}),n.jsx("mesh",{ref:r,geometry:p,material:c})}function Se({bandsRef:f,controls:l,reduceMotion:h}){const r=i.useRef(null),a=i.useRef(0),s=i.useRef(0),m=i.useRef(999),e=i.useRef(0),t=i.useRef(Math.random()),p=i.useRef(ye()),c=i.useMemo(()=>{const g=new L(1,2,4,1);return g.rotateX(Math.PI),g},[]),u=i.useMemo(()=>{const g=new Array(M).fill(0).map(()=>new T),d=new Float32Array(M),v=new Float32Array(M),x=new Float32Array(M);return new B({vertexShader:D,fragmentShader:ge,uniforms:{uTime:{value:0},uIntensity:{value:l.reactivity},uPointer:{value:new T},uPointerStrength:{value:0},uPointerRadius:{value:l.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:g},uPulseI:{value:d},uPulseHue:{value:v},uPulseAge:{value:x},uPulseTravel:{value:l.pulseRadius},uEffect:{value:F[l.bleedEffect]}},side:z})},[]);i.useEffect(()=>{u.uniforms.uIntensity.value=l.reactivity,u.uniforms.uPointerRadius.value=l.pointerRadius,u.uniforms.uPulseTravel.value=l.pulseRadius,u.uniforms.uEffect.value=F[l.bleedEffect]},[l,u]),i.useEffect(()=>()=>{c.dispose(),u.dispose()},[c,u]);const E=g=>{const d=r.current;if(!d)return;const v=Math.random()*Math.PI*2,x=Math.pow(Math.random(),.7),_=x,S=-1+2*x,R=new T(Math.cos(v)*_,S,Math.sin(v)*_).applyMatrix4(d.matrixWorld),y=p.current.pulses;y.length>=M&&y.shift(),t.current=(t.current+.31)%1,y.push({pos:R,intensity:g,hue:t.current,age:0,lifetime:.85+Math.random()*.4})};return C((g,d)=>{const v=Math.min(d,.05),x=f.current;x.bass>s.current?s.current=x.bass:s.current=Math.max(x.bass,s.current-v*4.5),a.current=a.current*.985+x.bass*.015,m.current+=v,e.current+=v;const S=x.bass>.08&&s.current>a.current*l.beatThreshold&&m.current>.14,j=!S&&e.current>.9&&x.level>.06;if(S||j){m.current=S?0:m.current,e.current=0;const b=S?Math.max(x.bass,s.current-a.current):x.level*.7,w=Math.min(2.2,.5+b*1.8);E(w)}const R=l.pulseDecay,y=p.current.pulses;for(let b=y.length-1;b>=0;b-=1){const w=y[b];w.age+=v/Math.max(w.lifetime,.05),w.intensity-=R*v*.4,(w.age>=1||w.intensity<=0)&&y.splice(b,1)}const A=Math.min(y.length,M),I=u.uniforms.uPulsePos.value,G=u.uniforms.uPulseI.value,$=u.uniforms.uPulseHue.value,V=u.uniforms.uPulseAge.value;for(let b=0;b<A;b+=1){const w=y[b];I[b].copy(w.pos),G[b]=w.intensity,$[b]=w.hue,V[b]=Math.min(1,w.age)}if(u.uniforms.uPulseCount.value=A,u.uniforms.uTime.value+=v,u.uniforms.uPointer.value.copy(p.current.pointer.world),u.uniforms.uPointerStrength.value=p.current.pointer.strength,!h&&r.current){const b=1+x.level*1.4;r.current.rotation.y+=v*l.rotationSpeed*b,r.current.rotation.x=Math.sin(u.uniforms.uTime.value*.3)*.06}}),n.jsxs(n.Fragment,{children:[n.jsx(we,{sharedRef:p,meshRef:r}),n.jsx("mesh",{ref:r,geometry:c,material:u})]})}function Ee({width:f,height:l}){const h=xe(),[r,a]=i.useState(k),s=W();i.useEffect(()=>{s.loadDemo()},[]);const m=i.useRef(null);return i.useEffect(()=>{s.setGain(r.audioGain)},[s,r.audioGain]),i.useEffect(()=>{s.setSmoothing(r.smoothing)},[s,r.smoothing]),i.useEffect(()=>{let e=0;const t=()=>{const p=m.current;if(p){const c=s.bands.current,u=p.querySelectorAll(`.${o.meterFill}`),E=[c.bass,c.mid,c.treble,c.level];u.forEach((g,d)=>{g.style.width=`${Math.min(100,E[d]*130)}%`})}e=requestAnimationFrame(t)};return e=requestAnimationFrame(t),()=>cancelAnimationFrame(e)},[s.bands]),n.jsxs("div",{className:o.root,style:{width:f,height:l},children:[n.jsxs(X,{className:o.canvasHost,camera:{position:[0,.6,k.zoom],fov:35},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[n.jsx(Pe,{zoom:r.zoom}),r.mode==="mirage"?n.jsx(_e,{bandsRef:s.bands,controls:r,reduceMotion:h}):n.jsx(Se,{bandsRef:s.bands,controls:r,reduceMotion:h}),n.jsx(H,{children:n.jsx(U,{intensity:r.bloomIntensity,luminanceThreshold:.15,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),n.jsxs("aside",{className:o.panel,"aria-label":"Apex controls",children:[n.jsx("h3",{className:o.panelTitle,children:"Apex · Inverted Pyramid"}),n.jsx("p",{className:o.subtitle,children:r.mode==="mirage"?"A luminescent iridescent mirage. The pyramid surfaces from the dark on every beat, then fades back into haze.":"Voronoi-style pointer + audio-pulse spotlights bleed iridescent light across the pyramid surface."}),n.jsxs("section",{className:o.section,children:[n.jsx("p",{className:o.sectionTitle,children:"Mode"}),n.jsxs("div",{className:o.audioGrid,children:[n.jsx("button",{type:"button",className:`${o.button} ${r.mode==="mirage"?o.buttonActive:""}`,onClick:()=>a(e=>({...e,mode:"mirage"})),children:"Mirage"}),n.jsx("button",{type:"button",className:`${o.button} ${r.mode==="bleed"?o.buttonActive:""}`,onClick:()=>a(e=>({...e,mode:"bleed"})),children:"Bleed Lights"})]})]}),n.jsxs("section",{className:o.section,children:[n.jsx("p",{className:o.sectionTitle,children:"Audio Source"}),n.jsxs("div",{className:o.audioGrid,children:[n.jsx("button",{type:"button",className:`${o.button} ${s.source==="mic"?o.buttonActive:""}`,onClick:()=>void s.enableMic(),children:"Microphone"}),n.jsx("button",{type:"button",className:`${o.button} ${s.source==="tab"?o.buttonActive:""}`,onClick:()=>{s.captureTab().catch(e=>{const t=e instanceof Error?e.message:String(e);window.alert(`Tab audio capture failed:

${t}`)})},children:"Tab Audio"}),n.jsx("button",{type:"button",className:o.button,onClick:()=>s.stop(),disabled:!s.isActive,children:"Stop"})]}),n.jsx("div",{className:o.meters,ref:m,children:["BASS","MID","TREBLE","LEVEL"].map(e=>n.jsxs("div",{className:o.meter,children:[n.jsx("span",{className:o.meterLabel,children:e}),n.jsx("span",{className:o.meterBar,children:n.jsx("span",{className:o.meterFill})})]},e))})]}),n.jsxs("section",{className:o.section,children:[n.jsx("p",{className:o.sectionTitle,children:"Audio"}),n.jsx(P,{label:"Audio Gain",min:0,max:1.5,step:.01,value:r.audioGain,onChange:e=>a(t=>({...t,audioGain:e}))}),n.jsx(P,{label:"Smoothing",min:0,max:.96,step:.01,value:r.smoothing,onChange:e=>a(t=>({...t,smoothing:e}))}),n.jsx(P,{label:"Reactivity",min:0,max:2.5,step:.05,value:r.reactivity,onChange:e=>a(t=>({...t,reactivity:e}))}),n.jsx(P,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:r.beatThreshold,onChange:e=>a(t=>({...t,beatThreshold:e}))})]}),n.jsxs("section",{className:o.section,children:[n.jsx("p",{className:o.sectionTitle,children:"Visuals"}),n.jsx(P,{label:"Zoom",min:3,max:30,step:.1,value:r.zoom,onChange:e=>a(t=>({...t,zoom:e})),format:e=>e.toFixed(1)}),n.jsx(P,{label:"Rotation Speed",min:0,max:1,step:.01,value:r.rotationSpeed,onChange:e=>a(t=>({...t,rotationSpeed:e}))}),r.mode==="mirage"&&n.jsxs(n.Fragment,{children:[n.jsx(P,{label:"Fade Decay",min:.3,max:4,step:.05,value:r.fadeDecay,onChange:e=>a(t=>({...t,fadeDecay:e}))}),n.jsx(P,{label:"Mirage Floor",min:0,max:.4,step:.01,value:r.mirageFloor,onChange:e=>a(t=>({...t,mirageFloor:e}))})]}),r.mode==="bleed"&&n.jsxs(n.Fragment,{children:[n.jsx("div",{className:o.row,children:n.jsx("span",{className:o.label,children:"Effect"})}),n.jsx("div",{className:o.audioGrid,children:be.map(e=>n.jsx("button",{type:"button",className:`${o.button} ${r.bleedEffect===e.id?o.buttonActive:""}`,onClick:()=>a(t=>({...t,bleedEffect:e.id})),children:e.label},e.id))}),n.jsx(P,{label:"Pulse Radius",min:.5,max:6,step:.05,value:r.pulseRadius,onChange:e=>a(t=>({...t,pulseRadius:e}))}),n.jsx(P,{label:"Pulse Decay",min:.2,max:4,step:.05,value:r.pulseDecay,onChange:e=>a(t=>({...t,pulseDecay:e}))}),n.jsx(P,{label:"Pointer Radius",min:.3,max:4,step:.05,value:r.pointerRadius,onChange:e=>a(t=>({...t,pointerRadius:e}))})]}),n.jsx(P,{label:"Bloom",min:0,max:2.5,step:.05,value:r.bloomIntensity,onChange:e=>a(t=>({...t,bloomIntensity:e}))})]})]})]})}export{Ee as default};
