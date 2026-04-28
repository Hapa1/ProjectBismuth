import{r as i,c as $,w as E,j as e,C as k,E as B,k as D,e as U,J as X,V as T,a2 as W,b as N,P as V,O as Y,S as K,A as q}from"./index-DfGpesBi.js";const z="_root_1nra7_1",O="_canvasHost_1nra7_17",Z="_panel_1nra7_27",J="_panelTitle_1nra7_61",Q="_subtitle_1nra7_77",ee="_section_1nra7_91",te="_sectionTitle_1nra7_95",ne="_row_1nra7_111",se="_label_1nra7_127",re="_value_1nra7_129",ae="_slider_1nra7_133",oe="_audioGrid_1nra7_147",ie="_button_1nra7_161",le="_buttonActive_1nra7_193",ue="_fileLabel_1nra7_205",ce="_fileInput_1nra7_207",pe="_meters_1nra7_211",de="_meter_1nra7_211",me="_meterLabel_1nra7_229",fe="_meterBar_1nra7_243",ve="_meterFill_1nra7_257",s={root:z,canvasHost:O,panel:Z,panelTitle:J,subtitle:Q,section:ee,sectionTitle:te,row:ne,label:se,value:re,slider:ae,audioGrid:oe,button:ie,buttonActive:le,fileLabel:ue,fileInput:ce,meters:pe,meter:de,meterLabel:me,meterBar:fe,meterFill:ve},he=`// Seam vertex shader — narrow emissive strip along a grid line.\r
\r
varying vec2 vUv;\r
varying vec2 vWorldXY;\r
\r
void main() {\r
  vUv = uv;\r
  vec4 instanceWorld = instanceMatrix * vec4(position, 1.0);\r
  vWorldXY = instanceWorld.xy;\r
  gl_Position = projectionMatrix * modelViewMatrix * instanceWorld;\r
}\r
`,ge=`// Seam fragment shader — grid line that emits color near pointer + audio pulses.\r
\r
precision highp float;\r
\r
#define MAX_PULSES 8\r
\r
uniform float uTime;\r
uniform float uIntensity;\r
\r
// Pointer (mouse) spotlight.\r
uniform vec2  uPointer;\r
uniform float uPointerStrength;\r
uniform float uPointerRadius;\r
\r
// Audio pulses (each = vec2 pos in world space, plus parallel uPulseI[i] for intensity).\r
uniform int   uPulseCount;\r
uniform vec2  uPulsePos[MAX_PULSES];\r
uniform float uPulseI[MAX_PULSES];\r
uniform float uPulseHue[MAX_PULSES];\r
uniform float uPulseAge[MAX_PULSES];\r
uniform float uPulseRadius;\r
// 0 = glow (immediate gaussian), 1 = ripple (ring that travels outward).\r
uniform float uPulseMode;\r
uniform float uPulseSpeed;\r
\r
varying vec2 vUv;\r
varying vec2 vWorldXY;\r
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
void main() {\r
  // Cross-strip profile: bright narrow core + soft halo.\r
  float across = abs(vUv.y - 0.5) * 2.0;\r
  float halo   = 1.0 - smoothstep(0.0, 1.0, across);\r
  float core   = pow(1.0 - smoothstep(0.0, 0.25, across), 2.5);\r
\r
  // --- Pointer contribution -------------------------------------------------\r
  float pr = max(uPointerRadius, 0.001);\r
  float pd = length(vWorldXY - uPointer);\r
  float pointerSpot = exp(-(pd * pd) / (pr * pr)) * uPointerStrength;\r
\r
  vec3 pointerColor = colorField(vWorldXY, uTime) * pointerSpot;\r
\r
  // --- Audio pulses ---------------------------------------------------------\r
  float ar = max(uPulseRadius, 0.001);\r
  vec3 pulseColor = vec3(0.0);\r
  float pulseSpot = 0.0;\r
  bool ripple = uPulseMode > 0.5;\r
  for (int i = 0; i < MAX_PULSES; i++) {\r
    if (i >= uPulseCount) break;\r
    float ai = uPulseI[i];\r
    if (ai <= 0.001) continue;\r
    float ad = length(vWorldXY - uPulsePos[i]);\r
    float spot;\r
    if (ripple) {\r
      // Ring whose radius grows with age. Reuse uPulseRadius as ring thickness.\r
      float front = uPulseAge[i] * uPulseSpeed;\r
      float diff = ad - front;\r
      // Suppress the ring before it has actually formed (no light at origin\r
      // immediately). A small ramp prevents a "spawn flash" at d≈0.\r
      float emerge = smoothstep(0.0, ar * 0.6, front);\r
      spot = exp(-(diff * diff) / (ar * ar)) * ai * emerge;\r
    } else {\r
      spot = exp(-(ad * ad) / (ar * ar)) * ai;\r
    }\r
    pulseSpot += spot;\r
    // Each pulse picks a hue offset; saturate strongly.\r
    vec3 hue = hsv2rgb(vec3(fract(uPulseHue[i]), 0.85, 1.0));\r
    pulseColor += hue * spot;\r
  }\r
\r
  float totalSpot = pointerSpot + pulseSpot;\r
  if (totalSpot < 0.001) discard;\r
\r
  vec3 col = (pointerColor + pulseColor) * (halo * 0.8 + core * 4.0) * uIntensity;\r
\r
  gl_FragColor = vec4(col, halo * clamp(totalSpot, 0.0, 1.5));\r
}\r
`,_=1,xe=.06,j=8;function be(){const[l,g]=i.useState(!1);return i.useEffect(()=>{const v=window.matchMedia("(prefers-reduced-motion: reduce)"),a=()=>g(v.matches);return a(),v.addEventListener("change",a),()=>v.removeEventListener("change",a)},[]),l}const Pe={audioGain:.9,smoothing:.82,reactivity:1.1,beatThreshold:1.12,pulseRadius:3.2,pulseDecay:1.4,pointerRadius:2.6,bloomIntensity:1.25,pulseMode:"ripple",pulseSpeed:8};function ye(l,g){const v=l<480?110:130,a=Math.max(3,Math.ceil(l/v)+1),r=Math.max(3,Math.ceil(g/v)+1);return{cols:a,rows:r,worldHalfW:a*_/2,worldHalfH:r*_/2}}function Me({sharedRef:l}){const{camera:g,gl:v}=U(),a=i.useRef(new E(0,0)),r=i.useMemo(()=>new X(new T(0,0,1),0),[]),p=i.useMemo(()=>new W,[]),o=i.useMemo(()=>new T,[]);return i.useEffect(()=>{const m=v.domElement,b=c=>{const P=m.getBoundingClientRect();a.current.set((c.clientX-P.left)/P.width*2-1,-((c.clientY-P.top)/P.height*2-1)),l.current.pointer.targetStrength=1},u=()=>{l.current.pointer.targetStrength=0};return m.addEventListener("pointermove",b),m.addEventListener("pointerleave",u),m.addEventListener("pointercancel",u),()=>{m.removeEventListener("pointermove",b),m.removeEventListener("pointerleave",u),m.removeEventListener("pointercancel",u)}},[v,l]),N((m,b)=>{p.setFromCamera(a.current,g),p.ray.intersectPlane(r,o)&&l.current.pointer.world.set(o.x,o.y);const u=1-Math.exp(-b*6),c=l.current.pointer;c.strength+=(c.targetStrength-c.strength)*u}),null}function _e({dims:l,reduceMotion:g,sharedRef:v,controls:a,pulseDecayRef:r}){const p=i.useRef(null),o=i.useRef(null),m=i.useMemo(()=>new V(_*1.02,xe),[]),b=()=>{const f=new Array(j).fill(0).map(()=>new E(0,0)),t=new Float32Array(j),n=new Float32Array(j),d=new Float32Array(j);return new K({vertexShader:he,fragmentShader:ge,uniforms:{uTime:{value:0},uIntensity:{value:1},uPointer:{value:new E(0,0)},uPointerStrength:{value:0},uPointerRadius:{value:a.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:f},uPulseI:{value:t},uPulseHue:{value:n},uPulseAge:{value:d},uPulseRadius:{value:a.pulseRadius},uPulseMode:{value:a.pulseMode==="ripple"?1:0},uPulseSpeed:{value:a.pulseSpeed}},transparent:!0,depthWrite:!1,blending:q})},u=i.useMemo(b,[]),c=i.useMemo(b,[]);i.useEffect(()=>{u.uniforms.uPointerRadius.value=a.pointerRadius,c.uniforms.uPointerRadius.value=a.pointerRadius,u.uniforms.uPulseRadius.value=a.pulseRadius,c.uniforms.uPulseRadius.value=a.pulseRadius,u.uniforms.uIntensity.value=a.reactivity,c.uniforms.uIntensity.value=a.reactivity;const f=a.pulseMode==="ripple"?1:0;u.uniforms.uPulseMode.value=f,c.uniforms.uPulseMode.value=f,u.uniforms.uPulseSpeed.value=a.pulseSpeed,c.uniforms.uPulseSpeed.value=a.pulseSpeed},[a,u,c]),i.useEffect(()=>{r.current=a.pulseDecay},[a.pulseDecay,r]),i.useEffect(()=>{const f=p.current,t=o.current;if(!f||!t)return;const n=new Y,d=(l.cols-1)*.5,y=(l.rows-1)*.5;let x=0;for(let M=0;M<l.rows;M+=1)for(let S=0;S<l.cols;S+=1)n.position.set((S-d)*_,(M-y)*_-_*.5,0),n.rotation.set(0,0,0),n.updateMatrix(),f.setMatrixAt(x,n.matrix),n.position.set((S-d)*_+_*.5,(M-y)*_,0),n.rotation.set(0,0,Math.PI*.5),n.updateMatrix(),t.setMatrixAt(x,n.matrix),x+=1;f.instanceMatrix.needsUpdate=!0,t.instanceMatrix.needsUpdate=!0},[l]),i.useEffect(()=>()=>{m.dispose(),u.dispose(),c.dispose()},[m,u,c]),N((f,t)=>{const n=Math.min(t,.05);g||(u.uniforms.uTime.value+=n,c.uniforms.uTime.value+=n);const d=v.current;u.uniforms.uPointer.value.copy(d.pointer.world),c.uniforms.uPointer.value.copy(d.pointer.world),u.uniforms.uPointerStrength.value=d.pointer.strength,c.uniforms.uPointerStrength.value=d.pointer.strength;const y=r.current,x=d.pulses;for(let h=x.length-1;h>=0;h-=1)x[h].intensity-=y*n,x[h].age+=n,x[h].intensity<=0&&x.splice(h,1);const M=Math.min(x.length,j),S=u.uniforms.uPulsePos.value,R=u.uniforms.uPulseI.value,C=u.uniforms.uPulseHue.value,L=u.uniforms.uPulseAge.value,I=c.uniforms.uPulsePos.value,F=c.uniforms.uPulseI.value,H=c.uniforms.uPulseHue.value,G=c.uniforms.uPulseAge.value;for(let h=0;h<M;h+=1){const A=x[h];S[h].copy(A.pos),I[h].copy(A.pos),R[h]=A.intensity,F[h]=A.intensity,C[h]=A.hue,H[h]=A.hue,L[h]=A.age,G[h]=A.age}u.uniforms.uPulseCount.value=M,c.uniforms.uPulseCount.value=M});const P=l.cols*l.rows;return e.jsxs(e.Fragment,{children:[e.jsx("instancedMesh",{ref:p,args:[m,u,P],frustumCulled:!1}),e.jsx("instancedMesh",{ref:o,args:[m,c,P],frustumCulled:!1})]})}function Se({bandsRef:l,sharedRef:g,dims:v,controls:a}){const r=i.useRef(0),p=i.useRef(0),o=i.useRef(999),m=i.useRef(0),b=i.useRef(Math.random());return N((u,c)=>{const P=Math.min(c,.1),f=l.current;f.bass>p.current?p.current=f.bass:p.current=Math.max(f.bass,p.current-P*4.5),r.current=r.current*.985+f.bass*.015,o.current+=P,m.current+=P;const t=a.beatThreshold,d=f.bass>.08&&p.current>r.current*t&&o.current>.14,y=!d&&m.current>.9&&f.level>.06;if(d||y){o.current=d?0:o.current,m.current=0;const x=g.current.pulses;x.length>=j&&x.shift();const M=a.pulseMode==="ripple",S=M?0:(Math.random()*2-1)*v.worldHalfW*.85,R=M?0:(Math.random()*2-1)*v.worldHalfH*.85,C=d?Math.max(f.bass,p.current-r.current):f.level*.7,L=Math.min(2.2,.5+C*1.8);b.current=(b.current+.31+f.treble*.25)%1,x.push({pos:new E(S,R),intensity:L,hue:b.current,age:0})}}),null}function w({label:l,min:g,max:v,step:a,value:r,onChange:p,format:o}){const m=o?o(r):r.toFixed(2);return e.jsxs("div",{className:s.row,children:[e.jsx("span",{className:s.label,children:l}),e.jsx("span",{className:s.value,children:m}),e.jsx("input",{type:"range",className:s.slider,min:g,max:v,step:a,value:r,onChange:b=>p(Number(b.target.value))})]})}function Ae({width:l,height:g}){const v=be(),a=i.useMemo(()=>ye(l,g),[l,g]),[r,p]=i.useState(Pe),o=$(),m=i.useRef(null),b=i.useRef(r.pulseDecay),u=18,c=i.useMemo(()=>{const t=u*Math.PI/180,n=a.rows*_*.5/Math.tan(t/2),d=Math.max(1e-4,l/g),y=a.cols*_*.5/(Math.tan(t/2)*d);return Math.max(n,y)*.98},[a,l,g]),P=i.useRef({pointer:{world:new E(0,0),strength:0,targetStrength:0},pulses:[]});i.useEffect(()=>{o.setGain(r.audioGain)},[o,r.audioGain]),i.useEffect(()=>{o.setSmoothing(r.smoothing)},[o,r.smoothing]),i.useEffect(()=>{let t=0;const n=()=>{const d=m.current;if(d){const y=o.bands.current,x=d.querySelectorAll(`.${s.meterFill}`),M=[y.bass,y.mid,y.treble,y.level];x.forEach((S,R)=>{S.style.width=`${Math.min(100,M[R]*130)}%`})}t=requestAnimationFrame(n)};return t=requestAnimationFrame(n),()=>cancelAnimationFrame(t)},[o.bands]);const f=t=>{var d;const n=(d=t.target.files)==null?void 0:d[0];n&&o.loadFile(n),t.target.value=""};return e.jsxs("div",{className:s.root,style:{width:l,height:g},children:[e.jsxs(k,{className:s.canvasHost,camera:{position:[0,0,c],fov:u,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[e.jsx(Me,{sharedRef:P}),e.jsx(_e,{dims:a,reduceMotion:v,sharedRef:P,controls:r,pulseDecayRef:b}),e.jsx(Se,{bandsRef:o.bands,sharedRef:P,dims:a,controls:r}),e.jsx(B,{children:e.jsx(D,{intensity:r.bloomIntensity,luminanceThreshold:.2,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),e.jsxs("aside",{className:s.panel,"aria-label":"Lattice controls",children:[e.jsx("h3",{className:s.panelTitle,children:"Lattice · Beat Glow"}),e.jsx("p",{className:s.subtitle,children:"A grid that lights only where it’s touched. Hover to paint with the cursor; every audio beat emits a pulse with intensity proportional to the bass hit."}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Audio Source"}),e.jsxs("div",{className:s.audioGrid,children:[e.jsx("button",{type:"button",className:`${s.button} ${o.source==="demo"?s.buttonActive:""}`,onClick:()=>void o.loadDemo(),children:"Demo Pad"}),e.jsx("button",{type:"button",className:`${s.button} ${o.source==="mic"?s.buttonActive:""}`,onClick:()=>void o.enableMic(),children:"Microphone"}),e.jsx("button",{type:"button",className:`${s.button} ${o.source==="tab"?s.buttonActive:""}`,onClick:()=>{o.captureTab().catch(t=>{const n=t instanceof Error?t.message:String(t);window.alert(`Tab audio capture failed:

${n}`)})},children:"Tab Audio"}),e.jsxs("label",{className:`${s.button} ${s.fileLabel} ${o.source==="file"?s.buttonActive:""}`,children:["Load File",e.jsx("input",{className:s.fileInput,type:"file",accept:"audio/*",onChange:f})]}),e.jsx("button",{type:"button",className:s.button,onClick:()=>o.stop(),disabled:!o.isActive,children:"Stop"})]}),e.jsx("div",{className:s.meters,ref:m,children:["BASS","MID","TREBLE","LEVEL"].map(t=>e.jsxs("div",{className:s.meter,children:[e.jsx("span",{className:s.meterLabel,children:t}),e.jsx("span",{className:s.meterBar,children:e.jsx("span",{className:s.meterFill})})]},t))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Audio Mix"}),e.jsx(w,{label:"Audio Gain",min:0,max:1.5,step:.01,value:r.audioGain,onChange:t=>p(n=>({...n,audioGain:t}))}),e.jsx(w,{label:"Smoothing",min:0,max:.96,step:.01,value:r.smoothing,onChange:t=>p(n=>({...n,smoothing:t}))}),e.jsx(w,{label:"Reactivity",min:0,max:2,step:.05,value:r.reactivity,onChange:t=>p(n=>({...n,reactivity:t}))}),e.jsx(w,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:r.beatThreshold,onChange:t=>p(n=>({...n,beatThreshold:t}))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Light"}),e.jsx("div",{className:s.row,style:{gridTemplateColumns:"1fr"},children:e.jsx("span",{className:s.label,children:"Pulse Mode"})}),e.jsxs("div",{className:s.audioGrid,children:[e.jsx("button",{type:"button",className:`${s.button} ${r.pulseMode==="glow"?s.buttonActive:""}`,onClick:()=>p(t=>({...t,pulseMode:"glow"})),children:"Glow"}),e.jsx("button",{type:"button",className:`${s.button} ${r.pulseMode==="ripple"?s.buttonActive:""}`,onClick:()=>p(t=>({...t,pulseMode:"ripple"})),children:"Ripple"})]}),e.jsx(w,{label:"Pointer Radius",min:.5,max:6,step:.05,value:r.pointerRadius,onChange:t=>p(n=>({...n,pointerRadius:t}))}),e.jsx(w,{label:r.pulseMode==="ripple"?"Ring Thickness":"Pulse Radius",min:.5,max:8,step:.05,value:r.pulseRadius,onChange:t=>p(n=>({...n,pulseRadius:t}))}),r.pulseMode==="ripple"&&e.jsx(w,{label:"Ripple Speed",min:1,max:30,step:.1,value:r.pulseSpeed,onChange:t=>p(n=>({...n,pulseSpeed:t}))}),e.jsx(w,{label:"Pulse Decay",min:.3,max:4,step:.05,value:r.pulseDecay,onChange:t=>p(n=>({...n,pulseDecay:t}))}),e.jsx(w,{label:"Bloom",min:0,max:2.5,step:.05,value:r.bloomIntensity,onChange:t=>p(n=>({...n,bloomIntensity:t}))})]})]})]})}export{Ae as default};
