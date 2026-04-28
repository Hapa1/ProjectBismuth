import{r as c,u as w,j as e}from"./index-Brqux3uL.js";import{C as S,k as M,l as y,m as C,S as L,b as N,A,u as b,n as F,o as x,p,V as d,T as E,c as q}from"./react-three-fiber.esm-Cfkc_fHU.js";import{O as G}from"./OrbitControls-biyt-IFx.js";import{M as R}from"./MeshReflectorMaterial-BqxYrbu-.js";import"./extends-CF3RwP-h.js";const B="_root_1t9uq_1",P="_canvasHost_1t9uq_17",k="_panel_1t9uq_27",$="_panelTitle_1t9uq_61",I="_subtitle_1t9uq_77",D="_section_1t9uq_91",V="_sectionTitle_1t9uq_99",U="_row_1t9uq_115",W="_label_1t9uq_131",H="_value_1t9uq_141",O="_slider_1t9uq_155",z="_audioGrid_1t9uq_169",Y="_button_1t9uq_183",J="_buttonActive_1t9uq_219",K="_fileLabel_1t9uq_231",Q="_fileInput_1t9uq_245",X="_meters_1t9uq_253",Z="_meter_1t9uq_253",ee="_meterLabel_1t9uq_279",te="_meterBar_1t9uq_293",ne="_meterFill_1t9uq_307",o={root:B,canvasHost:P,panel:k,panelTitle:$,subtitle:I,section:D,sectionTitle:V,row:U,label:W,value:H,slider:O,audioGrid:z,button:Y,buttonActive:J,fileLabel:K,fileInput:Q,meters:X,meter:Z,meterLabel:ee,meterBar:te,meterFill:ne},se=`varying vec2 vUv;\r
\r
void main() {\r
  vUv = uv;\r
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}\r
`,oe=`precision highp float;\r
\r
varying vec2 vUv;\r
\r
uniform float uTime;\r
uniform float uBass;\r
uniform float uMid;\r
uniform float uTreble;\r
uniform float uLevel;\r
uniform vec3  uRingColor;\r
\r
// 8 ring cluster centres in UV space (0..1)\r
const vec2 CENTERS[8] = vec2[8](\r
  vec2(0.18, 0.22),\r
  vec2(0.72, 0.15),\r
  vec2(0.38, 0.55),\r
  vec2(0.82, 0.65),\r
  vec2(0.12, 0.78),\r
  vec2(0.58, 0.85),\r
  vec2(0.50, 0.30),\r
  vec2(0.28, 0.92)\r
);\r
\r
// Map audio band index to a blend of bass/mid/treble\r
float bandValue(int i) {\r
  if (i < 3) return uBass;\r
  if (i < 6) return uMid;\r
  return uTreble;\r
}\r
\r
void main() {\r
  vec2 uv = vUv;\r
  vec3 color = vec3(0.0);\r
\r
  for (int i = 0; i < 8; i++) {\r
    float d = distance(uv, CENTERS[i]);\r
    float band = bandValue(i);\r
\r
    // 5 concentric rings per cluster\r
    for (int k = 1; k <= 5; k++) {\r
      // Ring radius expands outward over time, modulated by audio\r
      float r = float(k) * 0.055 + fract(uTime * (0.012 + band * 0.018));\r
      float ringWidth = 0.005 + band * 0.003;\r
      float glow = exp(-pow((d - r) / ringWidth, 2.0));\r
      float intensity = 0.5 + band * 0.9;\r
      color += uRingColor * glow * intensity;\r
    }\r
  }\r
\r
  // Soft vignette to fade edges\r
  float vignette = smoothstep(0.0, 0.35, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));\r
  color *= vignette;\r
\r
  // Alpha based on accumulated brightness\r
  float alpha = clamp(length(color) * 0.8, 0.0, 1.0);\r
  gl_FragColor = vec4(color, alpha);\r
}\r
`;function re({bandsRef:a,width:n}){return e.jsxs(e.Fragment,{children:[e.jsx(ae,{}),e.jsx(ie,{}),e.jsx(le,{}),e.jsx(ce,{}),e.jsx(ue,{bandsRef:a}),e.jsx(me,{bandsRef:a}),e.jsx(de,{}),e.jsx(fe,{width:n}),e.jsx(G,{maxPolarAngle:Math.PI/2.1,minDistance:3,maxDistance:16,enablePan:!1,target:[0,1.5,-2]})]})}function ae(){return e.jsxs(e.Fragment,{children:[e.jsx("ambientLight",{color:"#ffe0c0",intensity:.6}),e.jsx("directionalLight",{color:"#fff8e8",intensity:1.8,position:[-6,8,-4],castShadow:!1}),e.jsx("pointLight",{color:"#ffddaa",intensity:.8,position:[0,.5,0]}),e.jsx("rectAreaLight",{color:"#fff6e6",intensity:2,width:12,height:4,position:[0,3.6,-4],rotation:[Math.PI/2,0,0]})]})}function ie(){const a=c.useMemo(()=>{const n=document.createElement("canvas");n.width=1024,n.height=512;const t=n.getContext("2d"),i=t.createLinearGradient(0,0,0,200);i.addColorStop(0,"#87ceeb"),i.addColorStop(1,"#c8e8f0"),t.fillStyle=i,t.fillRect(0,0,1024,200);const s=t.createLinearGradient(0,160,0,320);s.addColorStop(0,"#6b8f71"),s.addColorStop(1,"#3a6b42"),t.fillStyle=s,t.beginPath(),t.moveTo(0,220),t.lineTo(200,180),t.lineTo(400,200),t.lineTo(600,160),t.lineTo(800,190),t.lineTo(1024,170),t.lineTo(1024,320),t.lineTo(0,320),t.closePath(),t.fill();const l=t.createLinearGradient(0,250,0,512);l.addColorStop(0,"#2d5a3a"),l.addColorStop(1,"#1a3d26"),t.fillStyle=l,t.fillRect(0,280,1024,232),t.fillStyle="#1f4a2e";for(let r=0;r<60;r++){const u=r/60*1024,h=40+Math.random()*80,f=8+Math.random()*12;t.beginPath(),t.moveTo(u,300),t.lineTo(u+f/2,300-h),t.lineTo(u+f,300),t.closePath(),t.fill()}const m=new y(n);return m.colorSpace=C,m},[]);return c.useEffect(()=>()=>a.dispose(),[a]),e.jsxs("mesh",{position:[0,2,-10],frustumCulled:!1,children:[e.jsx("planeGeometry",{args:[40,20]}),e.jsx("meshBasicMaterial",{map:a,depthWrite:!1,toneMapped:!1})]})}function le(){const a=c.useMemo(()=>{const n=[];for(let t=-3;t<=3;t++)n.push([t*3.5,2,-6]);return n},[]);return e.jsx(e.Fragment,{children:a.map((n,t)=>e.jsxs("mesh",{position:n,children:[e.jsx("boxGeometry",{args:[.2,4,.2]}),e.jsx("meshStandardMaterial",{color:"#f2ede8",roughness:.4})]},t))})}function ce(){return e.jsxs("mesh",{"rotation-x":-Math.PI/2,position:[0,-.01,0],children:[e.jsx("planeGeometry",{args:[24,24]}),e.jsx(R,{color:"#f5d0b8",blur:[512,128],mixBlur:.7,mixStrength:.8,roughness:.05,resolution:1024,mirror:.6,depthScale:.8,minDepthThreshold:.4,maxDepthThreshold:1.2})]})}function ue({bandsRef:a}){const n=c.useMemo(()=>new L({vertexShader:se,fragmentShader:oe,transparent:!0,depthWrite:!1,blending:A,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uLevel:{value:0},uRingColor:{value:new N("#ffd37a")}}}),[]);return c.useEffect(()=>()=>n.dispose(),[n]),b((t,i)=>{n.uniforms.uTime.value+=i;const s=a.current;n.uniforms.uBass.value=s.bass,n.uniforms.uMid.value=s.mid,n.uniforms.uTreble.value=s.treble,n.uniforms.uLevel.value=s.level}),e.jsxs("mesh",{"rotation-x":-Math.PI/2,position:[0,.005,0],children:[e.jsx("planeGeometry",{args:[24,24]}),e.jsx("primitive",{object:n,attach:"material"})]})}function me({bandsRef:a}){const n=c.useRef([]),t=c.useMemo(()=>{const l=he(64222),m=[];for(let r=0;r<20;r++){const u=(l()-.5)*18,h=(l()-.5)*14-2,f=1+l()*2;m.push({pos:[u,3.8+l()*.4,h],scale:[f,f*.25,f]})}return m},[]),i=c.useMemo(()=>new F(1,32,16),[]),s=c.useMemo(()=>new x({color:"#ffd7b0",emissive:"#ffe8c8",emissiveIntensity:.4,roughness:.9}),[]);return c.useEffect(()=>()=>{i.dispose(),s.dispose()},[i,s]),b(()=>{const l=a.current.bass;s.emissiveIntensity=.4+l*.6}),e.jsx(e.Fragment,{children:t.map((l,m)=>e.jsx("mesh",{ref:r=>{r&&(n.current[m]=r)},position:l.pos,scale:l.scale,geometry:i,material:s},m))})}function de(){const{geometries:a,material:n}=c.useMemo(()=>{const t=new x({color:"#a04010",metalness:.3,roughness:.5});return{geometries:[new p([new d(-10,3.6,-6),new d(-4,3.9,-3),new d(2,3.5,-5),new d(8,3.8,-2),new d(11,3.7,-6)]),new p([new d(-9,3.8,-2),new d(-3,3.5,-5),new d(3,3.9,-1),new d(9,3.6,-4)]),new p([new d(-7,3.7,-7),new d(0,4,-4),new d(6,3.6,-7),new d(10,3.9,-3)])].map(l=>new E(l,48,.12,8,!1)),material:t}},[]);return c.useEffect(()=>()=>{a.forEach(t=>t.dispose()),n.dispose()},[a,n]),e.jsx(e.Fragment,{children:a.map((t,i)=>e.jsx("mesh",{geometry:t,material:n},i))})}function fe({width:a}){const{camera:n}=q(),t=c.useRef(!1);return c.useEffect(()=>{if(!t.current){const i=a<480?9:7;n.position.set(0,1.2,i),n.lookAt(0,1.5,-4),t.current=!0}},[n,a]),null}function he(a){let n=a>>>0;return()=>{n=n+1831565813>>>0;let t=n;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function v({label:a,min:n,max:t,step:i,value:s,onChange:l}){const m=`luminal-${a.toLowerCase().replace(/\s+/g,"-")}`;return e.jsxs("div",{className:o.row,children:[e.jsx("label",{htmlFor:m,className:o.label,children:a}),e.jsx("span",{className:o.value,children:i>=1?s.toFixed(0):s.toFixed(2)}),e.jsx("input",{id:m,type:"range",className:o.slider,min:n,max:t,step:i,value:s,onChange:r=>l(Number(r.target.value))})]})}const pe={audioGain:.9,smoothing:.82};function je({width:a,height:n}){const[t,i]=c.useState(pe),s=w(),l=c.useRef(null);c.useEffect(()=>{s.setGain(t.audioGain)},[s,t.audioGain]),c.useEffect(()=>{s.setSmoothing(t.smoothing)},[s,t.smoothing]),c.useEffect(()=>{let r=0;const u=()=>{const h=l.current;if(h){const f=s.bands.current,g=h.querySelectorAll(`.${o.meterFill}`),_=[f.bass,f.mid,f.treble,f.level];g.forEach((j,T)=>{j.style.width=`${Math.min(100,_[T]*130)}%`})}r=requestAnimationFrame(u)};return r=requestAnimationFrame(u),()=>cancelAnimationFrame(r)},[s.bands]);const m=r=>{var h;const u=(h=r.target.files)==null?void 0:h[0];u&&s.loadFile(u),r.target.value=""};return e.jsxs("div",{className:o.root,style:{width:a,height:n},children:[e.jsx("div",{className:o.canvasHost,children:e.jsx(S,{gl:{antialias:!0,powerPreference:"high-performance",toneMapping:M,toneMappingExposure:1.2},dpr:[1,Math.min(window.devicePixelRatio,2)],camera:{fov:55,position:[0,1.2,7],near:.1,far:100},children:e.jsx(re,{bandsRef:s.bands,width:a})})}),e.jsxs("aside",{className:o.panel,"aria-label":"Luminal controls",children:[e.jsx("h3",{className:o.panelTitle,children:"Luminal Pavilion"}),e.jsx("p",{className:o.subtitle,children:"Audio-reactive reflective pavilion. Pick an audio source below."}),e.jsxs("section",{className:o.section,children:[e.jsx("p",{className:o.sectionTitle,children:"Audio Source"}),e.jsxs("div",{className:o.audioGrid,children:[e.jsx("button",{type:"button",className:`${o.button} ${s.source==="demo"?o.buttonActive:""}`,onClick:()=>void s.loadDemo(),children:"Demo Pad"}),e.jsx("button",{type:"button",className:`${o.button} ${s.source==="mic"?o.buttonActive:""}`,onClick:()=>void s.enableMic(),children:"Microphone"}),e.jsx("button",{type:"button",className:`${o.button} ${s.source==="tab"?o.buttonActive:""}`,onClick:()=>{s.captureTab().catch(r=>{const u=r instanceof Error?r.message:String(r);window.alert(`Tab audio capture failed:

${u}`)})},title:"Pick another tab (e.g. Spotify Web, YouTube) and tick 'Share tab audio'",children:"Tab Audio"}),e.jsxs("label",{className:`${o.button} ${o.fileLabel} ${s.source==="file"?o.buttonActive:""}`,children:["Load File",e.jsx("input",{className:o.fileInput,type:"file",accept:"audio/*",onChange:m})]}),e.jsx("button",{type:"button",className:o.button,onClick:()=>s.stop(),disabled:!s.isActive,children:"Stop"})]}),e.jsx("div",{className:o.meters,ref:l,children:["BASS","MID","TREBLE","LEVEL"].map(r=>e.jsxs("div",{className:o.meter,children:[e.jsx("span",{className:o.meterLabel,children:r}),e.jsx("span",{className:o.meterBar,children:e.jsx("span",{className:o.meterFill})})]},r))})]}),e.jsxs("section",{className:o.section,children:[e.jsx("p",{className:o.sectionTitle,children:"Audio Mix"}),e.jsx(v,{label:"Audio Gain",min:0,max:1.5,step:.01,value:t.audioGain,onChange:r=>i(u=>({...u,audioGain:r}))}),e.jsx(v,{label:"Smoothing",min:0,max:.96,step:.01,value:t.smoothing,onChange:r=>i(u=>({...u,smoothing:r}))})]})]})]})}export{je as default};
