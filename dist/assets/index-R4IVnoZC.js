var G=Object.defineProperty;var O=(t,e,s)=>e in t?G(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var M=(t,e,s)=>O(t,typeof e!="symbol"?e+"":e,s);import{r as h,j as a,a as D}from"./index-DFysevIV.js";import{S as $,V as W,D as H,A as k,B as C,J as E,X as K,Y as V,Z as z,u as P,C as J}from"./react-three-fiber.esm-NJIcqF1q.js";import{E as U,B as q}from"./Bloom-BHgEs4az.js";import{O as X}from"./OrbitControls-DEwHJlrl.js";import"./extends-CF3RwP-h.js";const Z="_root_1nra7_1",Y="_canvasHost_1nra7_17",Q="_panel_1nra7_27",ee="_panelTitle_1nra7_61",te="_subtitle_1nra7_77",ae="_section_1nra7_91",ne="_sectionTitle_1nra7_95",se="_row_1nra7_111",re="_label_1nra7_127",ie="_value_1nra7_129",oe="_slider_1nra7_133",le="_audioGrid_1nra7_147",ce="_button_1nra7_161",ue="_buttonActive_1nra7_193",me="_fileLabel_1nra7_205",fe="_fileInput_1nra7_207",de="_meters_1nra7_211",he="_meter_1nra7_211",ve="_meterLabel_1nra7_229",pe="_meterBar_1nra7_243",be="_meterFill_1nra7_257",i={root:Z,canvasHost:Y,panel:Q,panelTitle:ee,subtitle:te,section:ae,sectionTitle:ne,row:se,label:re,value:ie,slider:oe,audioGrid:le,button:ce,buttonActive:ue,fileLabel:me,fileInput:fe,meters:de,meter:he,meterLabel:ve,meterBar:pe,meterFill:be},xe=`
vec3 irHsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`,ge=`
vec3 irCosineSpectrum(float t, vec3 offset) {
  return 0.5 + 0.5 * cos(6.2831 * (offset + t));
}
`,ye=`
vec3 irColorField(vec2 p, float t) {
  float a = sin(p.x * 0.55 + t * 0.13);
  float b = sin(p.y * 0.47 - t * 0.11);
  float c = sin((p.x + p.y) * 0.31 + t * 0.07);
  float d = sin(length(p) * 0.62 - t * 0.09);
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * (c + d);
  float sat = 0.62 + 0.22 * sin(t * 0.05 + p.x * 0.4);
  return irHsv2rgb(vec3(fract(hue), clamp(sat, 0.3, 0.9), 1.0));
}
`,_e=`
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`,je=`
precision highp float;

${xe}
${ge}
${ye}

uniform float uTime;
uniform float uIntensity;
uniform float uHueShift;
uniform vec3  uPaletteOffset;
uniform int   uPaletteMode;

uniform float uMirage;   // beat envelope, ~0.4–1.4
uniform float uLevel;    // average band energy
uniform float uTreble;   // treble band

uniform float uFresnelPower;
uniform float uRimBoost;
uniform float uInnerWash;
uniform float uAlphaBase;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float ndv = max(dot(n, v), 0.0);
  float rim = pow(1.0 - ndv, uFresnelPower);
  float facing = pow(ndv, 1.5);

  vec3 col;
  if (uPaletteMode == 0) {
    // Spatial term mirrors Apex's per-face angle hue spread so different
    // parts of a recursive structure read in different hues even when most
    // surfaces face the camera (rim ≈ 0).
    float spatial = 0.18 * (vWorldPos.x + vWorldPos.y * 0.7 + vWorldPos.z * 1.3);
    float faceAngle = atan(n.x, n.z) / 6.2831 + 0.5;
    float t = uHueShift + uTime * 0.05 + uTreble * 0.5
            + rim * 1.1 + spatial + faceAngle * 0.25;
    vec3 spectrum = irCosineSpectrum(t, uPaletteOffset);
    col = spectrum * (uRimBoost + uLevel * 1.2) * rim
        + spectrum * uInnerWash * facing;
  } else {
    vec2 p = vWorldPos.xy + uPaletteOffset.xy;
    float t = uTime + uHueShift * 6.2831;
    vec3 field = irColorField(p, t);
    col = field * (rim * uRimBoost + facing * uInnerWash) * (1.0 + uLevel * 1.0);
  }

  float mirage = max(0.4, uMirage);
  col *= mirage * uIntensity;

  float alpha = clamp((rim * 0.9 + facing * 0.25 + uAlphaBase) * mirage, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`,T=[.55,.88,1.22],Se={cosine:0,colorField:1};function I(t={}){const e=h.useMemo(()=>{const s=t.paletteOffset??T,r=t.palette??"cosine";return new $({vertexShader:_e,fragmentShader:je,transparent:!0,depthWrite:!1,blending:k,side:t.side??H,uniforms:{uTime:{value:0},uIntensity:{value:t.intensity??1},uHueShift:{value:t.hueShift??0},uPaletteOffset:{value:new W(s[0],s[1],s[2])},uPaletteMode:{value:Se[r]},uMirage:{value:.5},uLevel:{value:0},uTreble:{value:0},uFresnelPower:{value:t.fresnelPower??3},uRimBoost:{value:t.rimBoost??1.6},uInnerWash:{value:t.innerWash??.35},uAlphaBase:{value:t.alphaBase??0}}})},[t.palette,t.side]);return h.useEffect(()=>{const s=t.paletteOffset??T,r=e.uniforms;r.uIntensity.value=t.intensity??1,r.uHueShift.value=t.hueShift??0,r.uPaletteOffset.value.set(s[0],s[1],s[2]),r.uFresnelPower.value=t.fresnelPower??3,r.uRimBoost.value=t.rimBoost??1.6,r.uInnerWash.value=t.innerWash??.35,r.uAlphaBase.value=t.alphaBase??0},[e,t.intensity,t.hueShift,t.paletteOffset,t.fresnelPower,t.rimBoost,t.innerWash,t.alphaBase]),h.useEffect(()=>()=>{e.dispose()},[e]),e}function we(t,e,s){switch(t){case"tetra":return new z(e);case"octa":return new V(e);case"icosa":return new K(e);case"box":return new C(e,e,e);case"cone":return new E(e*.5,e,s,1);case"prism":{const r=new E(e*.5,e,s,1);return r.rotateX(Math.PI),r}default:return new C(e,e,e)}}function F({kind:t,size:e=1,segments:s=4,wireframe:r=!1,material:c,position:l,rotation:u,scale:m,...g}){const y=I(c?{}:g),n=c??y,o=h.useMemo(()=>{if(!r)return n;const f=n.clone();return f.wireframe=!0,f},[n,r]);h.useEffect(()=>{if(o!==n)return()=>o.dispose()},[o,n]);const d=h.useMemo(()=>we(t,e,s),[t,e,s]);return h.useEffect(()=>()=>d.dispose(),[d]),a.jsx("mesh",{geometry:d,material:o,position:l,rotation:u,scale:m})}const Me={threshold:1.6,refractory:.18,heartbeatGap:1.2,noiseFloor:.08};class Ae{constructor(e={}){M(this,"slow",0);M(this,"fast",0);M(this,"lastBeat",999);M(this,"sinceAny",0);M(this,"opts");this.opts={...Me,...e}}setOptions(e){this.opts={...this.opts,...e}}step(e,s){const{threshold:r,refractory:c,heartbeatGap:l,noiseFloor:u}=this.opts;s.bass>this.fast?this.fast=s.bass:this.fast=Math.max(s.bass,this.fast-e*4.5),this.slow=this.slow*.985+s.bass*.015,this.lastBeat+=e,this.sinceAny+=e;const m=s.bass>u&&this.fast>this.slow*r&&this.lastBeat>c,g=!m&&this.sinceAny>l&&s.level>u;if(m||g){m&&(this.lastBeat=0),this.sinceAny=0;const y=m?Math.max(s.bass,this.fast-this.slow):s.level*.7;return{fired:!0,transient:m,energy:y}}return{fired:!1,transient:!1,energy:0}}}function Ne(t,e={}){const s=e.reactivity??1,r=e.timeScale??1,c=e.mirageDecay??2.4,l=e.mirageFloor??.45,u=h.useRef(null);e.beat!==!1&&u.current===null&&(u.current=new Ae(e.beat||void 0)),h.useEffect(()=>{if(e.beat===!1){u.current=null;return}u.current&&e.beat&&u.current.setOptions(e.beat)},[e.beat]);const m=h.useRef(l);P((g,y)=>{var b;if(!t)return;const n=Math.min(y,.05),o=Array.isArray(t)?t:[t],d=(b=e.bandsRef)==null?void 0:b.current;let f=0,p=0;if(d){f=d.level*s,p=d.treble*s;const x=u.current;if(x){const v=x.step(n,d);if(v.fired){const A=Math.min(1.3,.7+v.energy*s*1.6);m.current=Math.max(m.current,A)}}}const _=Math.max(0,m.current-l);m.current=l+_*Math.exp(-n*c);for(const x of o){const v=x.uniforms;e.pause||(v.uTime.value+=n*r),v.uMirage.value=m.current,v.uLevel.value=f,v.uTreble.value=p}})}function Be(){const[t,e]=h.useState(!1);return h.useEffect(()=>{const s=window.matchMedia("(prefers-reduced-motion: reduce)"),r=()=>e(s.matches);return r(),s.addEventListener("change",r),()=>s.removeEventListener("change",r)},[]),t}const Pe={audioGain:.95,smoothing:.82,reactivity:.85,avgOrbitCount:5,ringRadius:1.7,childScale:.5,spinBase:.28,bloomIntensity:.7,palette:"cosine",seed:137};function S(t){let e=Math.imul(t^2654435769,2246822507);return e^=e>>>13,e=Math.imul(e,3266489909),e^=e>>>16,(e>>>0)/4294967296}function B(t,e,s){return e+Math.floor(S(t)*(s-e+1))}const N=["tetra","box","octa","icosa","prism"];function R({level:t,maxDepth:e,avgOrbitCount:s,ringRadius:r,childScale:c,spinBase:l,material:u,bandsRef:m,reactivity:g,reduceMotion:y,spinSign:n,seed:o}){const d=h.useRef(null);P((p,_)=>{if(y||!d.current)return;const b=Math.min(_,.05),x=m.current,v=l+x.mid*1.6*g;d.current.rotation.y+=b*v*n,d.current.rotation.x+=b*v*.35*n});const f=h.useMemo(()=>{const p=N[B(o*7+1,0,N.length-1)],_=.45+S(o*11+3)*.4,b=Math.max(2,s+B(o*13+5,-1,1)),x=(S(o*17+7)-.5)*.9,v=S(o*19+11)*Math.PI*2,A=Array.from({length:b},(Ee,L)=>{const w=o*31+L*53+101;return{seed:w,kind:N[B(w*23,0,N.length-1)],size:.45+S(w*29)*.7,angleJitter:(S(w*37)-.5)*.5,radialJitter:.85+S(w*41)*.3,spinPhase:S(w*43)*Math.PI*2}});return{centerKind:p,centerSize:_,orbitCount:b,tilt:x,yaw:v,children:A}},[o,s]);return t>=e?a.jsx(F,{kind:f.centerKind,size:f.centerSize*.9,material:u,rotation:[f.yaw,f.tilt,0]}):a.jsxs("group",{ref:d,children:[a.jsx(F,{kind:f.centerKind,size:f.centerSize,material:u,rotation:[f.tilt*.5,f.yaw,0]}),a.jsx("group",{rotation:[f.tilt,f.yaw,0],children:f.children.map((p,_)=>{const b=_/f.children.length*Math.PI*2+p.angleJitter,x=r*p.radialJitter,v=Math.cos(b)*x,A=Math.sin(b)*x;return a.jsx("group",{position:[v,0,A],scale:c*p.size,rotation:[0,p.spinPhase,0],children:a.jsx(R,{level:t+1,maxDepth:e,avgOrbitCount:Math.max(2,s-1),ringRadius:r*.95,childScale:c,spinBase:l*1.15,material:u,bandsRef:m,reactivity:g,reduceMotion:y,spinSign:-n,seed:p.seed})},_)})})]})}function Ce({bandsRef:t,controls:e,reduceMotion:s,maxDepth:r}){const c=I({palette:e.palette,intensity:1.1,fresnelPower:2.6,rimBoost:1.7,innerWash:.35,alphaBase:.04});return Ne(c,{bandsRef:t,reactivity:e.reactivity,pause:s,timeScale:1}),P(()=>{const u=t.current.treble*.35*e.reactivity,m=c.uniforms.uHueShift;m.value+=(u-m.value)*.05}),a.jsx(R,{level:0,maxDepth:r,avgOrbitCount:e.avgOrbitCount,ringRadius:e.ringRadius,childScale:e.childScale,spinBase:e.spinBase,material:c,bandsRef:t,reactivity:e.reactivity,reduceMotion:s,spinSign:1,seed:e.seed})}function j({label:t,min:e,max:s,step:r,value:c,onChange:l,format:u}){const m=u?u(c):c.toFixed(2);return a.jsxs("div",{className:i.row,children:[a.jsx("span",{className:i.label,children:t}),a.jsx("span",{className:i.value,children:m}),a.jsx("input",{type:"range",className:i.slider,min:e,max:s,step:r,value:c,onChange:g=>l(Number(g.target.value))})]})}function Oe({width:t,height:e}){const s=Be(),[r,c]=h.useState(Pe),l=D(),u=h.useRef(null),m=t<480?2:(t<1024,3),g=t<480?5.6:t<1024?4.8:4.2;h.useEffect(()=>{l.setGain(r.audioGain)},[l,r.audioGain]),h.useEffect(()=>{l.setSmoothing(r.smoothing)},[l,r.smoothing]),h.useEffect(()=>{let n=0;const o=()=>{const d=u.current;if(d){const f=l.bands.current,p=d.querySelectorAll(`.${i.meterFill}`),_=[f.bass,f.mid,f.treble,f.level];p.forEach((b,x)=>{b.style.width=`${Math.min(100,_[x]*130)}%`})}n=requestAnimationFrame(o)};return n=requestAnimationFrame(o),()=>cancelAnimationFrame(n)},[l.bands]);const y=n=>{var d;const o=(d=n.target.files)==null?void 0:d[0];o&&l.loadFile(o),n.target.value=""};return a.jsxs("div",{className:i.root,style:{width:t,height:e},children:[a.jsxs(J,{className:i.canvasHost,camera:{position:[0,1,g],fov:38,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[a.jsx(Ce,{bandsRef:l.bands,controls:r,reduceMotion:s,maxDepth:m}),a.jsx(X,{enablePan:!1,enableZoom:!0,minDistance:2.5,maxDistance:10}),a.jsx(U,{children:a.jsx(q,{intensity:r.bloomIntensity,luminanceThreshold:.18,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),a.jsxs("aside",{className:i.panel,"aria-label":"Prismata controls",children:[a.jsx("h3",{className:i.panelTitle,children:"Prismata · Audio Crystals"}),a.jsx("p",{className:i.subtitle,children:"Recursive cloud of orbiting iridescent crystals — orbit count, kind, and size vary per node. Bass beats drive the mirage envelope, mid energy sets rotation speed, treble shifts the palette."}),a.jsxs("section",{className:i.section,children:[a.jsx("p",{className:i.sectionTitle,children:"Audio Source"}),a.jsxs("div",{className:i.audioGrid,children:[a.jsx("button",{type:"button",className:`${i.button} ${l.source==="demo"?i.buttonActive:""}`,onClick:()=>void l.loadDemo(),children:"Demo Pad"}),a.jsx("button",{type:"button",className:`${i.button} ${l.source==="mic"?i.buttonActive:""}`,onClick:()=>void l.enableMic(),children:"Microphone"}),a.jsx("button",{type:"button",className:`${i.button} ${l.source==="tab"?i.buttonActive:""}`,onClick:()=>{l.captureTab().catch(n=>{const o=n instanceof Error?n.message:String(n);window.alert(`Tab audio capture failed:

${o}`)})},children:"Tab Audio"}),a.jsxs("label",{className:`${i.button} ${i.fileLabel} ${l.source==="file"?i.buttonActive:""}`,children:["Load File",a.jsx("input",{className:i.fileInput,type:"file",accept:"audio/*",onChange:y})]}),a.jsx("button",{type:"button",className:i.button,onClick:()=>l.stop(),disabled:!l.isActive,children:"Stop"})]}),a.jsx("div",{className:i.meters,ref:u,children:["BASS","MID","TREBLE","LEVEL"].map(n=>a.jsxs("div",{className:i.meter,children:[a.jsx("span",{className:i.meterLabel,children:n}),a.jsx("span",{className:i.meterBar,children:a.jsx("span",{className:i.meterFill})})]},n))})]}),a.jsxs("section",{className:i.section,children:[a.jsx("p",{className:i.sectionTitle,children:"Palette"}),a.jsxs("div",{className:i.audioGrid,children:[a.jsx("button",{type:"button",className:`${i.button} ${r.palette==="cosine"?i.buttonActive:""}`,onClick:()=>c(n=>({...n,palette:"cosine"})),children:"Cosine"}),a.jsx("button",{type:"button",className:`${i.button} ${r.palette==="colorField"?i.buttonActive:""}`,onClick:()=>c(n=>({...n,palette:"colorField"})),children:"Color Field"})]})]}),a.jsxs("section",{className:i.section,children:[a.jsx("p",{className:i.sectionTitle,children:"Audio Mix"}),a.jsx(j,{label:"Audio Gain",min:0,max:1.5,step:.01,value:r.audioGain,onChange:n=>c(o=>({...o,audioGain:n}))}),a.jsx(j,{label:"Smoothing",min:0,max:.96,step:.01,value:r.smoothing,onChange:n=>c(o=>({...o,smoothing:n}))}),a.jsx(j,{label:"Reactivity",min:0,max:1.5,step:.01,value:r.reactivity,onChange:n=>c(o=>({...o,reactivity:n}))})]}),a.jsxs("section",{className:i.section,children:[a.jsx("p",{className:i.sectionTitle,children:"Geometry"}),a.jsx(j,{label:"Avg Orbits",min:2,max:7,step:1,value:r.avgOrbitCount,onChange:n=>c(o=>({...o,avgOrbitCount:n})),format:n=>n.toFixed(0)}),a.jsx(j,{label:"Ring Radius",min:1,max:2.6,step:.05,value:r.ringRadius,onChange:n=>c(o=>({...o,ringRadius:n}))}),a.jsx(j,{label:"Child Scale",min:.3,max:.65,step:.01,value:r.childScale,onChange:n=>c(o=>({...o,childScale:n}))}),a.jsx(j,{label:"Spin Base",min:0,max:1,step:.01,value:r.spinBase,onChange:n=>c(o=>({...o,spinBase:n}))}),a.jsx(j,{label:"Bloom",min:0,max:1.5,step:.01,value:r.bloomIntensity,onChange:n=>c(o=>({...o,bloomIntensity:n}))}),a.jsx("button",{type:"button",className:i.button,onClick:()=>c(n=>({...n,seed:Math.floor(Math.random()*9999)})),children:"Reshuffle"})]})]})]})}export{Oe as default};
