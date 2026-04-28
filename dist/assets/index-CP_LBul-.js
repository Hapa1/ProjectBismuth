import{w as ae,r as h,k as Z,j as d,C as ce,E as le,l as de,g as ue,J as R,S as X,V as he,D as pe,A as B,b as L,p as Y,i as fe,d as J,K as U,M as O,L as me,N as ge,s as ve,q as ye,t as xe,B as we,T as be,Q as _e}from"./index-CuS_Sl1Z.js";const T=1,Me=.5,Q=Math.PI*2;function C(e,r,n=0){return Array.from({length:r},(o,p)=>{const t=n+p/r*Q;return[e*Math.cos(t),e*Math.sin(t)]})}const Se=[0,0],ee=C(T,6,0),Ae=[...C(2*T,6,0),...C(T*Math.sqrt(3),6,Math.PI/6)],z=[Se,...ee,...C(2*T,6,0)];function Ee(e){const r=[];for(let n=0;n<e.length;n++)for(let o=n+1;o<e.length;o++)r.push({kind:"line",a:e[n],b:e[o]});return r}const N=[{id:"circle",label:"Circle",description:"One circle. The starting move of every construction.",primitives:[{kind:"circle",cx:0,cy:0,r:T}]},{id:"seed",label:"Seed of Life",description:"Six circles around the first, hex-spaced.",primitives:ee.map(([e,r])=>({kind:"circle",cx:e,cy:r,r:T}))},{id:"flower",label:"Flower of Life",description:"Twelve more circles fill out the symmetric ring.",primitives:Ae.map(([e,r])=>({kind:"circle",cx:e,cy:r,r:T}))},{id:"fruit",label:"Fruit of Life",description:"Thirteen separated circles — the cube's vertices in 2D.",primitives:z.map(([e,r])=>({kind:"circle",cx:e,cy:r,r:Me}))},{id:"metatron",label:"Metatron's Cube",description:"Every line between the thirteen fruit centres.",primitives:Ee(z)},{id:"platonic",label:"Platonic Solids",description:"The five regular solids encoded in the cube.",primitives:[]}],Te=N.length,Pe=.045,$=96;function Ie(e){const r=[];for(let n=0;n<=$;n++){const o=n/$*Q;r.push([e.cx+e.r*Math.cos(o),e.cy+e.r*Math.sin(o)])}return r}function Re(e){return[e.a,e.b]}function je(e){let r=0;for(let n=1;n<e.length;n++){const o=e[n][0]-e[n-1][0],p=e[n][1]-e[n-1][1];r+=Math.hypot(o,p)}return r}function ke(){const e=1/Te,r=[],n=[],o=[],p=[],t=[],i=[];let c=0;return N.forEach((l,u)=>{const f=u*e,s=f+e;if(i.push(s),l.primitives.length===0)return;const a=l.id==="metatron"?.22:1,m=l.primitives.map(x=>x.kind==="circle"?Ie(x):Re(x)),g=m.map(je),y=g.reduce((x,M)=>x+M,0)||1;let b=f;l.primitives.forEach((x,M)=>{const P=g[M]/y*e,G=b,F=b+P;b=F;const w=m[M],A=[0];for(let v=1;v<w.length;v++){const S=w[v][0]-w[v-1][0],E=w[v][1]-w[v-1][1];A.push(A[v-1]+Math.hypot(S,E))}const re=A[A.length-1]||1;for(let v=0;v<A.length;v++)A[v]/=re;for(let v=0;v<w.length;v++){const S=w[Math.max(0,v-1)],E=w[Math.min(w.length-1,v+1)],I=E[0]-S[0],j=E[1]-S[1],D=Math.hypot(I,j)||1,W=-j/D,H=I/D,k=Pe*.5,ne=w[v][0]+W*k,se=w[v][1]+H*k,oe=w[v][0]-W*k,ie=w[v][1]-H*k;r.push(ne,se,0,oe,ie,0);const V=G+A[v]*(F-G);n.push(V,V),o.push(a,a)}for(let v=0;v<w.length-1;v++){const S=c+v*2,E=S+1,I=S+2,j=S+3;p.push(S,I,E,E,I,j)}c+=w.length*2,t.push({aStart:G,aEnd:F,phaseIndex:u,samples:w,sampleArcs:A})})}),i[i.length-1]=1,{positions:new Float32Array(r),arcs:new Float32Array(n),intensityMods:new Float32Array(o),indices:new Uint32Array(p),primitives:t,phaseEdges:i}}function Ce(e,r){for(let p=0;p<e.primitives.length;p++){const t=e.primitives[p];if(r<=t.aEnd){const i=t.aStart===t.aEnd?0:(r-t.aStart)/(t.aEnd-t.aStart),c=t.sampleArcs;let l=0,u=c.length-1;for(;l<u-1;){const b=l+u>>1;c[b]<=i?l=b:u=b}const f=c[u]-c[l]||1,s=(i-c[l])/f,a=t.samples[l][0],m=t.samples[l][1],g=t.samples[u][0],y=t.samples[u][1];return{x:a+(g-a)*s,y:m+(y-m)*s,active:!0}}}const n=e.primitives[e.primitives.length-1];if(!n)return{x:0,y:0,active:!1};const o=n.samples[n.samples.length-1];return{x:o[0],y:o[1],active:!1}}const Be="_root_izd3y_1",Le="_canvasHost_izd3y_17",Ge="_chipBar_izd3y_27",Fe="_chip_izd3y_27",Oe="_chipActive_izd3y_131",Ne="_chipIndex_izd3y_143",De="_sliderPanel_izd3y_183",We="_sliderToggle_izd3y_207",He="_sliderTray_izd3y_261",Ve="_sliderRow_izd3y_285",Ue="_sliderLabel_izd3y_305",ze="_sliderInput_izd3y_321",$e="_sliderValue_izd3y_389",_={root:Be,canvasHost:Le,chipBar:Ge,chip:Fe,chipActive:Oe,chipIndex:Ne,sliderPanel:De,sliderToggle:We,sliderTray:He,sliderRow:Ve,sliderLabel:Ue,sliderInput:ze,sliderValue:$e},qe=`precision highp float;\r
\r
attribute float aArc;\r
attribute float aIntensityMod;\r
\r
varying float vArc;\r
varying vec2 vWorld;\r
varying float vIntensityMod;\r
\r
void main() {\r
  vArc = aArc;\r
  vIntensityMod = aIntensityMod;\r
  vec4 wp = modelMatrix * vec4(position, 1.0);\r
  vWorld = wp.xy;\r
  gl_Position = projectionMatrix * viewMatrix * wp;\r
}\r
`,Ke=`// Stroke fragment — discards segments past the pencil tip and emits an\r
// iridescent body plus a hot bleeding head where aArc ≈ uReveal.\r
\r
precision highp float;\r
\r
uniform float uTime;\r
uniform float uReveal;\r
uniform float uIntensity;\r
uniform vec3  uPaletteOffset;\r
uniform vec2  uPencil;\r
uniform float uPencilStrength;\r
\r
varying float vArc;\r
varying vec2  vWorld;\r
varying float vIntensityMod;\r
\r
// __PALETTE_CHUNKS__\r
\r
void main() {\r
  float dRev = uReveal - vArc; // < 0 → ahead of the pencil (not yet drawn)\r
  if (dRev < 0.0) discard;\r
\r
  // Body iridescence — slow drift along the stroke.\r
  float t = vArc * 2.4 + uTime * 0.08;\r
  vec3 body = irCosineSpectrum(t, uPaletteOffset);\r
\r
  // Hot head: a tight gaussian centred on the pencil's aArc.\r
  float head = exp(-dRev * dRev * 90.0);\r
\r
  // Bleeding glow that radiates from the pencil tip in world space onto\r
  // the already-drawn segments behind it.\r
  float pd = length(vWorld - uPencil);\r
  float bleed = exp(-(pd * pd) / 1.6) * uPencilStrength;\r
\r
  // Body brightens slightly toward the head, settles to a steady wash behind.\r
  float bodyAmt = 0.55 + 0.45 * exp(-dRev * 3.5);\r
  vec3 col = body * (bodyAmt + head * 1.6 + bleed * 0.7);\r
  // Tinted hot core.\r
  col += vec3(1.0, 0.85, 1.25) * head * 0.55;\r
\r
  // Apply per-vertex intensity modulation (dims Metatron's overlapping lines).\r
  gl_FragColor = vec4(col * uIntensity * vIntensityMod, 1.0);\r
}\r
`,Ze=Ke.replace("// __PALETTE_CHUNKS__",`${me}
${ge}`),Xe=1/70,Ye=8,Je=4;function q(){return{reveal:0,target:1,fast:!1,holdT:0,activePhase:0}}const te={speed:1,bloom:1.35,glow:1.4};function Qe({data:e,controller:r,pencilWorldRef:n,pencilStrengthRef:o,reduceMotion:p,settingsRef:t,strokeDimRef:i}){const c=h.useMemo(()=>{const u=new ue;return u.setAttribute("position",new R(e.positions,3)),u.setAttribute("aArc",new R(e.arcs,1)),u.setAttribute("aIntensityMod",new R(e.intensityMods,1)),u.setIndex(new R(e.indices,1)),u.computeBoundingSphere(),u},[e]),l=h.useMemo(()=>new X({vertexShader:qe,fragmentShader:Ze,transparent:!0,depthWrite:!1,blending:B,side:pe,uniforms:{uTime:{value:0},uReveal:{value:0},uIntensity:{value:te.glow},uPaletteOffset:{value:new he(.55,.88,1.22)},uPencil:{value:new Z(0,0)},uPencilStrength:{value:0}}}),[]);return h.useEffect(()=>()=>{c.dispose(),l.dispose()},[c,l]),L((u,f)=>{const s=r.current,a=t.current.speed;if(p)s.reveal=s.target;else{const x=(s.fast?Ye:1)*Xe*a,M=s.target>=s.reveal?1:-1,P=s.reveal+M*x*f;M>0&&P>=s.target||M<0&&P<=s.target?(s.reveal=s.target,s.fast=!1,s.target<1&&(s.target=1)):s.reveal=P,s.reveal>=1-1e-4?(s.holdT+=f,s.holdT>=Je&&(s.holdT=0,s.reveal=0,s.target=1,s.fast=!1)):s.holdT=0}let m=0;for(let x=0;x<e.phaseEdges.length;x++){if(s.reveal<=e.phaseEdges[x]+1e-6){m=x;break}m=x}s.activePhase=m;const g=l.uniforms;g.uTime.value+=f,g.uReveal.value=s.reveal,g.uIntensity.value=t.current.glow*i.current;const y=Ce(e,s.reveal);n.current.set(y.x,y.y),g.uPencil.value.set(y.x,y.y);const b=s.reveal>=1-1e-4?.2:1;o.current+=(b-o.current)*(1-Math.exp(-f*4)),g.uPencilStrength.value=o.current}),d.jsx("mesh",{geometry:c,material:l})}function et({pencilWorldRef:e,pencilStrengthRef:r}){const n=h.useRef(null),o=h.useRef(null),p=Y({palette:"cosine",paletteOffset:[.55,.88,1.22],intensity:1.6,rimBoost:2,fresnelPower:2}),t=h.useMemo(()=>new fe({color:new J("#ff9ce6"),transparent:!0,opacity:.4,depthWrite:!1,blending:B}),[]);h.useEffect(()=>()=>t.dispose(),[t]);const i=h.useMemo(()=>new U(.045,24,16),[]),c=h.useMemo(()=>new U(.18,24,16),[]);return h.useEffect(()=>()=>{i.dispose(),c.dispose()},[i,c]),L((l,u)=>{const f=p.uniforms;f.uTime.value+=u,f.uMirage.value=.85,f.uTreble.value=r.current,f.uLevel.value=r.current*.5;const s=e.current;if(n.current&&(n.current.position.set(s.x,s.y,.02),n.current.scale.setScalar(.7+.6*r.current)),o.current){o.current.position.set(s.x,s.y,.01);const a=.7+.5*r.current;o.current.scale.setScalar(a),o.current.material.opacity=.35*r.current}}),d.jsxs("group",{children:[d.jsx("mesh",{ref:o,geometry:c,material:t}),d.jsx("mesh",{ref:n,geometry:i,material:p})]})}const K=["tetra","box","octa","dodeca","icosa"];function tt(e,r){switch(e){case"tetra":return new be(r);case"box":return new we(r,r,r);case"octa":return new xe(r);case"dodeca":return new ye(r);case"icosa":return new ve(r)}}function rt(e){const r=new _e(e,1),n=r.getAttribute("position"),o=n.count/2,p=new Map,t=[];function i(a,m,g){const y=`${a.toFixed(4)},${m.toFixed(4)},${g.toFixed(4)}`;if(p.has(y))return p.get(y);const b=t.length;return p.set(y,b),t.push([]),b}for(let a=0;a<o;a++){const m=i(n.getX(a*2),n.getY(a*2),n.getZ(a*2)),g=i(n.getX(a*2+1),n.getY(a*2+1),n.getZ(a*2+1));t[m].push({edgeIdx:a,other:g}),t[g].push({edgeIdx:a,other:m})}const c=new Float32Array(o*2),l=new Set,u=[0],f=new Set([0]);let s=0;for(;u.length>0;){const a=u.shift();for(const{edgeIdx:m,other:g}of t[a]){if(l.has(m))continue;l.add(m);const y=s/Math.max(1,o-1);c[m*2]=y,c[m*2+1]=y,s++,f.has(g)||(f.add(g),u.push(g))}}return r.setAttribute("aEdgeOrder",new R(c,1)),{edgeGeometry:r,edgeCount:o}}const nt=`
precision highp float;
attribute float aEdgeOrder;
varying float vEdgeOrder;
varying vec3 vWorldPos;
void main() {
  vEdgeOrder = aEdgeOrder;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,st=`
