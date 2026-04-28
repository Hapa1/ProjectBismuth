import{r as i,c as H,w as E,j as e,C as B,E as D,k as G,e as U,J as W,V as N,a2 as X,b as L,P as $,O as k,S as V,A as Y}from"./index-CFoTI59D.js";const K="_root_1nra7_1",q="_canvasHost_1nra7_17",z="_panel_1nra7_27",O="_panelTitle_1nra7_61",Z="_subtitle_1nra7_77",J="_section_1nra7_91",Q="_sectionTitle_1nra7_95",ee="_row_1nra7_111",te="_label_1nra7_127",ne="_value_1nra7_129",se="_slider_1nra7_133",re="_audioGrid_1nra7_147",ae="_button_1nra7_161",oe="_buttonActive_1nra7_193",ie="_fileLabel_1nra7_205",le="_fileInput_1nra7_207",ue="_meters_1nra7_211",ce="_meter_1nra7_211",me="_meterLabel_1nra7_229",de="_meterBar_1nra7_243",pe="_meterFill_1nra7_257",r={root:K,canvasHost:q,panel:z,panelTitle:O,subtitle:Z,section:J,sectionTitle:Q,row:ee,label:te,value:ne,slider:se,audioGrid:re,button:ae,buttonActive:oe,fileLabel:ie,fileInput:le,meters:ue,meter:ce,meterLabel:me,meterBar:de,meterFill:pe},fe=`// Seam vertex shader — narrow emissive strip along a grid line.\r
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
`,ve=`// Seam fragment shader — grid line that emits color near pointer + audio pulses.\r
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
uniform float uPulseRadius;\r
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
  for (int i = 0; i < MAX_PULSES; i++) {\r
    if (i >= uPulseCount) break;\r
    float ai = uPulseI[i];\r
    if (ai <= 0.001) continue;\r
    float ad = length(vWorldXY - uPulsePos[i]);\r
    // Slightly larger / softer falloff for pulses so they read as wide flashes.\r
    float spot = exp(-(ad * ad) / (ar * ar)) * ai;\r
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
`,M=1,he=.06,R=8;function xe(){const[l,h]=i.useState(!1);return i.useEffect(()=>{const f=window.matchMedia("(prefers-reduced-motion: reduce)"),o=()=>h(f.matches);return o(),f.addEventListener("change",o),()=>f.removeEventListener("change",o)},[]),l}const be={audioGain:.9,smoothing:.82,reactivity:1.1,beatThreshold:1.12,pulseRadius:3.2,pulseDecay:1.4,pointerRadius:2.6,bloomIntensity:1.25};function ge(l,h){const f=l<480?110:130,o=Math.max(3,Math.ceil(l/f)+1),s=Math.max(3,Math.ceil(h/f)+1);return{cols:o,rows:s,worldHalfW:o*M/2,worldHalfH:s*M/2}}function ye({sharedRef:l}){const{camera:h,gl:f}=U(),o=i.useRef(new E(0,0)),s=i.useMemo(()=>new W(new N(0,0,1),0),[]),m=i.useMemo(()=>new X,[]),a=i.useMemo(()=>new N,[]);return i.useEffect(()=>{const d=f.domElement,b=c=>{const g=d.getBoundingClientRect();o.current.set((c.clientX-g.left)/g.width*2-1,-((c.clientY-g.top)/g.height*2-1)),l.current.pointer.targetStrength=1},u=()=>{l.current.pointer.targetStrength=0};return d.addEventListener("pointermove",b),d.addEventListener("pointerleave",u),d.addEventListener("pointercancel",u),()=>{d.removeEventListener("pointermove",b),d.removeEventListener("pointerleave",u),d.removeEventListener("pointercancel",u)}},[f,l]),L((d,b)=>{m.setFromCamera(o.current,h),m.ray.intersectPlane(s,a)&&l.current.pointer.world.set(a.x,a.y);const u=1-Math.exp(-b*6),c=l.current.pointer;c.strength+=(c.targetStrength-c.strength)*u}),null}function Pe({dims:l,reduceMotion:h,sharedRef:f,controls:o,pulseDecayRef:s}){const m=i.useRef(null),a=i.useRef(null),d=i.useMemo(()=>new $(M*1.02,he),[]),b=()=>{const v=new Array(R).fill(0).map(()=>new E(0,0)),t=new Float32Array(R),n=new Float32Array(R);return new V({vertexShader:fe,fragmentShader:ve,uniforms:{uTime:{value:0},uIntensity:{value:1},uPointer:{value:new E(0,0)},uPointerStrength:{value:0},uPointerRadius:{value:o.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:v},uPulseI:{value:t},uPulseHue:{value:n},uPulseRadius:{value:o.pulseRadius}},transparent:!0,depthWrite:!1,blending:Y})},u=i.useMemo(b,[]),c=i.useMemo(b,[]);i.useEffect(()=>{u.uniforms.uPointerRadius.value=o.pointerRadius,c.uniforms.uPointerRadius.value=o.pointerRadius,u.uniforms.uPulseRadius.value=o.pulseRadius,c.uniforms.uPulseRadius.value=o.pulseRadius,u.uniforms.uIntensity.value=o.reactivity,c.uniforms.uIntensity.value=o.reactivity},[o,u,c]),i.useEffect(()=>{s.current=o.pulseDecay},[o.pulseDecay,s]),i.useEffect(()=>{const v=m.current,t=a.current;if(!v||!t)return;const n=new k,p=(l.cols-1)*.5,P=(l.rows-1)*.5;let x=0;for(let _=0;_<l.rows;_+=1)for(let S=0;S<l.cols;S+=1)n.position.set((S-p)*M,(_-P)*M-M*.5,0),n.rotation.set(0,0,0),n.updateMatrix(),v.setMatrixAt(x,n.matrix),n.position.set((S-p)*M+M*.5,(_-P)*M,0),n.rotation.set(0,0,Math.PI*.5),n.updateMatrix(),t.setMatrixAt(x,n.matrix),x+=1;v.instanceMatrix.needsUpdate=!0,t.instanceMatrix.needsUpdate=!0},[l]),i.useEffect(()=>()=>{d.dispose(),u.dispose(),c.dispose()},[d,u,c]),L((v,t)=>{const n=Math.min(t,.05);h||(u.uniforms.uTime.value+=n,c.uniforms.uTime.value+=n);const p=f.current;u.uniforms.uPointer.value.copy(p.pointer.world),c.uniforms.uPointer.value.copy(p.pointer.world),u.uniforms.uPointerStrength.value=p.pointer.strength,c.uniforms.uPointerStrength.value=p.pointer.strength;const P=s.current,x=p.pulses;for(let y=x.length-1;y>=0;y-=1)x[y].intensity-=P*n,x[y].intensity<=0&&x.splice(y,1);const _=Math.min(x.length,R),S=u.uniforms.uPulsePos.value,A=u.uniforms.uPulseI.value,C=u.uniforms.uPulseHue.value,T=c.uniforms.uPulsePos.value,I=c.uniforms.uPulseI.value,F=c.uniforms.uPulseHue.value;for(let y=0;y<_;y+=1){const j=x[y];S[y].copy(j.pos),T[y].copy(j.pos),A[y]=j.intensity,I[y]=j.intensity,C[y]=j.hue,F[y]=j.hue}u.uniforms.uPulseCount.value=_,c.uniforms.uPulseCount.value=_});const g=l.cols*l.rows;return e.jsxs(e.Fragment,{children:[e.jsx("instancedMesh",{ref:m,args:[d,u,g],frustumCulled:!1}),e.jsx("instancedMesh",{ref:a,args:[d,c,g],frustumCulled:!1})]})}function _e({bandsRef:l,sharedRef:h,dims:f,controls:o}){const s=i.useRef(0),m=i.useRef(0),a=i.useRef(999),d=i.useRef(0),b=i.useRef(Math.random());return L((u,c)=>{const g=Math.min(c,.1),v=l.current;v.bass>m.current?m.current=v.bass:m.current=Math.max(v.bass,m.current-g*4.5),s.current=s.current*.985+v.bass*.015,a.current+=g,d.current+=g;const t=o.beatThreshold,p=v.bass>.08&&m.current>s.current*t&&a.current>.14,P=!p&&d.current>.9&&v.level>.06;if(p||P){a.current=p?0:a.current,d.current=0;const x=h.current.pulses;x.length>=R&&x.shift();const _=(Math.random()*2-1)*f.worldHalfW*.85,S=(Math.random()*2-1)*f.worldHalfH*.85,A=p?Math.max(v.bass,m.current-s.current):v.level*.7,C=Math.min(2.2,.5+A*1.8);b.current=(b.current+.31+v.treble*.25)%1,x.push({pos:new E(_,S),intensity:C,hue:b.current})}}),null}function w({label:l,min:h,max:f,step:o,value:s,onChange:m,format:a}){const d=a?a(s):s.toFixed(2);return e.jsxs("div",{className:r.row,children:[e.jsx("span",{className:r.label,children:l}),e.jsx("span",{className:r.value,children:d}),e.jsx("input",{type:"range",className:r.slider,min:h,max:f,step:o,value:s,onChange:b=>m(Number(b.target.value))})]})}function Se({width:l,height:h}){const f=xe(),o=i.useMemo(()=>ge(l,h),[l,h]),[s,m]=i.useState(be),a=H(),d=i.useRef(null),b=i.useRef(s.pulseDecay),u=18,c=i.useMemo(()=>{const t=u*Math.PI/180,n=o.rows*M*.5/Math.tan(t/2),p=Math.max(1e-4,l/h),P=o.cols*M*.5/(Math.tan(t/2)*p);return Math.max(n,P)*.98},[o,l,h]),g=i.useRef({pointer:{world:new E(0,0),strength:0,targetStrength:0},pulses:[]});i.useEffect(()=>{a.setGain(s.audioGain)},[a,s.audioGain]),i.useEffect(()=>{a.setSmoothing(s.smoothing)},[a,s.smoothing]),i.useEffect(()=>{let t=0;const n=()=>{const p=d.current;if(p){const P=a.bands.current,x=p.querySelectorAll(`.${r.meterFill}`),_=[P.bass,P.mid,P.treble,P.level];x.forEach((S,A)=>{S.style.width=`${Math.min(100,_[A]*130)}%`})}t=requestAnimationFrame(n)};return t=requestAnimationFrame(n),()=>cancelAnimationFrame(t)},[a.bands]);const v=t=>{var p;const n=(p=t.target.files)==null?void 0:p[0];n&&a.loadFile(n),t.target.value=""};return e.jsxs("div",{className:r.root,style:{width:l,height:h},children:[e.jsxs(B,{className:r.canvasHost,camera:{position:[0,0,c],fov:u,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[e.jsx(ye,{sharedRef:g}),e.jsx(Pe,{dims:o,reduceMotion:f,sharedRef:g,controls:s,pulseDecayRef:b}),e.jsx(_e,{bandsRef:a.bands,sharedRef:g,dims:o,controls:s}),e.jsx(D,{children:e.jsx(G,{intensity:s.bloomIntensity,luminanceThreshold:.2,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),e.jsxs("aside",{className:r.panel,"aria-label":"Lattice controls",children:[e.jsx("h3",{className:r.panelTitle,children:"Lattice · Beat Glow"}),e.jsx("p",{className:r.subtitle,children:"A grid that lights only where it’s touched. Hover to paint with the cursor; every audio beat emits a pulse with intensity proportional to the bass hit."}),e.jsxs("section",{className:r.section,children:[e.jsx("p",{className:r.sectionTitle,children:"Audio Source"}),e.jsxs("div",{className:r.audioGrid,children:[e.jsx("button",{type:"button",className:`${r.button} ${a.source==="demo"?r.buttonActive:""}`,onClick:()=>void a.loadDemo(),children:"Demo Pad"}),e.jsx("button",{type:"button",className:`${r.button} ${a.source==="mic"?r.buttonActive:""}`,onClick:()=>void a.enableMic(),children:"Microphone"}),e.jsx("button",{type:"button",className:`${r.button} ${a.source==="tab"?r.buttonActive:""}`,onClick:()=>{a.captureTab().catch(t=>{const n=t instanceof Error?t.message:String(t);window.alert(`Tab audio capture failed:

${n}`)})},children:"Tab Audio"}),e.jsxs("label",{className:`${r.button} ${r.fileLabel} ${a.source==="file"?r.buttonActive:""}`,children:["Load File",e.jsx("input",{className:r.fileInput,type:"file",accept:"audio/*",onChange:v})]}),e.jsx("button",{type:"button",className:r.button,onClick:()=>a.stop(),disabled:!a.isActive,children:"Stop"})]}),e.jsx("div",{className:r.meters,ref:d,children:["BASS","MID","TREBLE","LEVEL"].map(t=>e.jsxs("div",{className:r.meter,children:[e.jsx("span",{className:r.meterLabel,children:t}),e.jsx("span",{className:r.meterBar,children:e.jsx("span",{className:r.meterFill})})]},t))})]}),e.jsxs("section",{className:r.section,children:[e.jsx("p",{className:r.sectionTitle,children:"Audio Mix"}),e.jsx(w,{label:"Audio Gain",min:0,max:1.5,step:.01,value:s.audioGain,onChange:t=>m(n=>({...n,audioGain:t}))}),e.jsx(w,{label:"Smoothing",min:0,max:.96,step:.01,value:s.smoothing,onChange:t=>m(n=>({...n,smoothing:t}))}),e.jsx(w,{label:"Reactivity",min:0,max:2,step:.05,value:s.reactivity,onChange:t=>m(n=>({...n,reactivity:t}))}),e.jsx(w,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:s.beatThreshold,onChange:t=>m(n=>({...n,beatThreshold:t}))})]}),e.jsxs("section",{className:r.section,children:[e.jsx("p",{className:r.sectionTitle,children:"Light"}),e.jsx(w,{label:"Pointer Radius",min:.5,max:6,step:.05,value:s.pointerRadius,onChange:t=>m(n=>({...n,pointerRadius:t}))}),e.jsx(w,{label:"Pulse Radius",min:.5,max:8,step:.05,value:s.pulseRadius,onChange:t=>m(n=>({...n,pulseRadius:t}))}),e.jsx(w,{label:"Pulse Decay",min:.3,max:4,step:.05,value:s.pulseDecay,onChange:t=>m(n=>({...n,pulseDecay:t}))}),e.jsx(w,{label:"Bloom",min:0,max:2.5,step:.05,value:s.bloomIntensity,onChange:t=>m(n=>({...n,bloomIntensity:t}))})]})]})]})}export{Se as default};
