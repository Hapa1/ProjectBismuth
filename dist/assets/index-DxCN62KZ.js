import{r as u,c as B,w as T,j as t,C as G,E as $,k as U,e as X,J as q,V as W,a2 as V,b as k,P as K,O as Y,K as z,S as O,A as Z}from"./index-Cn0ECLdO.js";const J="_root_1nra7_1",Q="_canvasHost_1nra7_17",ee="_panel_1nra7_27",te="_panelTitle_1nra7_61",ne="_subtitle_1nra7_77",re="_section_1nra7_91",se="_sectionTitle_1nra7_95",ae="_row_1nra7_111",oe="_label_1nra7_127",ie="_value_1nra7_129",le="_slider_1nra7_133",ue="_audioGrid_1nra7_147",ce="_button_1nra7_161",de="_buttonActive_1nra7_193",pe="_fileLabel_1nra7_205",me="_fileInput_1nra7_207",fe="_meters_1nra7_211",he="_meter_1nra7_211",ve="_meterLabel_1nra7_229",xe="_meterBar_1nra7_243",ge="_meterFill_1nra7_257",r={root:J,canvasHost:Q,panel:ee,panelTitle:te,subtitle:ne,section:re,sectionTitle:se,row:ae,label:oe,value:ie,slider:le,audioGrid:ue,button:ce,buttonActive:de,fileLabel:pe,fileInput:me,meters:fe,meter:he,meterLabel:ve,meterBar:xe,meterFill:ge},be=`// Seam vertex shader — narrow emissive strip along a grid line.\r
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
`,Pe=`// Seam fragment shader — grid line that emits color near pointer + audio pulses.\r
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
// Per-pulse direction mask: (+x, -x, +y, -y), each 0 or 1.\r
uniform vec4  uPulseDirs[MAX_PULSES];\r
uniform float uPulseRadius;\r
// 0 = glow (immediate gaussian), 1 = ripple (head travels along grid axes).\r
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
  float beamW = max(ar * 0.45, 0.001);\r
  float headSigmaSq = ar * ar;\r
  float beamSigmaSq = beamW * beamW;\r
  for (int i = 0; i < MAX_PULSES; i++) {\r
    if (i >= uPulseCount) break;\r
    float ai = uPulseI[i];\r
    if (ai <= 0.001) continue;\r
    vec2 delta = vWorldXY - uPulsePos[i];\r
    float spot = 0.0;\r
    if (ripple) {\r
      // The wavefront is a moving glow that travels along the seam(s) the\r
      // pulse picked. For each enabled direction, brightness peaks at\r
      // (origin + dir * age * speed) and falls off both along and across.\r
      float front = uPulseAge[i] * uPulseSpeed;\r
      float emerge = smoothstep(0.0, ar * 0.4, front);\r
      vec4 dirs = uPulseDirs[i];\r
\r
      // +x\r
      if (dirs.x > 0.5 && delta.x >= 0.0) {\r
        float d = delta.x - front;\r
        spot += exp(-(d * d) / headSigmaSq)\r
              * exp(-(delta.y * delta.y) / beamSigmaSq) * ai * emerge;\r
      }\r
      // -x\r
      if (dirs.y > 0.5 && delta.x <= 0.0) {\r
        float d = -delta.x - front;\r
        spot += exp(-(d * d) / headSigmaSq)\r
              * exp(-(delta.y * delta.y) / beamSigmaSq) * ai * emerge;\r
      }\r
      // +y\r
      if (dirs.z > 0.5 && delta.y >= 0.0) {\r
        float d = delta.y - front;\r
        spot += exp(-(d * d) / headSigmaSq)\r
              * exp(-(delta.x * delta.x) / beamSigmaSq) * ai * emerge;\r
      }\r
      // -y\r
      if (dirs.w > 0.5 && delta.y <= 0.0) {\r
        float d = -delta.y - front;\r
        spot += exp(-(d * d) / headSigmaSq)\r
              * exp(-(delta.x * delta.x) / beamSigmaSq) * ai * emerge;\r
      }\r
    } else {\r
      float ad = length(delta);\r
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
`,w=1,ye=.06,L=8;function Se(){const[c,g]=u.useState(!1);return u.useEffect(()=>{const f=window.matchMedia("(prefers-reduced-motion: reduce)"),a=()=>g(f.matches);return a(),f.addEventListener("change",a),()=>f.removeEventListener("change",a)},[]),c}const Me={audioGain:.9,smoothing:.82,reactivity:1.1,beatThreshold:1.12,pulseRadius:3.2,pulseDecay:1.4,pointerRadius:2.6,bloomIntensity:1.25,pulseMode:"ripple",pulseSpeed:8};function _e(c,g){const f=c<480?110:130,a=Math.max(3,Math.ceil(c/f)+1),s=Math.max(3,Math.ceil(g/f)+1);return{cols:a,rows:s,worldHalfW:a*w/2,worldHalfH:s*w/2}}function we({sharedRef:c}){const{camera:g,gl:f}=X(),a=u.useRef(new T(0,0)),s=u.useMemo(()=>new q(new W(0,0,1),0),[]),p=u.useMemo(()=>new V,[]),o=u.useMemo(()=>new W,[]);return u.useEffect(()=>{const m=f.domElement,b=d=>{const M=m.getBoundingClientRect();a.current.set((d.clientX-M.left)/M.width*2-1,-((d.clientY-M.top)/M.height*2-1)),c.current.pointer.targetStrength=1},l=()=>{c.current.pointer.targetStrength=0};return m.addEventListener("pointermove",b),m.addEventListener("pointerleave",l),m.addEventListener("pointercancel",l),()=>{m.removeEventListener("pointermove",b),m.removeEventListener("pointerleave",l),m.removeEventListener("pointercancel",l)}},[f,c]),k((m,b)=>{p.setFromCamera(a.current,g),p.ray.intersectPlane(s,o)&&c.current.pointer.world.set(o.x,o.y);const l=1-Math.exp(-b*6),d=c.current.pointer;d.strength+=(d.targetStrength-d.strength)*l}),null}function Ae({dims:c,reduceMotion:g,sharedRef:f,controls:a,pulseDecayRef:s}){const p=u.useRef(null),o=u.useRef(null),m=u.useMemo(()=>new K(w*1.02,ye),[]),b=()=>{const P=new Array(L).fill(0).map(()=>new T(0,0)),e=new Float32Array(L),n=new Float32Array(L),h=new Float32Array(L),v=new Array(L).fill(0).map(()=>new z(1,1,1,1));return new O({vertexShader:be,fragmentShader:Pe,uniforms:{uTime:{value:0},uIntensity:{value:1},uPointer:{value:new T(0,0)},uPointerStrength:{value:0},uPointerRadius:{value:a.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:P},uPulseI:{value:e},uPulseHue:{value:n},uPulseAge:{value:h},uPulseDirs:{value:v},uPulseRadius:{value:a.pulseRadius},uPulseMode:{value:a.pulseMode==="ripple"?1:0},uPulseSpeed:{value:a.pulseSpeed}},transparent:!0,depthWrite:!1,blending:Z})},l=u.useMemo(b,[]),d=u.useMemo(b,[]);u.useEffect(()=>{l.uniforms.uPointerRadius.value=a.pointerRadius,d.uniforms.uPointerRadius.value=a.pointerRadius,l.uniforms.uPulseRadius.value=a.pulseRadius,d.uniforms.uPulseRadius.value=a.pulseRadius,l.uniforms.uIntensity.value=a.reactivity,d.uniforms.uIntensity.value=a.reactivity;const P=a.pulseMode==="ripple"?1:0;l.uniforms.uPulseMode.value=P,d.uniforms.uPulseMode.value=P,l.uniforms.uPulseSpeed.value=a.pulseSpeed,d.uniforms.uPulseSpeed.value=a.pulseSpeed},[a,l,d]),u.useEffect(()=>{s.current=a.pulseDecay},[a.pulseDecay,s]),u.useEffect(()=>{const P=p.current,e=o.current;if(!P||!e)return;const n=new Y,h=(c.cols-1)*.5,v=(c.rows-1)*.5;let y=0;for(let S=0;S<c.rows;S+=1)for(let _=0;_<c.cols;_+=1)n.position.set((_-h)*w,(S-v)*w-w*.5,0),n.rotation.set(0,0,0),n.updateMatrix(),P.setMatrixAt(y,n.matrix),n.position.set((_-h)*w+w*.5,(S-v)*w,0),n.rotation.set(0,0,Math.PI*.5),n.updateMatrix(),e.setMatrixAt(y,n.matrix),y+=1;P.instanceMatrix.needsUpdate=!0,e.instanceMatrix.needsUpdate=!0},[c]),u.useEffect(()=>()=>{m.dispose(),l.dispose(),d.dispose()},[m,l,d]),k((P,e)=>{const n=Math.min(e,.05);g||(l.uniforms.uTime.value+=n,d.uniforms.uTime.value+=n);const h=f.current;l.uniforms.uPointer.value.copy(h.pointer.world),d.uniforms.uPointer.value.copy(h.pointer.world),l.uniforms.uPointerStrength.value=h.pointer.strength,d.uniforms.uPointerStrength.value=h.pointer.strength;const v=s.current,y=h.pulses;for(let i=y.length-1;i>=0;i-=1)y[i].intensity-=v*n,y[i].age+=n,y[i].intensity<=0&&y.splice(i,1);const S=Math.min(y.length,L),_=l.uniforms.uPulsePos.value,C=l.uniforms.uPulseI.value,N=l.uniforms.uPulseHue.value,I=l.uniforms.uPulseAge.value,F=l.uniforms.uPulseDirs.value,H=d.uniforms.uPulsePos.value,D=d.uniforms.uPulseI.value,R=d.uniforms.uPulseHue.value,E=d.uniforms.uPulseAge.value,A=d.uniforms.uPulseDirs.value;for(let i=0;i<S;i+=1){const x=y[i];_[i].copy(x.pos),H[i].copy(x.pos),C[i]=x.intensity,D[i]=x.intensity,N[i]=x.hue,R[i]=x.hue,I[i]=x.age,E[i]=x.age,F[i].set(x.dirs[0],x.dirs[1],x.dirs[2],x.dirs[3]),A[i].set(x.dirs[0],x.dirs[1],x.dirs[2],x.dirs[3])}l.uniforms.uPulseCount.value=S,d.uniforms.uPulseCount.value=S});const M=c.cols*c.rows;return t.jsxs(t.Fragment,{children:[t.jsx("instancedMesh",{ref:p,args:[m,l,M],frustumCulled:!1}),t.jsx("instancedMesh",{ref:o,args:[m,d,M],frustumCulled:!1})]})}function je({bandsRef:c,sharedRef:g,dims:f,controls:a}){const s=u.useRef(0),p=u.useRef(0),o=u.useRef(999),m=u.useRef(0),b=u.useRef(Math.random()),l=u.useRef(Math.random()*100);return k((d,M)=>{const P=Math.min(M,.1),e=c.current;e.bass>p.current?p.current=e.bass:p.current=Math.max(e.bass,p.current-P*4.5),s.current=s.current*.985+e.bass*.015,o.current+=P,m.current+=P;const n=a.beatThreshold,v=e.bass>.08&&p.current>s.current*n&&o.current>.14,y=!v&&m.current>.9&&e.level>.06;if(v||y){o.current=v?0:o.current,m.current=0;const S=g.current.pulses;S.length>=L&&S.shift();const _=a.pulseMode==="ripple";let C,N;if(_){const E=l.current,A=Math.sin(E*.71+1.3)*.6+Math.sin(E*1.73+4.1)*.4,i=Math.sin(E*.93+2.7)*.6+Math.sin(E*1.31+.5)*.4;C=A*f.worldHalfW*.7,N=i*f.worldHalfH*.7,l.current+=.31+Math.random()*.5}else C=(Math.random()*2-1)*f.worldHalfW*.85,N=(Math.random()*2-1)*f.worldHalfH*.85;const I=v?Math.max(e.bass,p.current-s.current):e.level*.7,F=_?1:.5,H=v?1+Math.min(2,I*1.6):1,D=Math.min(3.5,(F+I*1.8)*H);b.current=(b.current+.31+e.treble*.25)%1;const R=[0,0,0,0];if(_){const E=1+Math.floor(Math.random()*4),A=[0,1,2,3];for(let i=A.length-1;i>0;i-=1){const x=Math.floor(Math.random()*(i+1));[A[i],A[x]]=[A[x],A[i]]}for(let i=0;i<E;i+=1)R[A[i]]=1}else R[0]=R[1]=R[2]=R[3]=1;S.push({pos:new T(C,N),intensity:D,hue:b.current,age:0,dirs:R})}}),null}function j({label:c,min:g,max:f,step:a,value:s,onChange:p,format:o}){const m=o?o(s):s.toFixed(2);return t.jsxs("div",{className:r.row,children:[t.jsx("span",{className:r.label,children:c}),t.jsx("span",{className:r.value,children:m}),t.jsx("input",{type:"range",className:r.slider,min:g,max:f,step:a,value:s,onChange:b=>p(Number(b.target.value))})]})}function Ee({width:c,height:g}){const f=Se(),a=u.useMemo(()=>_e(c,g),[c,g]),[s,p]=u.useState(Me),o=B(),m=u.useRef(null),b=u.useRef(s.pulseDecay),l=18,d=u.useMemo(()=>{const e=l*Math.PI/180,n=a.rows*w*.5/Math.tan(e/2),h=Math.max(1e-4,c/g),v=a.cols*w*.5/(Math.tan(e/2)*h);return Math.max(n,v)*.98},[a,c,g]),M=u.useRef({pointer:{world:new T(0,0),strength:0,targetStrength:0},pulses:[]});u.useEffect(()=>{o.setGain(s.audioGain)},[o,s.audioGain]),u.useEffect(()=>{o.setSmoothing(s.smoothing)},[o,s.smoothing]),u.useEffect(()=>{let e=0;const n=()=>{const h=m.current;if(h){const v=o.bands.current,y=h.querySelectorAll(`.${r.meterFill}`),S=[v.bass,v.mid,v.treble,v.level];y.forEach((_,C)=>{_.style.width=`${Math.min(100,S[C]*130)}%`})}e=requestAnimationFrame(n)};return e=requestAnimationFrame(n),()=>cancelAnimationFrame(e)},[o.bands]);const P=e=>{var h;const n=(h=e.target.files)==null?void 0:h[0];n&&o.loadFile(n),e.target.value=""};return t.jsxs("div",{className:r.root,style:{width:c,height:g},children:[t.jsxs(G,{className:r.canvasHost,camera:{position:[0,0,d],fov:l,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[t.jsx(we,{sharedRef:M}),t.jsx(Ae,{dims:a,reduceMotion:f,sharedRef:M,controls:s,pulseDecayRef:b}),t.jsx(je,{bandsRef:o.bands,sharedRef:M,dims:a,controls:s}),t.jsx($,{children:t.jsx(U,{intensity:s.bloomIntensity,luminanceThreshold:.2,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),t.jsxs("aside",{className:r.panel,"aria-label":"Lattice controls",children:[t.jsx("h3",{className:r.panelTitle,children:"Lattice · Beat Glow"}),t.jsx("p",{className:r.subtitle,children:"A grid that lights only where it’s touched. Hover to paint with the cursor; every audio beat emits a pulse with intensity proportional to the bass hit."}),t.jsxs("section",{className:r.section,children:[t.jsx("p",{className:r.sectionTitle,children:"Audio Source"}),t.jsxs("div",{className:r.audioGrid,children:[t.jsx("button",{type:"button",className:`${r.button} ${o.source==="demo"?r.buttonActive:""}`,onClick:()=>void o.loadDemo(),children:"Demo Pad"}),t.jsx("button",{type:"button",className:`${r.button} ${o.source==="mic"?r.buttonActive:""}`,onClick:()=>void o.enableMic(),children:"Microphone"}),t.jsx("button",{type:"button",className:`${r.button} ${o.source==="tab"?r.buttonActive:""}`,onClick:()=>{o.captureTab().catch(e=>{const n=e instanceof Error?e.message:String(e);window.alert(`Tab audio capture failed:

${n}`)})},children:"Tab Audio"}),t.jsxs("label",{className:`${r.button} ${r.fileLabel} ${o.source==="file"?r.buttonActive:""}`,children:["Load File",t.jsx("input",{className:r.fileInput,type:"file",accept:"audio/*",onChange:P})]}),t.jsx("button",{type:"button",className:r.button,onClick:()=>o.stop(),disabled:!o.isActive,children:"Stop"})]}),t.jsx("div",{className:r.meters,ref:m,children:["BASS","MID","TREBLE","LEVEL"].map(e=>t.jsxs("div",{className:r.meter,children:[t.jsx("span",{className:r.meterLabel,children:e}),t.jsx("span",{className:r.meterBar,children:t.jsx("span",{className:r.meterFill})})]},e))})]}),t.jsxs("section",{className:r.section,children:[t.jsx("p",{className:r.sectionTitle,children:"Audio Mix"}),t.jsx(j,{label:"Audio Gain",min:0,max:1.5,step:.01,value:s.audioGain,onChange:e=>p(n=>({...n,audioGain:e}))}),t.jsx(j,{label:"Smoothing",min:0,max:.96,step:.01,value:s.smoothing,onChange:e=>p(n=>({...n,smoothing:e}))}),t.jsx(j,{label:"Reactivity",min:0,max:2,step:.05,value:s.reactivity,onChange:e=>p(n=>({...n,reactivity:e}))}),t.jsx(j,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:s.beatThreshold,onChange:e=>p(n=>({...n,beatThreshold:e}))})]}),t.jsxs("section",{className:r.section,children:[t.jsx("p",{className:r.sectionTitle,children:"Light"}),t.jsx("div",{className:r.row,style:{gridTemplateColumns:"1fr"},children:t.jsx("span",{className:r.label,children:"Pulse Mode"})}),t.jsxs("div",{className:r.audioGrid,children:[t.jsx("button",{type:"button",className:`${r.button} ${s.pulseMode==="glow"?r.buttonActive:""}`,onClick:()=>p(e=>({...e,pulseMode:"glow"})),children:"Glow"}),t.jsx("button",{type:"button",className:`${r.button} ${s.pulseMode==="ripple"?r.buttonActive:""}`,onClick:()=>p(e=>({...e,pulseMode:"ripple"})),children:"Ripple"})]}),t.jsx(j,{label:"Pointer Radius",min:.5,max:6,step:.05,value:s.pointerRadius,onChange:e=>p(n=>({...n,pointerRadius:e}))}),t.jsx(j,{label:s.pulseMode==="ripple"?"Ring Thickness":"Pulse Radius",min:.5,max:8,step:.05,value:s.pulseRadius,onChange:e=>p(n=>({...n,pulseRadius:e}))}),s.pulseMode==="ripple"&&t.jsx(j,{label:"Ripple Speed",min:1,max:30,step:.1,value:s.pulseSpeed,onChange:e=>p(n=>({...n,pulseSpeed:e}))}),t.jsx(j,{label:"Pulse Decay",min:.3,max:4,step:.05,value:s.pulseDecay,onChange:e=>p(n=>({...n,pulseDecay:e}))}),t.jsx(j,{label:"Bloom",min:0,max:2.5,step:.05,value:s.bloomIntensity,onChange:e=>p(n=>({...n,bloomIntensity:e}))})]})]})]})}export{Ee as default};