precision highp float;
uniform float uProgress;
uniform float uTime;
uniform vec3 uColor;
varying float vEdgeOrder;
varying vec3 vWorldPos;
void main() {
  if (vEdgeOrder > uProgress) discard;
  // Drawing head glow — tight gaussian at the frontier.
  float headDist = uProgress - vEdgeOrder;
  float head = exp(-headDist * headDist * 300.0);
  // Shimmer for hand-drawn feel.
  float shimmer = 0.75 + 0.25 * sin(uTime * 2.5 + vWorldPos.x * 12.0 + vWorldPos.y * 9.0);
  vec3 col = uColor * shimmer * 1.1;
  col += vec3(1.0, 0.92, 1.15) * head * 1.8;
  gl_FragColor = vec4(col, 1.0);
}
`;function ot({kind:e,size:r,position:n,progress:o,ghostAlpha:p,time:t,ghostMaterial:i,rotationSeed:c}){const l=h.useRef(null),u=h.useMemo(()=>tt(e,r),[e,r]),{edgeGeometry:f,edgeCount:s}=h.useMemo(()=>rt(u),[u]),a=h.useMemo(()=>new X({vertexShader:nt,fragmentShader:st,transparent:!0,depthWrite:!1,blending:B,uniforms:{uProgress:{value:0},uTime:{value:0},uColor:{value:new J("#a78bfa")}}}),[]);return h.useEffect(()=>()=>{u.dispose(),f.dispose(),a.dispose()},[u,f,a]),L((m,g)=>{if(a.uniforms.uProgress.value=o,a.uniforms.uTime.value=t,l.current){const y=.15+c*.12;l.current.rotation.y+=g*y,l.current.rotation.x+=g*y*.4}}),d.jsx("group",{position:n,children:d.jsxs("group",{ref:l,children:[d.jsx("mesh",{geometry:u,material:i,scale:p>.001?1:0}),d.jsx("lineSegments",{geometry:f,material:a})]})})}function it({controller:e,data:r,strokeDimRef:n}){const o=h.useRef(0),p=h.useRef(0),t=h.useRef(0),[i,c]=h.useState({progress:0,ghostAlpha:0,time:0}),l=Y({palette:"cosine",paletteOffset:[.55,.88,1.22],intensity:.25,rimBoost:.6,fresnelPower:2.5,alphaBase:0});h.useEffect(()=>{l.transparent=!0,l.depthWrite=!1,l.blending=B},[l]),L((f,s)=>{const a=e.current,m=r.phaseEdges[r.phaseEdges.length-2]??.83,g=O.clamp((a.reveal-m)/Math.max(1e-4,1-m),0,1),y=Math.min(g*2,1)*.2;t.current+=(y-t.current)*(1-Math.exp(-s*3));const x=O.clamp((g-.1)/.9,0,1);o.current+=(x-o.current)*(1-Math.exp(-s*2)),p.current+=s,l.uniforms.uTime.value+=s,l.uniforms.uMirage.value=.15+.25*t.current;const M=1-g*.6;n.current+=(M-n.current)*(1-Math.exp(-s*3)),c({progress:o.current,ghostAlpha:t.current,time:p.current})});const u=h.useMemo(()=>K.map((f,s)=>{const a=s/K.length*Math.PI*2-Math.PI/2,m=1.6;return{kind:f,position:[m*Math.cos(a),m*Math.sin(a),.4]}}),[]);return d.jsx("group",{children:u.map((f,s)=>{const a=s*.08,m=O.clamp((i.progress-a)/(1-a),0,1);return d.jsx(ot,{kind:f.kind,size:.42,position:f.position,progress:m,ghostAlpha:i.ghostAlpha,time:i.time,ghostMaterial:l,rotationSeed:s},f.kind)})})}function at({controller:e,data:r}){const[,n]=h.useState(0);h.useEffect(()=>{let t=0;const i=()=>{n(c=>c+1&65535),t=requestAnimationFrame(i)};return t=requestAnimationFrame(i),()=>cancelAnimationFrame(t)},[]);const o=t=>{const i=e.current,c=r.phaseEdges[t];if(c<i.reveal){const l=t===0?0:r.phaseEdges[t-1];i.reveal=l,i.target=1,i.fast=!1,i.holdT=0}else c>i.reveal&&(i.target=c,i.fast=!0)},p=e.current.activePhase;return d.jsx("div",{className:_.chipBar,role:"tablist","aria-label":"Sacred geometry phases",children:N.map((t,i)=>{const c=i===p;return d.jsxs("button",{type:"button",role:"tab","aria-selected":c,"aria-pressed":c,className:`${_.chip} ${c?_.chipActive:""}`,onClick:()=>o(i),children:[d.jsx("span",{className:_.chipIndex,children:String(i+1).padStart(2,"0")}),d.jsx("span",{children:t.label})]},t.id)})})}function ct({settings:e,onChange:r}){const[n,o]=h.useState(!1),p=[{key:"speed",label:"Speed",min:.25,max:4,step:.25},{key:"bloom",label:"Bloom",min:0,max:3,step:.05},{key:"glow",label:"Glow",min:.3,max:2.5,step:.05}];return d.jsxs("div",{className:_.sliderPanel,children:[d.jsx("button",{type:"button",className:_.sliderToggle,onClick:()=>o(t=>!t),"aria-label":n?"Hide settings":"Show settings","aria-expanded":n,children:d.jsxs("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",children:[d.jsx("circle",{cx:"12",cy:"12",r:"3"}),d.jsx("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"})]})}),n&&d.jsx("div",{className:_.sliderTray,children:p.map(t=>d.jsxs("label",{className:_.sliderRow,children:[d.jsx("span",{className:_.sliderLabel,children:t.label}),d.jsx("input",{type:"range",min:t.min,max:t.max,step:t.step,value:e[t.key],onChange:i=>r({[t.key]:parseFloat(i.target.value)}),className:_.sliderInput}),d.jsx("span",{className:_.sliderValue,children:e[t.key].toFixed(2)})]},t.key))})]})}function dt({width:e}){const r=ae(),n=h.useMemo(()=>ke(),[]),o=h.useRef(q()),p=h.useRef(new Z(0,0)),t=h.useRef(0),i=h.useRef(1),[c,l]=h.useState({...te}),u=h.useRef(c);u.current=c;const f=h.useCallback(m=>{l(g=>({...g,...m}))},[]),s=e<480?9.5:e<768?8.4:7.4,a=Math.min(typeof window<"u"?window.devicePixelRatio:1,2);return h.useEffect(()=>{o.current=q()},[]),d.jsxs("div",{className:_.root,children:[d.jsx("div",{className:_.canvasHost,children:d.jsxs(ce,{orthographic:!1,camera:{position:[0,0,s],fov:45,near:.1,far:100},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,a],children:[d.jsx("color",{attach:"background",args:["#050507"]}),d.jsx(Qe,{data:n,controller:o,pencilWorldRef:p,pencilStrengthRef:t,reduceMotion:r,settingsRef:u,strokeDimRef:i}),d.jsx(et,{pencilWorldRef:p,pencilStrengthRef:t}),d.jsx(it,{controller:o,data:n,strokeDimRef:i}),d.jsx(le,{children:d.jsx(de,{intensity:c.bloom,luminanceThreshold:.18,luminanceSmoothing:.6,mipmapBlur:!0})})]})}),d.jsx(at,{controller:o,data:n}),d.jsx(ct,{settings:c,onChange:f})]})}export{dt as default};
