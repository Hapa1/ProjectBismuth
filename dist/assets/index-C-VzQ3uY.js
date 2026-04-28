var I=Object.defineProperty;var L=(t,e,n)=>e in t?I(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var w=(t,e,n)=>L(t,typeof e!="symbol"?e+"":e,n);import{r as d,j as a,a as R}from"./index-Brqux3uL.js";import{S as G,V as M,D,A as $,e as O,p as W,T as H,X as V,q as k,Y as q,B as N,J as A,Z as K,_ as U,$ as X,u as B,C as Z}from"./react-three-fiber.esm-Cfkc_fHU.js";import{E as J,B as Y}from"./Bloom-BpmSYQeS.js";import{O as Q}from"./OrbitControls-biyt-IFx.js";import"./extends-CF3RwP-h.js";const z="_root_1nra7_1",ee="_canvasHost_1nra7_17",te="_panel_1nra7_27",ae="_panelTitle_1nra7_61",se="_subtitle_1nra7_77",ne="_section_1nra7_91",re="_sectionTitle_1nra7_95",ie="_row_1nra7_111",oe="_label_1nra7_127",le="_value_1nra7_129",ce="_slider_1nra7_133",ue="_audioGrid_1nra7_147",me="_button_1nra7_161",fe="_buttonActive_1nra7_193",he="_fileLabel_1nra7_205",de="_fileInput_1nra7_207",ve="_meters_1nra7_211",pe="_meter_1nra7_211",be="_meterLabel_1nra7_229",xe="_meterBar_1nra7_243",ye="_meterFill_1nra7_257",o={root:z,canvasHost:ee,panel:te,panelTitle:ae,subtitle:se,section:ne,sectionTitle:re,row:ie,label:oe,value:le,slider:ce,audioGrid:ue,button:me,buttonActive:fe,fileLabel:he,fileInput:de,meters:ve,meter:pe,meterLabel:be,meterBar:xe,meterFill:ye},ge=`
vec3 irHsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`,_e=`
vec3 irCosineSpectrum(float t, vec3 offset) {
  return 0.5 + 0.5 * cos(6.2831 * (offset + t));
}
`,je=`
vec3 irColorField(vec2 p, float t) {
  float a = sin(p.x * 0.55 + t * 0.13);
  float b = sin(p.y * 0.47 - t * 0.11);
  float c = sin((p.x + p.y) * 0.31 + t * 0.07);
  float d = sin(length(p) * 0.62 - t * 0.09);
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * (c + d);
  float sat = 0.62 + 0.22 * sin(t * 0.05 + p.x * 0.4);
  return irHsv2rgb(vec3(fract(hue), clamp(sat, 0.3, 0.9), 1.0));
}
`,we=`
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
`,Me=`
precision highp float;

${ge}
${_e}
${je}

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
    float t = uHueShift + uTime * 0.05 + uTreble * 0.5 + rim * 1.1;
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
`,E=[.55,.88,1.22],Se={cosine:0,colorField:1};function S(t={}){const e=d.useMemo(()=>{const n=t.paletteOffset??E,s=t.palette??"cosine";return new G({vertexShader:we,fragmentShader:Me,transparent:!0,depthWrite:!1,blending:$,side:t.side??D,uniforms:{uTime:{value:0},uIntensity:{value:t.intensity??1},uHueShift:{value:t.hueShift??0},uPaletteOffset:{value:new M(n[0],n[1],n[2])},uPaletteMode:{value:Se[s]},uMirage:{value:.5},uLevel:{value:0},uTreble:{value:0},uFresnelPower:{value:t.fresnelPower??3},uRimBoost:{value:t.rimBoost??1.6},uInnerWash:{value:t.innerWash??.35},uAlphaBase:{value:t.alphaBase??0}}})},[t.palette,t.side]);return d.useEffect(()=>{const n=t.paletteOffset??E,s=e.uniforms;s.uIntensity.value=t.intensity??1,s.uHueShift.value=t.hueShift??0,s.uPaletteOffset.value.set(n[0],n[1],n[2]),s.uFresnelPower.value=t.fresnelPower??3,s.uRimBoost.value=t.rimBoost??1.6,s.uInnerWash.value=t.innerWash??.35,s.uAlphaBase.value=t.alphaBase??0},[e,t.intensity,t.hueShift,t.paletteOffset,t.fresnelPower,t.rimBoost,t.innerWash,t.alphaBase]),d.useEffect(()=>()=>{e.dispose()},[e]),e}function Be(t){return t instanceof M?t:new M(t[0],t[1],t[2])}function T({points:t,width:e=.02,radialSegments:n=8,tubularSegments:s,closed:c=!1,material:l,position:u,rotation:m,scale:b,...x}){const r=S(l?{}:x),i=l??r,h=d.useMemo(()=>{if(t.length<2)return new O;const f=t.map(Be),v=new W(f,c,"catmullrom",0),p=s??Math.max(8,f.length*6);return new H(v,p,e,n,c)},[t,e,n,s,c]);return d.useEffect(()=>()=>h.dispose(),[h]),a.jsx("mesh",{geometry:h,material:i,position:u,rotation:m,scale:b})}function Ne({sides:t,radius:e=1,variant:n="outline",outlineWidth:s=.03,rotationZ:c=0,material:l,position:u,rotation:m,scale:b,...x}){const r=S(l?{}:x),i=l??r,h=d.useMemo(()=>{const v=Math.max(3,Math.floor(t)),p=[];for(let g=0;g<v;g+=1){const y=c+g/v*Math.PI*2;p.push(new M(Math.cos(y)*e,Math.sin(y)*e,0))}return p},[t,e,c]),f=d.useMemo(()=>{if(n!=="filled")return null;const v=new V(h.map(p=>new k(p.x,p.y)));return new q(v)},[n,h]);return d.useEffect(()=>()=>{f==null||f.dispose()},[f]),n==="filled"&&f?a.jsx("mesh",{geometry:f,material:i,position:u,rotation:m,scale:b}):a.jsx(T,{points:h,width:s,closed:!0,material:i,position:u,rotation:m,scale:b})}function Ae(t,e,n){switch(t){case"tetra":return new X(e);case"octa":return new U(e);case"icosa":return new K(e);case"box":return new N(e,e,e);case"cone":return new A(e*.5,e,n,1);case"prism":{const s=new A(e*.5,e,n,1);return s.rotateX(Math.PI),s}default:return new N(e,e,e)}}function P({kind:t,size:e=1,segments:n=4,wireframe:s=!1,material:c,position:l,rotation:u,scale:m,...b}){const x=S(c?{}:b),r=c??x,i=d.useMemo(()=>{if(!s)return r;const f=r.clone();return f.wireframe=!0,f},[r,s]);d.useEffect(()=>{if(i!==r)return()=>i.dispose()},[i,r]);const h=d.useMemo(()=>Ae(t,e,n),[t,e,n]);return d.useEffect(()=>()=>h.dispose(),[h]),a.jsx("mesh",{geometry:h,material:i,position:l,rotation:u,scale:m})}const Ee={threshold:1.6,refractory:.18,heartbeatGap:1.2,noiseFloor:.08};class Pe{constructor(e={}){w(this,"slow",0);w(this,"fast",0);w(this,"lastBeat",999);w(this,"sinceAny",0);w(this,"opts");this.opts={...Ee,...e}}setOptions(e){this.opts={...this.opts,...e}}step(e,n){const{threshold:s,refractory:c,heartbeatGap:l,noiseFloor:u}=this.opts;n.bass>this.fast?this.fast=n.bass:this.fast=Math.max(n.bass,this.fast-e*4.5),this.slow=this.slow*.985+n.bass*.015,this.lastBeat+=e,this.sinceAny+=e;const m=n.bass>u&&this.fast>this.slow*s&&this.lastBeat>c,b=!m&&this.sinceAny>l&&n.level>u;if(m||b){m&&(this.lastBeat=0),this.sinceAny=0;const x=m?Math.max(n.bass,this.fast-this.slow):n.level*.7;return{fired:!0,transient:m,energy:x}}return{fired:!1,transient:!1,energy:0}}}function Te(t,e={}){const n=e.reactivity??1,s=e.timeScale??1,c=e.mirageDecay??2.4,l=e.mirageFloor??.45,u=d.useRef(null);e.beat!==!1&&u.current===null&&(u.current=new Pe(e.beat||void 0)),d.useEffect(()=>{if(e.beat===!1){u.current=null;return}u.current&&e.beat&&u.current.setOptions(e.beat)},[e.beat]);const m=d.useRef(l);B((b,x)=>{var g;if(!t)return;const r=Math.min(x,.05),i=Array.isArray(t)?t:[t],h=(g=e.bandsRef)==null?void 0:g.current;let f=0,v=0;if(h){f=h.level*n,v=h.treble*n;const y=u.current;if(y){const j=y.step(r,h);if(j.fired){const F=Math.min(1.3,.7+j.energy*n*1.6);m.current=Math.max(m.current,F)}}}const p=Math.max(0,m.current-l);m.current=l+p*Math.exp(-r*c);for(const y of i){const j=y.uniforms;e.pause||(j.uTime.value+=r*s),j.uMirage.value=m.current,j.uLevel.value=f,j.uTreble.value=v}})}function Ce(){const[t,e]=d.useState(!1);return d.useEffect(()=>{const n=window.matchMedia("(prefers-reduced-motion: reduce)"),s=()=>e(n.matches);return s(),n.addEventListener("change",s),()=>n.removeEventListener("change",s)},[]),t}const Fe={audioGain:.95,smoothing:.82,reactivity:.85,branchCount:5,ringRadius:1.55,childScale:.46,spinBase:.28,bloomIntensity:.7,palette:"cosine"};function C({level:t,maxDepth:e,branchCount:n,ringRadius:s,childScale:c,spinBase:l,material:u,bandsRef:m,reactivity:b,reduceMotion:x,spinSign:r}){const i=d.useRef(null);B((f,v)=>{if(x||!i.current)return;const p=Math.min(v,.05),g=m.current,y=l+g.mid*1.6*b;i.current.rotation.y+=p*y*r,i.current.rotation.x+=p*y*.35*r});const h=d.useMemo(()=>{const f=[];for(let v=0;v<n;v+=1){const p=v/n*Math.PI*2;f.push([Math.cos(p)*s,0,Math.sin(p)*s])}return f},[n,s]);return t>=e?a.jsx(P,{kind:t%2===0?"tetra":"octa",size:.55,material:u}):a.jsxs("group",{ref:i,children:[a.jsx(P,{kind:t===0?"icosa":t%2===0?"tetra":"octa",size:.62,material:u}),a.jsx(Ne,{sides:Math.max(3,n+1),radius:s*.72,outlineWidth:.022,rotation:[Math.PI/2,0,0],material:u}),h.map((f,v)=>a.jsxs("group",{children:[a.jsx(T,{points:[[0,0,0],f],width:.018,material:u}),a.jsx("group",{position:f,scale:c,children:a.jsx(C,{level:t+1,maxDepth:e,branchCount:Math.max(3,n-1),ringRadius:s*.95,childScale:c,spinBase:l*1.1,material:u,bandsRef:m,reactivity:b,reduceMotion:x,spinSign:-r})})]},v))]})}function Ie({bandsRef:t,controls:e,reduceMotion:n,maxDepth:s}){const c=S({palette:e.palette,intensity:1.1,fresnelPower:2.6,rimBoost:1.7,innerWash:.35,alphaBase:.04});return Te(c,{bandsRef:t,reactivity:e.reactivity,pause:n,timeScale:1}),B(()=>{const u=t.current.treble*.35*e.reactivity,m=c.uniforms.uHueShift;m.value+=(u-m.value)*.05}),a.jsx(C,{level:0,maxDepth:s,branchCount:e.branchCount,ringRadius:e.ringRadius,childScale:e.childScale,spinBase:e.spinBase,material:c,bandsRef:t,reactivity:e.reactivity,reduceMotion:n,spinSign:1})}function _({label:t,min:e,max:n,step:s,value:c,onChange:l,format:u}){const m=u?u(c):c.toFixed(2);return a.jsxs("div",{className:o.row,children:[a.jsx("span",{className:o.label,children:t}),a.jsx("span",{className:o.value,children:m}),a.jsx("input",{type:"range",className:o.slider,min:e,max:n,step:s,value:c,onChange:b=>l(Number(b.target.value))})]})}function We({width:t,height:e}){const n=Ce(),[s,c]=d.useState(Fe),l=R(),u=d.useRef(null),m=t<480?2:(t<1024,3),b=t<480?5.6:t<1024?4.8:4.2;d.useEffect(()=>{l.setGain(s.audioGain)},[l,s.audioGain]),d.useEffect(()=>{l.setSmoothing(s.smoothing)},[l,s.smoothing]),d.useEffect(()=>{let r=0;const i=()=>{const h=u.current;if(h){const f=l.bands.current,v=h.querySelectorAll(`.${o.meterFill}`),p=[f.bass,f.mid,f.treble,f.level];v.forEach((g,y)=>{g.style.width=`${Math.min(100,p[y]*130)}%`})}r=requestAnimationFrame(i)};return r=requestAnimationFrame(i),()=>cancelAnimationFrame(r)},[l.bands]);const x=r=>{var h;const i=(h=r.target.files)==null?void 0:h[0];i&&l.loadFile(i),r.target.value=""};return a.jsxs("div",{className:o.root,style:{width:t,height:e},children:[a.jsxs(Z,{className:o.canvasHost,camera:{position:[0,1,b],fov:38,near:.1,far:200},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[a.jsx(Ie,{bandsRef:l.bands,controls:s,reduceMotion:n,maxDepth:m}),a.jsx(Q,{enablePan:!1,enableZoom:!0,minDistance:2.5,maxDistance:10}),a.jsx(J,{children:a.jsx(Y,{intensity:s.bloomIntensity,luminanceThreshold:.18,luminanceSmoothing:.6,mipmapBlur:!0,radius:.7})})]}),a.jsxs("aside",{className:o.panel,"aria-label":"Prismata controls",children:[a.jsx("h3",{className:o.panelTitle,children:"Prismata · Audio Fractal"}),a.jsx("p",{className:o.subtitle,children:"Recursive iridescent spire built from shared line, polygon, and solid primitives. Bass beats drive the mirage envelope, mid energy sets rotation speed, treble shifts the palette."}),a.jsxs("section",{className:o.section,children:[a.jsx("p",{className:o.sectionTitle,children:"Audio Source"}),a.jsxs("div",{className:o.audioGrid,children:[a.jsx("button",{type:"button",className:`${o.button} ${l.source==="demo"?o.buttonActive:""}`,onClick:()=>void l.loadDemo(),children:"Demo Pad"}),a.jsx("button",{type:"button",className:`${o.button} ${l.source==="mic"?o.buttonActive:""}`,onClick:()=>void l.enableMic(),children:"Microphone"}),a.jsx("button",{type:"button",className:`${o.button} ${l.source==="tab"?o.buttonActive:""}`,onClick:()=>{l.captureTab().catch(r=>{const i=r instanceof Error?r.message:String(r);window.alert(`Tab audio capture failed:

${i}`)})},children:"Tab Audio"}),a.jsxs("label",{className:`${o.button} ${o.fileLabel} ${l.source==="file"?o.buttonActive:""}`,children:["Load File",a.jsx("input",{className:o.fileInput,type:"file",accept:"audio/*",onChange:x})]}),a.jsx("button",{type:"button",className:o.button,onClick:()=>l.stop(),disabled:!l.isActive,children:"Stop"})]}),a.jsx("div",{className:o.meters,ref:u,children:["BASS","MID","TREBLE","LEVEL"].map(r=>a.jsxs("div",{className:o.meter,children:[a.jsx("span",{className:o.meterLabel,children:r}),a.jsx("span",{className:o.meterBar,children:a.jsx("span",{className:o.meterFill})})]},r))})]}),a.jsxs("section",{className:o.section,children:[a.jsx("p",{className:o.sectionTitle,children:"Palette"}),a.jsxs("div",{className:o.audioGrid,children:[a.jsx("button",{type:"button",className:`${o.button} ${s.palette==="cosine"?o.buttonActive:""}`,onClick:()=>c(r=>({...r,palette:"cosine"})),children:"Cosine"}),a.jsx("button",{type:"button",className:`${o.button} ${s.palette==="colorField"?o.buttonActive:""}`,onClick:()=>c(r=>({...r,palette:"colorField"})),children:"Color Field"})]})]}),a.jsxs("section",{className:o.section,children:[a.jsx("p",{className:o.sectionTitle,children:"Audio Mix"}),a.jsx(_,{label:"Audio Gain",min:0,max:1.5,step:.01,value:s.audioGain,onChange:r=>c(i=>({...i,audioGain:r}))}),a.jsx(_,{label:"Smoothing",min:0,max:.96,step:.01,value:s.smoothing,onChange:r=>c(i=>({...i,smoothing:r}))}),a.jsx(_,{label:"Reactivity",min:0,max:1.5,step:.01,value:s.reactivity,onChange:r=>c(i=>({...i,reactivity:r}))})]}),a.jsxs("section",{className:o.section,children:[a.jsx("p",{className:o.sectionTitle,children:"Geometry"}),a.jsx(_,{label:"Branches",min:3,max:7,step:1,value:s.branchCount,onChange:r=>c(i=>({...i,branchCount:r})),format:r=>r.toFixed(0)}),a.jsx(_,{label:"Ring Radius",min:1,max:2.4,step:.05,value:s.ringRadius,onChange:r=>c(i=>({...i,ringRadius:r}))}),a.jsx(_,{label:"Child Scale",min:.3,max:.6,step:.01,value:s.childScale,onChange:r=>c(i=>({...i,childScale:r}))}),a.jsx(_,{label:"Spin Base",min:0,max:1,step:.01,value:s.spinBase,onChange:r=>c(i=>({...i,spinBase:r}))}),a.jsx(_,{label:"Bloom",min:0,max:1.5,step:.01,value:s.bloomIntensity,onChange:r=>c(i=>({...i,bloomIntensity:r}))})]})]})]})}export{We as default};
