import{r as s,a as Z,g as F,j as n,C as J,E as Q,h as ee,c as te,P as ne,V as Y,R as re,d as U,i as se,O as ae,k as oe,S as ie,A as le}from"./index-DMYix05E.js";const ue="_root_1nra7_1",ce="_canvasHost_1nra7_17",de="_panel_1nra7_27",pe="_panelTitle_1nra7_61",me="_subtitle_1nra7_77",fe="_section_1nra7_91",he="_sectionTitle_1nra7_95",ve="_row_1nra7_111",ge="_label_1nra7_127",xe="_value_1nra7_129",be="_slider_1nra7_133",Me="_audioGrid_1nra7_147",Pe="_button_1nra7_161",ye="_buttonActive_1nra7_193",Se="_meters_1nra7_211",we="_meter_1nra7_211",_e="_meterLabel_1nra7_229",Ae="_meterBar_1nra7_243",Re="_meterFill_1nra7_257",i={root:ue,canvasHost:ce,panel:de,panelTitle:pe,subtitle:me,section:fe,sectionTitle:he,row:ve,label:ge,value:xe,slider:be,audioGrid:Me,button:Pe,buttonActive:ye,meters:Se,meter:we,meterLabel:_e,meterBar:Ae,meterFill:Re},je=`// Seam vertex shader — narrow emissive strip along a grid line.\r
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
`,Ee=`// Seam fragment shader — grid line that emits color near pointer + audio pulses.\r
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
`,j=1,Ce=.06,H=8;function Te(){const[c,M]=s.useState(!1);return s.useEffect(()=>{const f=window.matchMedia("(prefers-reduced-motion: reduce)"),a=()=>M(f.matches);return a(),f.addEventListener("change",a),()=>f.removeEventListener("change",a)},[]),c}const He={audioGain:.9,smoothing:.82,reactivity:1.1,beatThreshold:1.12,pulseRadius:1.9,pulseDecay:1.4,pointerRadius:2.6,bloomIntensity:.75,pulseMode:"ripple",pulseSpeed:8,sustainDrone:!0};function Le(c,M){const f=c<480?110:130,a=Math.max(3,Math.ceil(c/f)+1),r=Math.max(3,Math.ceil(M/f)+1);return{cols:a,rows:r,worldHalfW:a*j/2,worldHalfH:r*j/2}}function Ne({sharedRef:c,controlsRef:M}){const{camera:f,gl:a}=te(),r=s.useRef(new F(0,0)),d=s.useMemo(()=>new ne(new Y(0,0,1),0),[]),u=s.useMemo(()=>new re,[]),g=s.useMemo(()=>new Y,[]),_=s.useRef(Math.random());return s.useEffect(()=>{const o=a.domElement,l=e=>{const t=o.getBoundingClientRect();r.current.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height*2-1)),c.current.pointer.targetStrength=1},S=()=>{c.current.pointer.targetStrength=0},h=e=>{const t=o.getBoundingClientRect();if(r.current.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height*2-1)),u.setFromCamera(r.current,f),!u.ray.intersectPlane(d,g))return;const x=c.current.pulses;x.length>=H&&x.shift();const P=M.current.pulseMode==="ripple",b=[0,0,0,0];if(P){const y=1+Math.floor(Math.random()*4),p=[0,1,2,3];for(let w=p.length-1;w>0;w-=1){const N=Math.floor(Math.random()*(w+1));[p[w],p[N]]=[p[N],p[w]]}for(let w=0;w<y;w+=1)b[p[w]]=1}else b[0]=b[1]=b[2]=b[3]=1;_.current=(_.current+.37)%1,x.push({pos:new F(g.x,g.y),intensity:P?2.4:1.6,hue:_.current,age:0,dirs:b})};return o.addEventListener("pointermove",l),o.addEventListener("pointerleave",S),o.addEventListener("pointercancel",S),o.addEventListener("pointerdown",h),()=>{o.removeEventListener("pointermove",l),o.removeEventListener("pointerleave",S),o.removeEventListener("pointercancel",S),o.removeEventListener("pointerdown",h)}},[a,c,M,f,d,u,g]),U((o,l)=>{u.setFromCamera(r.current,f),u.ray.intersectPlane(d,g)&&c.current.pointer.world.set(g.x,g.y);const S=1-Math.exp(-l*6),h=c.current.pointer;h.strength+=(h.targetStrength-h.strength)*S}),null}function De({dims:c,reduceMotion:M,sharedRef:f,controls:a,pulseDecayRef:r}){const d=s.useRef(null),u=s.useRef(null),g=s.useMemo(()=>new se(j*1.02,Ce),[]),_=()=>{const h=new Array(H).fill(0).map(()=>new F(0,0)),e=new Float32Array(H),t=new Float32Array(H),x=new Float32Array(H),P=new Array(H).fill(0).map(()=>new oe(1,1,1,1));return new ie({vertexShader:je,fragmentShader:Ee,uniforms:{uTime:{value:0},uIntensity:{value:1},uPointer:{value:new F(0,0)},uPointerStrength:{value:0},uPointerRadius:{value:a.pointerRadius},uPulseCount:{value:0},uPulsePos:{value:h},uPulseI:{value:e},uPulseHue:{value:t},uPulseAge:{value:x},uPulseDirs:{value:P},uPulseRadius:{value:a.pulseRadius},uPulseMode:{value:a.pulseMode==="ripple"?1:0},uPulseSpeed:{value:a.pulseSpeed}},transparent:!0,depthWrite:!1,blending:le})},o=s.useMemo(_,[]),l=s.useMemo(_,[]);s.useEffect(()=>{o.uniforms.uPointerRadius.value=a.pointerRadius,l.uniforms.uPointerRadius.value=a.pointerRadius,o.uniforms.uPulseRadius.value=a.pulseRadius,l.uniforms.uPulseRadius.value=a.pulseRadius,o.uniforms.uIntensity.value=a.reactivity,l.uniforms.uIntensity.value=a.reactivity;const h=a.pulseMode==="ripple"?1:0;o.uniforms.uPulseMode.value=h,l.uniforms.uPulseMode.value=h,o.uniforms.uPulseSpeed.value=a.pulseSpeed,l.uniforms.uPulseSpeed.value=a.pulseSpeed},[a,o,l]),s.useEffect(()=>{r.current=a.pulseDecay},[a.pulseDecay,r]),s.useEffect(()=>{const h=d.current,e=u.current;if(!h||!e)return;const t=new ae,x=(c.cols-1)*.5,P=(c.rows-1)*.5;let b=0;for(let y=0;y<c.rows;y+=1)for(let p=0;p<c.cols;p+=1)t.position.set((p-x)*j,(y-P)*j-j*.5,0),t.rotation.set(0,0,0),t.updateMatrix(),h.setMatrixAt(b,t.matrix),t.position.set((p-x)*j+j*.5,(y-P)*j,0),t.rotation.set(0,0,Math.PI*.5),t.updateMatrix(),e.setMatrixAt(b,t.matrix),b+=1;h.instanceMatrix.needsUpdate=!0,e.instanceMatrix.needsUpdate=!0},[c]),s.useEffect(()=>()=>{g.dispose(),o.dispose(),l.dispose()},[g,o,l]),U((h,e)=>{const t=Math.min(e,.05);M||(o.uniforms.uTime.value+=t,l.uniforms.uTime.value+=t);const x=f.current;o.uniforms.uPointer.value.copy(x.pointer.world),l.uniforms.uPointer.value.copy(x.pointer.world),o.uniforms.uPointerStrength.value=x.pointer.strength,l.uniforms.uPointerStrength.value=x.pointer.strength;const P=r.current,b=x.pulses;for(let m=b.length-1;m>=0;m-=1)b[m].intensity-=P*t,b[m].age+=t,b[m].intensity<=0&&b.splice(m,1);const y=Math.min(b.length,H),p=o.uniforms.uPulsePos.value,w=o.uniforms.uPulseI.value,N=o.uniforms.uPulseHue.value,k=o.uniforms.uPulseAge.value,X=o.uniforms.uPulseDirs.value,B=l.uniforms.uPulsePos.value,G=l.uniforms.uPulseI.value,$=l.uniforms.uPulseHue.value,C=l.uniforms.uPulseAge.value,q=l.uniforms.uPulseDirs.value;for(let m=0;m<y;m+=1){const v=b[m];p[m].copy(v.pos),B[m].copy(v.pos),w[m]=v.intensity,G[m]=v.intensity,N[m]=v.hue,$[m]=v.hue,k[m]=v.age,C[m]=v.age,X[m].set(v.dirs[0],v.dirs[1],v.dirs[2],v.dirs[3]),q[m].set(v.dirs[0],v.dirs[1],v.dirs[2],v.dirs[3])}o.uniforms.uPulseCount.value=y,l.uniforms.uPulseCount.value=y});const S=c.cols*c.rows;return n.jsxs(n.Fragment,{children:[n.jsx("instancedMesh",{ref:d,args:[g,o,S],frustumCulled:!1}),n.jsx("instancedMesh",{ref:u,args:[g,l,S],frustumCulled:!1})]})}function Fe({bandsRef:c,sharedRef:M,dims:f,controls:a}){const r=s.useRef(0),d=s.useRef(0),u=s.useRef(999),g=s.useRef(0),_=s.useRef(Math.random()),o=s.useRef(Math.random()*100),l=s.useRef(0),S=s.useRef(0),h=s.useRef(!1),e=s.useRef(0),t=s.useRef(null),x=s.useRef(Math.random());return U((P,b)=>{const y=Math.min(b,.1),p=c.current;p.bass>d.current?d.current=p.bass:d.current=Math.max(p.bass,d.current-y*4.5),r.current=r.current*.985+p.bass*.015;const w=.06,N=l.current;l.current=N+w*(p.bass-N);const k=p.bass-l.current;S.current=S.current+w*(k*k-S.current);const X=Math.sqrt(S.current),B=a.sustainDrone&&l.current>.12&&X<l.current*.22;u.current+=y,g.current+=y;const G=a.beatThreshold,C=p.bass>.08&&d.current>r.current*G&&u.current>.14;if(B&&!C){if(!h.current){if(h.current=!0,e.current=0,a.pulseMode==="ripple"){const E=o.current,D=Math.sin(E*.71+1.3)*.6+Math.sin(E*1.73+4.1)*.4,A=Math.sin(E*.93+2.7)*.6+Math.sin(E*1.31+.5)*.4;t.current={x:D*f.worldHalfW*.7,y:A*f.worldHalfH*.7}}else t.current={x:(Math.random()*2-1)*f.worldHalfW*.85,y:(Math.random()*2-1)*f.worldHalfH*.85};x.current=_.current}e.current+=y;const m=Math.max(.18,.5-l.current*.6);if(e.current>=m&&t.current){e.current=0,g.current=0;const v=M.current.pulses;v.length>=H&&v.shift();const E=a.pulseMode==="ripple",D=Math.min(2.5,.9+l.current*1.4),A=[0,0,0,0];A[0]=A[1]=A[2]=A[3]=1,v.push({pos:new F(t.current.x,t.current.y),intensity:D,hue:x.current,age:0,dirs:A})}return}h.current&&(!B||C)&&(h.current=!1,t.current=null);const q=!C&&g.current>.9&&p.level>.06;if(C||q){u.current=C?0:u.current,g.current=0;const m=M.current.pulses;m.length>=H&&m.shift();const v=a.pulseMode==="ripple";let E,D;if(v){const W=o.current,L=Math.sin(W*.71+1.3)*.6+Math.sin(W*1.73+4.1)*.4,R=Math.sin(W*.93+2.7)*.6+Math.sin(W*1.31+.5)*.4;E=L*f.worldHalfW*.7,D=R*f.worldHalfH*.7,o.current+=.31+Math.random()*.5}else E=(Math.random()*2-1)*f.worldHalfW*.85,D=(Math.random()*2-1)*f.worldHalfH*.85;const A=C?Math.max(p.bass,d.current-r.current):p.level*.7,K=v?1:.5,O=C?1+Math.min(2,A*1.6):1,z=Math.min(3.5,(K+A*1.8)*O);_.current=(_.current+.31+p.treble*.25)%1;const I=[0,0,0,0];if(v){const W=1+Math.floor(Math.random()*4),L=[0,1,2,3];for(let R=L.length-1;R>0;R-=1){const V=Math.floor(Math.random()*(R+1));[L[R],L[V]]=[L[V],L[R]]}for(let R=0;R<W;R+=1)I[L[R]]=1}else I[0]=I[1]=I[2]=I[3]=1;m.push({pos:new F(E,D),intensity:z,hue:_.current,age:0,dirs:I})}}),null}function T({label:c,min:M,max:f,step:a,value:r,onChange:d,format:u}){const g=u?u(r):r.toFixed(2);return n.jsxs("div",{className:i.row,children:[n.jsx("span",{className:i.label,children:c}),n.jsx("span",{className:i.value,children:g}),n.jsx("input",{type:"range",className:i.slider,min:M,max:f,step:a,value:r,onChange:_=>d(Number(_.target.value))})]})}function We({width:c,height:M}){const f=Te(),a=s.useMemo(()=>Le(c,M),[c,M]),[r,d]=s.useState(He),u=Z();s.useEffect(()=>{u.loadDemo()},[]);const g=s.useRef(null),_=s.useRef(r.pulseDecay),o=s.useRef(r);s.useEffect(()=>{o.current=r},[r]);const l=18,S=s.useMemo(()=>{const e=l*Math.PI/180,t=a.rows*j*.5/Math.tan(e/2),x=Math.max(1e-4,c/M),P=a.cols*j*.5/(Math.tan(e/2)*x);return Math.max(t,P)*.98},[a,c,M]),h=s.useRef({pointer:{world:new F(0,0),strength:0,targetStrength:0},pulses:[]});return s.useEffect(()=>{u.setGain(r.audioGain)},[u,r.audioGain]),s.useEffect(()=>{u.setSmoothing(r.smoothing)},[u,r.smoothing]),s.useEffect(()=>{let e=0;const t=()=>{const x=g.current;if(x){const P=u.bands.current,b=x.querySelectorAll(`.${i.meterFill}`),y=[P.bass,P.mid,P.treble,P.level];b.forEach((p,w)=>{p.style.width=`${Math.min(100,y[w]*130)}%`})}e=requestAnimationFrame(t)};return e=requestAnimationFrame(t),()=>cancelAnimationFrame(e)},[u.bands]),n.jsxs("div",{className:i.root,style:{width:c,height:M},children:[n.jsxs(J,{className:i.canvasHost,camera:{position:[0,0,S],fov:l,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[n.jsx(Ne,{sharedRef:h,controlsRef:o}),n.jsx(De,{dims:a,reduceMotion:f,sharedRef:h,controls:r,pulseDecayRef:_}),n.jsx(Fe,{bandsRef:u.bands,sharedRef:h,dims:a,controls:r}),n.jsx(Q,{children:n.jsx(ee,{intensity:r.bloomIntensity,luminanceThreshold:.2,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),n.jsxs("aside",{className:i.panel,"aria-label":"Lattice controls",children:[n.jsx("h3",{className:i.panelTitle,children:"Lattice · Beat Glow"}),n.jsx("p",{className:i.subtitle,children:"A grid that lights only where it’s touched. Hover to paint with the cursor; every audio beat emits a pulse with intensity proportional to the bass hit."}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Audio Source"}),n.jsxs("div",{className:i.audioGrid,children:[n.jsx("button",{type:"button",className:`${i.button} ${u.source==="mic"?i.buttonActive:""}`,onClick:()=>void u.enableMic(),children:"Microphone"}),n.jsx("button",{type:"button",className:`${i.button} ${u.source==="tab"?i.buttonActive:""}`,onClick:()=>{u.captureTab().catch(e=>{const t=e instanceof Error?e.message:String(e);window.alert(`Tab audio capture failed:

${t}`)})},children:"Tab Audio"}),n.jsx("button",{type:"button",className:i.button,onClick:()=>u.stop(),disabled:!u.isActive,children:"Stop"})]}),n.jsx("div",{className:i.meters,ref:g,children:["BASS","MID","TREBLE","LEVEL"].map(e=>n.jsxs("div",{className:i.meter,children:[n.jsx("span",{className:i.meterLabel,children:e}),n.jsx("span",{className:i.meterBar,children:n.jsx("span",{className:i.meterFill})})]},e))})]}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Audio Mix"}),n.jsx(T,{label:"Audio Gain",min:0,max:1.5,step:.01,value:r.audioGain,onChange:e=>d(t=>({...t,audioGain:e}))}),n.jsx(T,{label:"Smoothing",min:0,max:.96,step:.01,value:r.smoothing,onChange:e=>d(t=>({...t,smoothing:e}))}),n.jsx(T,{label:"Reactivity",min:0,max:2,step:.05,value:r.reactivity,onChange:e=>d(t=>({...t,reactivity:e}))}),n.jsx(T,{label:"Beat Threshold",min:1.05,max:2,step:.01,value:r.beatThreshold,onChange:e=>d(t=>({...t,beatThreshold:e}))}),n.jsxs("button",{type:"button",className:`${i.button} ${r.sustainDrone?i.buttonActive:""}`,onClick:()=>d(e=>({...e,sustainDrone:!e.sustainDrone})),title:"When bass is steady, keep emitting from a fixed location instead of stopping.",children:["Sustain Drone: ",r.sustainDrone?"On":"Off"]})]}),n.jsxs("section",{className:i.section,children:[n.jsx("p",{className:i.sectionTitle,children:"Light"}),n.jsx("div",{className:i.row,style:{gridTemplateColumns:"1fr"},children:n.jsx("span",{className:i.label,children:"Pulse Mode"})}),n.jsxs("div",{className:i.audioGrid,children:[n.jsx("button",{type:"button",className:`${i.button} ${r.pulseMode==="glow"?i.buttonActive:""}`,onClick:()=>d(e=>({...e,pulseMode:"glow"})),children:"Glow"}),n.jsx("button",{type:"button",className:`${i.button} ${r.pulseMode==="ripple"?i.buttonActive:""}`,onClick:()=>d(e=>({...e,pulseMode:"ripple"})),children:"Ripple"})]}),n.jsx(T,{label:"Pointer Radius",min:.5,max:6,step:.05,value:r.pointerRadius,onChange:e=>d(t=>({...t,pointerRadius:e}))}),n.jsx(T,{label:r.pulseMode==="ripple"?"Ring Thickness":"Pulse Radius",min:.5,max:8,step:.05,value:r.pulseRadius,onChange:e=>d(t=>({...t,pulseRadius:e}))}),r.pulseMode==="ripple"&&n.jsx(T,{label:"Ripple Speed",min:1,max:30,step:.1,value:r.pulseSpeed,onChange:e=>d(t=>({...t,pulseSpeed:e}))}),n.jsx(T,{label:"Pulse Decay",min:.3,max:4,step:.05,value:r.pulseDecay,onChange:e=>d(t=>({...t,pulseDecay:e}))}),n.jsx(T,{label:"Bloom",min:0,max:2.5,step:.05,value:r.bloomIntensity,onChange:e=>d(t=>({...t,bloomIntensity:e}))})]})]})]})}export{We as default};
