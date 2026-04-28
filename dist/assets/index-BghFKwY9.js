import{r as l,c as B,k as N,j as t,C as X,E as G,l as $,e as U,P as q,V as k,R as V,b as W,m as Y,O as K,n as z,S as O,A as Z}from"./index-CuS_Sl1Z.js";const J="_root_1nra7_1",Q="_canvasHost_1nra7_17",ee="_panel_1nra7_27",te="_panelTitle_1nra7_61",ne="_subtitle_1nra7_77",re="_section_1nra7_91",se="_sectionTitle_1nra7_95",ae="_row_1nra7_111",oe="_label_1nra7_127",ie="_value_1nra7_129",le="_slider_1nra7_133",ue="_audioGrid_1nra7_147",ce="_button_1nra7_161",de="_buttonActive_1nra7_193",pe="_fileLabel_1nra7_205",me="_fileInput_1nra7_207",fe="_meters_1nra7_211",he="_meter_1nra7_211",ve="_meterLabel_1nra7_229",ge="_meterBar_1nra7_243",xe="_meterFill_1nra7_257",s={root:J,canvasHost:Q,panel:ee,panelTitle:te,subtitle:ne,section:re,sectionTitle:se,row:ae,label:oe,value:ie,slider:le,audioGrid:ue,button:ce,buttonActive:de,fileLabel:pe,fileInput:me,meters:fe,meter:he,meterLabel:ve,meterBar:ge,meterFill:xe},be=`// Seam vertex shader — narrow emissive strip along a grid line.\r
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
    // Iridescent color: blend the per-pulse hue with the swirling colorField\r
    // so the ripple shimmers instead of reading as a flat color. The hue\r
    // offset gives each pulse its own bias.\r
    vec3 base = hsv2rgb(vec3(fract(uPulseHue[i]), 0.85, 1.0));\r
    vec3 iri  = colorField(vWorldXY + vec2(uPulseHue[i] * 7.3), uTime + uPulseAge[i] * 1.5);\r
    vec3 tint = ripple ? mix(base, iri, 0.75) : base;\r
    pulseColor += tint * spot;\r
  }\r
\r
  float totalSpot = pointerSpot + pulseSpot;\r
  if (totalSpot < 0.001) discard;\r
\r
  vec3 col = (pointerColor + pulseColor) * (halo * 0.8 + core * 4.0) * uIntensity;\r
\r
  gl_FragColor = vec4(col, halo * clamp(totalSpot, 0.0, 1.5));\r
}\r
`,A=1,ye=.06,T=8;function Me(){const[c,y]=l.useState(!1);return l.useEffect(()=>{const g=window.matchMedia("(prefers-reduced-motion: reduce)"),a=()=>y(g.matches);return a(),g.addEventListener("change",a),()=>g.removeEventListener("change",a)},[]),c}const Se={audioGain:.9,smoothing:.82,reactivity:1.1,beatThreshold:1.12,pulseRadius:1.9,pulseDecay:1.4,pointerRadius:2.6,bloomIntensity:.75,pulseMode:"ripple",pulseSpeed:8};function _e(c,y){const g=c<480?110:130,a=Math.max(3,Math.ceil(c/g)+1),n=Math.max(3,Math.ceil(y/g)+1);return{cols:a,rows:n,worldHalfW:a*A/2,worldHalfH:n*A/2}}function we({sharedRef:c,controlsRef:y}){const{camera:g,gl:a}=U(),n=l.useRef(new N(0,0)),d=l.useMemo(()=>new q(new k(0,0,1),0),[]),i=l.useMemo(()=>new V,[]),x=l.useMemo(()=>new k,[]),_=l.useRef(Math.random());return l.useEffect(()=>{const o=a.domElement,p=f=>{const e=o.getBoundingClientRect();n.current.set((f.clientX-e.left)/e.width*2-1,-((f.clientY-e.top)/e.height*2-1)),c.current.pointer.targetStrength=1},w=()=>{c.current.pointer.targetStrength=0},h=f=>{const e=o.getBoundingClientRect();if(n.current.set((f.clientX-e.left)/e.width*2-1,-((f.clientY-e.top)/e.height*2-1)),i.setFromCamera(n.current,g),!i.ray.intersectPlane(d,x))return;const r=c.current.pulses;r.length>=T&&r.shift();const v=y.current.pulseMode==="ripple",m=[0,0,0,0];if(v){const S=1+Math.floor(Math.random()*4),b=[0,1,2,3];for(let M=b.length-1;M>0;M-=1){const j=Math.floor(Math.random()*(M+1));[b[M],b[j]]=[b[j],b[M]]}for(let M=0;M<S;M+=1)m[b[M]]=1}else m[0]=m[1]=m[2]=m[3]=1;_.current=(_.current+.37)%1,r.push({pos:new N(x.x,x.y),intensity:v?2.4:1.6,hue:_.current,age:0,dirs:m})};return o.addEventListener("pointermove",p),o.addEventListener("pointerleave",w),o.addEventListener("pointercancel",w),o.addEventListener("pointerdown",h),()=>{o.removeEventListener("pointermove",p),o.removeEventListener("pointerleave",w),o.removeEventListener("pointercancel",w),o.removeEventListener("pointerdown",h)}},[a,c,y,g,d,i,x]),W((o,p)=>{i.setFromCamera(n.current,g),i.ray.intersectPlane(d,x)&&c.current.pointer.world.set(x.x,x.y);const w=1-Math.exp(-p*6),h=c.current.pointer;h.strength+=(h.targetStrength-h.strength)*w}),null}function Ae({dims:c,reduceMotion:y,sharedRef:g,controls:a,pulseDecayRef:n}){const d=l.useRef(null),i=l.useRef(null),x=l.useMemo(()=>new Y(A*1.02,ye),[]),_=()=>{const h=new Array(T).fill(0).map(()=>new N(0,0)),f=new Float32Array(T),e=new Float32Array(T),r=new Float32Array(T),v=new Array(T).fill(0).map(()=>new z(1,1,1,1));return new O({vertexShader:be,fragmentShader:Pe,uniforms:{uTime:{value:0},uIntensity:{value:1},uPointer:{value:new N(0,0)},uPointerStrength:{value:0},uPointerRadius:{value:a.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:h},uPulseI:{value:f},uPulseHue:{value:e},uPulseAge:{value:r},uPulseDirs:{value:v},uPulseRadius:{value:a.pulseRadius},uPulseMode:{value:a.pulseMode==="ripple"?1:0},uPulseSpeed:{value:a.pulseSpeed}},transparent:!0,depthWrite:!1,blending:Z})},o=l.useMemo(_,[]),p=l.useMemo(_,[]);l.useEffect(()=>{o.uniforms.uPointerRadius.value=a.pointerRadius,p.uniforms.uPointerRadius.value=a.pointerRadius,o.uniforms.uPulseRadius.value=a.pulseRadius,p.uniforms.uPulseRadius.value=a.pulseRadius,o.uniforms.uIntensity.value=a.reactivity,p.uniforms.uIntensity.value=a.reactivity;const h=a.pulseMode==="ripple"?1:0;o.uniforms.uPulseMode.value=h,p.uniforms.uPulseMode.value=h,o.uniforms.uPulseSpeed.value=a.pulseSpeed,p.uniforms.uPulseSpeed.value=a.pulseSpeed},[a,o,p]),l.useEffect(()=>{n.current=a.pulseDecay},[a.pulseDecay,n]),l.useEffect(()=>{const h=d.current,f=i.current;if(!h||!f)return;const e=new K,r=(c.cols-1)*.5,v=(c.rows-1)*.5;let m=0;for(let S=0;S<c.rows;S+=1)for(let b=0;b<c.cols;b+=1)e.position.set((b-r)*A,(S-v)*A-A*.5,0),e.rotation.set(0,0,0),e.updateMatrix(),h.setMatrixAt(m,e.matrix),e.position.set((b-r)*A+A*.5,(S-v)*A,0),e.rotation.set(0,0,Math.PI*.5),e.updateMatrix(),f.setMatrixAt(m,e.matrix),m+=1;h.instanceMatrix.needsUpdate=!0,f.instanceMatrix.needsUpdate=!0},[c]),l.useEffect(()=>()=>{x.dispose(),o.dispose(),p.dispose()},[x,o,p]),W((h,f)=>{const e=Math.min(f,.05);y||(o.uniforms.uTime.value+=e,p.uniforms.uTime.value+=e);const r=g.current;o.uniforms.uPointer.value.copy(r.pointer.world),p.uniforms.uPointer.value.copy(r.pointer.world),o.uniforms.uPointerStrength.value=r.pointer.strength,p.uniforms.uPointerStrength.value=r.pointer.strength;const v=n.current,m=r.pulses;for(let u=m.length-1;u>=0;u-=1)m[u].intensity-=v*e,m[u].age+=e,m[u].intensity<=0&&m.splice(u,1);const S=Math.min(m.length,T),b=o.uniforms.uPulsePos.value,M=o.uniforms.uPulseI.value,j=o.uniforms.uPulseHue.value,F=o.uniforms.uPulseAge.value,I=o.uniforms.uPulseDirs.value,H=p.uniforms.uPulsePos.value,D=p.uniforms.uPulseI.value,C=p.uniforms.uPulseHue.value,L=p.uniforms.uPulseAge.value,R=p.uniforms.uPulseDirs.value;for(let u=0;u<S;u+=1){const P=m[u];b[u].copy(P.pos),H[u].copy(P.pos),M[u]=P.intensity,D[u]=P.intensity,j[u]=P.hue,C[u]=P.hue,F[u]=P.age,L[u]=P.age,I[u].set(P.dirs[0],P.dirs[1],P.dirs[2],P.dirs[3]),R[u].set(P.dirs[0],P.dirs[1],P.dirs[2],P.dirs[3])}o.uniforms.uPulseCount.value=S,p.uniforms.uPulseCount.value=S});const w=c.cols*c.rows;return t.jsxs(t.Fragment,{children:[t.jsx("instancedMesh",{ref:d,args:[x,o,w],frustumCulled:!1}),t.jsx("instancedMesh",{ref:i,args:[x,p,w],frustumCulled:!1})]})}function je({bandsRef:c,sharedRef:y,dims:g,controls:a}){const n=l.useRef(0),d=l.useRef(0),i=l.useRef(999),x=l.useRef(0),_=l.useRef(Math.random()),o=l.useRef(Math.random()*100);return W((p,w)=>{const h=Math.min(w,.1),f=c.current;f.bass>d.current?d.current=f.bass:d.current=Math.max(f.bass,d.current-h*4.5),n.current=n.current*.985+f.bass*.015,i.current+=h,x.current+=h;const e=a.beatThreshold,v=f.bass>.08&&d.current>n.current*e&&i.current>.14,m=!v&&x.current>.9&&f.level>.06;if(v||m){i.current=v?0:i.current,x.current=0;const S=y.current.pulses;S.length>=T&&S.shift();const b=a.pulseMode==="ripple";let M,j;if(b){const L=o.current,R=Math.sin(L*.71+1.3)*.6+Math.sin(L*1.73+4.1)*.4,u=Math.sin(L*.93+2.7)*.6+Math.sin(L*1.31+.5)*.4;M=R*g.worldHalfW*.7,j=u*g.worldHalfH*.7,o.current+=.31+Math.random()*.5}else M=(Math.random()*2-1)*g.worldHalfW*.85,j=(Math.random()*2-1)*g.worldHalfH*.85;const F=v?Math.max(f.bass,d.current-n.current):f.level*.7,I=b?1:.5,H=v?1+Math.min(2,F*1.6):1,D=Math.min(3.5,(I+F*1.8)*H);_.current=(_.current+.31+f.treble*.25)%1;const C=[0,0,0,0];if(b){const L=1+Math.floor(Math.random()*4),R=[0,1,2,3];for(let u=R.length-1;u>0;u-=1){const P=Math.floor(Math.random()*(u+1));[R[u],R[P]]=[R[P],R[u]]}for(let u=0;u<L;u+=1)C[R[u]]=1}else C[0]=C[1]=C[2]=C[3]=1;S.push({pos:new N(M,j),intensity:D,hue:_.current,age:0,dirs:C})}}),null}function E({label:c,min:y,max:g,step:a,value:n,onChange:d,format:i}){const x=i?i(n):n.toFixed(2);return t.jsxs("div",{className:s.row,children:[t.jsx("span",{className:s.label,children:c}),t.jsx("span",{className:s.value,children:x}),t.jsx("input",{type:"range",className:s.slider,min:y,max:g,step:a,value:n,onChange:_=>d(Number(_.target.value))})]})}function Ee({width:c,height:y}){const g=Me(),a=l.useMemo(()=>_e(c,y),[c,y]),[n,d]=l.useState(Se),i=B(),x=l.useRef(null),_=l.useRef(n.pulseDecay),o=l.useRef(n);l.useEffect(()=>{o.current=n},[n]);const p=18,w=l.useMemo(()=>{const e=p*Math.PI/180,r=a.rows*A*.5/Math.tan(e/2),v=Math.max(1e-4,c/y),m=a.cols*A*.5/(Math.tan(e/2)*v);return Math.max(r,m)*.98},[a,c,y]),h=l.useRef({pointer:{world:new N(0,0),strength:0,targetStrength:0},pulses:[]});l.useEffect(()=>{i.setGain(n.audioGain)},[i,n.audioGain]),l.useEffect(()=>{i.setSmoothing(n.smoothing)},[i,n.smoothing]),l.useEffect(()=>{let e=0;const r=()=>{const v=x.current;if(v){const m=i.bands.current,S=v.querySelectorAll(`.${s.meterFill}`),b=[m.bass,m.mid,m.treble,m.level];S.forEach((M,j)=>{M.style.width=`${Math.min(100,b[j]*130)}%`})}e=requestAnimationFrame(r)};return e=requestAnimationFrame(r),()=>cancelAnimationFrame(e)},[i.bands]);const f=e=>{var v;const r=(v=e.target.files)==null?void 0:v[0];r&&i.loadFile(r),e.target.value=""};return t.jsxs("div",{className:s.root,style:{width:c,height:y},children:[t.jsxs(X,{className:s.canvasHost,camera:{position:[0,0,w],fov:p,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[t.jsx(we,{sharedRef:h,controlsRef:o}),t.jsx(Ae,{dims:a,reduceMotion:g,sharedRef:h,controls:n,pulseDecayRef:_}),t.jsx(je,{bandsRef:i.bands,sharedRef:h,dims:a,controls:n}),t.jsx(G,{children:t.jsx($,{intensity:n.bloomIntensity,luminanceThreshold:.2,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),t.jsxs("aside",{className:s.panel,"aria-label":"Lattice controls",children:[t.jsx("h3",{className:s.panelTitle,children:"Lattice · Beat Glow"}),t.jsx("p",{className:s.subtitle,children:"A grid that lights only where it’s touched. Hover to paint with the cursor; every audio beat emits a pulse with intensity proportional to the bass hit."}),t.jsxs("section",{className:s.section,children:[t.jsx("p",{className:s.sectionTitle,children:"Audio Source"}),t.jsxs("div",{className:s.audioGrid,children:[t.jsx("button",{type:"button",className:`${s.button} ${i.source==="demo"?s.buttonActive:""}`,onClick:()=>void i.loadDemo(),children:"Demo Pad"}),t.jsx("button",{type:"button",className:`${s.button} ${i.source==="mic"?s.buttonActive:""}`,onClick:()=>void i.enableMic(),children:"Microphone"}),t.jsx("button",{type:"button",className:`${s.button} ${i.source==="tab"?s.buttonActive:""}`,onClick:()=>{i.captureTab().catch(e=>{const r=e instanceof Error?e.message:String(e);window.alert(`Tab audio capture failed:

${r}`)})},children:"Tab Audio"}),t.jsxs("label",{className:`${s.button} ${s.fileLabel} ${i.source==="file"?s.buttonActive:""}`,children:["Load File",t.jsx("input",{className:s.fileInput,type:"file",accept:"audio/*",onChange:f})]}),t.jsx("button",{type:"button",className:s.button,onClick:()=>i.stop(),disabled:!i.isActive,children:"Stop"})]}),t.jsx("div",{className:s.meters,ref:x,children:["BASS","MID","TREBLE","LEVEL"].map(e=>t.jsxs("div",{className:s.meter,children:[t.jsx("span",{className:s.meterLabel,children:e}),t.jsx("span",{className:s.meterBar,children:t.jsx("span",{className:s.meterFill})})]},e))})]}),t.jsxs("section",{className:s.section,children:[t.jsx("p",{className:s.sectionTitle,children:"Audio Mix"}),t.jsx(E,{label:"Audio Gain",min:0,max:1.5,step:.01,value:n.audioGain,onChange:e=>d(r=>({...r,audioGain:e}))}),t.jsx(E,{label:"Smoothing",min:0,max:.96,step:.01,value:n.smoothing,onChange:e=>d(r=>({...r,smoothing:e}))}),t.jsx(E,{label:"Reactivity",min:0,max:2,step:.05,value:n.reactivity,onChange:e=>d(r=>({...r,reactivity:e}))}),t.jsx(E,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:n.beatThreshold,onChange:e=>d(r=>({...r,beatThreshold:e}))})]}),t.jsxs("section",{className:s.section,children:[t.jsx("p",{className:s.sectionTitle,children:"Light"}),t.jsx("div",{className:s.row,style:{gridTemplateColumns:"1fr"},children:t.jsx("span",{className:s.label,children:"Pulse Mode"})}),t.jsxs("div",{className:s.audioGrid,children:[t.jsx("button",{type:"button",className:`${s.button} ${n.pulseMode==="glow"?s.buttonActive:""}`,onClick:()=>d(e=>({...e,pulseMode:"glow"})),children:"Glow"}),t.jsx("button",{type:"button",className:`${s.button} ${n.pulseMode==="ripple"?s.buttonActive:""}`,onClick:()=>d(e=>({...e,pulseMode:"ripple"})),children:"Ripple"})]}),t.jsx(E,{label:"Pointer Radius",min:.5,max:6,step:.05,value:n.pointerRadius,onChange:e=>d(r=>({...r,pointerRadius:e}))}),t.jsx(E,{label:n.pulseMode==="ripple"?"Ring Thickness":"Pulse Radius",min:.5,max:8,step:.05,value:n.pulseRadius,onChange:e=>d(r=>({...r,pulseRadius:e}))}),n.pulseMode==="ripple"&&t.jsx(E,{label:"Ripple Speed",min:1,max:30,step:.1,value:n.pulseSpeed,onChange:e=>d(r=>({...r,pulseSpeed:e}))}),t.jsx(E,{label:"Pulse Decay",min:.3,max:4,step:.05,value:n.pulseDecay,onChange:e=>d(r=>({...r,pulseDecay:e}))}),t.jsx(E,{label:"Bloom",min:0,max:2.5,step:.05,value:n.bloomIntensity,onChange:e=>d(r=>({...r,bloomIntensity:e}))})]})]})]})}export{Ee as default};
