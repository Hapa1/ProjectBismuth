import{a4 as te,r as h,w as V,j as d,C as re,E as ne,k as se,g as oe,m as j,S as ie,V as ae,D as ce,A as $,b as C,a6 as q,i as le,d as ue,s as O,ad as he,ae as de,M as pe}from"./index-Cn0ECLdO.js";import{I as fe}from"./IridescentSolid-Cjf-WAXd.js";const _=1,me=.34,K=Math.PI*2;function R(e,s,r=0){return Array.from({length:s},(a,c)=>{const n=r+c/s*K;return[e*Math.cos(n),e*Math.sin(n)]})}const ve=[0,0],z=R(_,6,0),ge=[...R(2*_,6,0),...R(_*Math.sqrt(3),6,Math.PI/6)],D=[ve,...z,...R(2*_,6,0)];function xe(e){const s=[];for(let r=0;r<e.length;r++)for(let a=r+1;a<e.length;a++)s.push({kind:"line",a:e[r],b:e[a]});return s}const B=[{id:"circle",label:"Circle",description:"One circle. The starting move of every construction.",primitives:[{kind:"circle",cx:0,cy:0,r:_}]},{id:"seed",label:"Seed of Life",description:"Six circles around the first, hex-spaced.",primitives:z.map(([e,s])=>({kind:"circle",cx:e,cy:s,r:_}))},{id:"flower",label:"Flower of Life",description:"Twelve more circles fill out the symmetric ring.",primitives:ge.map(([e,s])=>({kind:"circle",cx:e,cy:s,r:_}))},{id:"fruit",label:"Fruit of Life",description:"Thirteen separated circles — the cube's vertices in 2D.",primitives:D.map(([e,s])=>({kind:"circle",cx:e,cy:s,r:me}))},{id:"metatron",label:"Metatron's Cube",description:"Every line between the thirteen fruit centres.",primitives:xe(D)},{id:"platonic",label:"Platonic Solids",description:"The five regular solids encoded in the cube.",primitives:[]}],ye=B.length,Se=.045,U=96;function be(e){const s=[];for(let r=0;r<=U;r++){const a=r/U*K;s.push([e.cx+e.r*Math.cos(a),e.cy+e.r*Math.sin(a)])}return s}function Me(e){return[e.a,e.b]}function _e(e){let s=0;for(let r=1;r<e.length;r++){const a=e[r][0]-e[r-1][0],c=e[r][1]-e[r-1][1];s+=Math.hypot(a,c)}return s}function Ae(){const e=1/ye,s=[],r=[],a=[],c=[],n=[];let o=0;return B.forEach((i,u)=>{const t=u*e,m=t+e;if(n.push(m),i.primitives.length===0)return;const f=i.primitives.map(x=>x.kind==="circle"?be(x):Me(x)),g=f.map(_e),A=g.reduce((x,y)=>x+y,0)||1;let v=t;i.primitives.forEach((x,y)=>{const Z=g[y]/A*e,k=v,I=v+Z;v=I;const p=f[y],b=[0];for(let l=1;l<p.length;l++){const S=p[l][0]-p[l-1][0],M=p[l][1]-p[l-1][1];b.push(b[l-1]+Math.hypot(S,M))}const J=b[b.length-1]||1;for(let l=0;l<b.length;l++)b[l]/=J;for(let l=0;l<p.length;l++){const S=p[Math.max(0,l-1)],M=p[Math.min(p.length-1,l+1)],w=M[0]-S[0],T=M[1]-S[1],L=Math.hypot(w,T)||1,N=-T/L,F=w/L,P=Se*.5,Q=p[l][0]+N*P,X=p[l][1]+F*P,Y=p[l][0]-N*P,ee=p[l][1]-F*P;s.push(Q,X,0,Y,ee,0);const H=k+b[l]*(I-k);r.push(H,H)}for(let l=0;l<p.length-1;l++){const S=o+l*2,M=S+1,w=S+2,T=S+3;a.push(S,w,M,M,w,T)}o+=p.length*2,c.push({aStart:k,aEnd:I,phaseIndex:u,samples:p,sampleArcs:b})})}),n[n.length-1]=1,{positions:new Float32Array(s),arcs:new Float32Array(r),indices:new Uint32Array(a),primitives:c,phaseEdges:n}}function Ee(e,s){for(let c=0;c<e.primitives.length;c++){const n=e.primitives[c];if(s<=n.aEnd){const o=n.aStart===n.aEnd?0:(s-n.aStart)/(n.aEnd-n.aStart),i=n.sampleArcs;let u=0,t=i.length-1;for(;u<t-1;){const y=u+t>>1;i[y]<=o?u=y:t=y}const m=i[t]-i[u]||1,f=(o-i[u])/m,g=n.samples[u][0],A=n.samples[u][1],v=n.samples[t][0],x=n.samples[t][1];return{x:g+(v-g)*f,y:A+(x-A)*f,active:!0}}}const r=e.primitives[e.primitives.length-1];if(!r)return{x:0,y:0,active:!1};const a=r.samples[r.samples.length-1];return{x:a[0],y:a[1],active:!1}}const we="_root_10iox_1",Te="_canvasHost_10iox_17",Pe="_chipBar_10iox_27",Re="_chip_10iox_27",ke="_chipActive_10iox_131",Ie="_chipIndex_10iox_143",E={root:we,canvasHost:Te,chipBar:Pe,chip:Re,chipActive:ke,chipIndex:Ie},je=`precision highp float;\r
\r
attribute float aArc;\r
\r
varying float vArc;\r
varying vec2 vWorld;\r
\r
void main() {\r
  vArc = aArc;\r
  vec4 wp = modelMatrix * vec4(position, 1.0);\r
  vWorld = wp.xy;\r
  gl_Position = projectionMatrix * viewMatrix * wp;\r
}\r
`,Ce=`// Stroke fragment — discards segments past the pencil tip and emits an\r
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
  gl_FragColor = vec4(col * uIntensity, 1.0);\r
}\r
`,Be=Ce.replace("// __PALETTE_CHUNKS__",`${he}
${de}`),Le=1/70,Ne=8,Fe=4;function G(){return{reveal:0,target:1,fast:!1,holdT:0,activePhase:0}}function He({data:e,controller:s,pencilWorldRef:r,pencilStrengthRef:a,reduceMotion:c}){const n=h.useMemo(()=>{const i=new oe;return i.setAttribute("position",new j(e.positions,3)),i.setAttribute("aArc",new j(e.arcs,1)),i.setIndex(new j(e.indices,1)),i.computeBoundingSphere(),i},[e]),o=h.useMemo(()=>new ie({vertexShader:je,fragmentShader:Be,transparent:!0,depthWrite:!1,blending:$,side:ce,uniforms:{uTime:{value:0},uReveal:{value:0},uIntensity:{value:1.4},uPaletteOffset:{value:new ae(.55,.88,1.22)},uPencil:{value:new V(0,0)},uPencilStrength:{value:0}}}),[]);return h.useEffect(()=>()=>{n.dispose(),o.dispose()},[n,o]),C((i,u)=>{const t=s.current;if(c)t.reveal=t.target;else{const v=(t.fast?Ne:1)*Le,x=t.target>=t.reveal?1:-1,y=t.reveal+x*v*u;x>0&&y>=t.target||x<0&&y<=t.target?(t.reveal=t.target,t.fast=!1,t.target<1&&(t.target=1)):t.reveal=y,t.reveal>=1-1e-4?(t.holdT+=u,t.holdT>=Fe&&(t.holdT=0,t.reveal=0,t.target=1,t.fast=!1)):t.holdT=0}let m=0;for(let v=0;v<e.phaseEdges.length;v++){if(t.reveal<=e.phaseEdges[v]+1e-6){m=v;break}m=v}t.activePhase=m;const f=o.uniforms;f.uTime.value+=u,f.uReveal.value=t.reveal;const g=Ee(e,t.reveal);r.current.set(g.x,g.y),f.uPencil.value.set(g.x,g.y);const A=t.reveal>=1-1e-4?.2:1;a.current+=(A-a.current)*(1-Math.exp(-u*4)),f.uPencilStrength.value=a.current}),d.jsx("mesh",{geometry:n,material:o})}function Oe({pencilWorldRef:e,pencilStrengthRef:s}){const r=h.useRef(null),a=h.useRef(null),c=q({palette:"cosine",paletteOffset:[.55,.88,1.22],intensity:1.6,rimBoost:2,fresnelPower:2}),n=h.useMemo(()=>new le({color:new ue("#ff9ce6"),transparent:!0,opacity:.4,depthWrite:!1,blending:$}),[]);h.useEffect(()=>()=>n.dispose(),[n]);const o=h.useMemo(()=>new O(.045,24,16),[]),i=h.useMemo(()=>new O(.18,24,16),[]);return h.useEffect(()=>()=>{o.dispose(),i.dispose()},[o,i]),C((u,t)=>{const m=c.uniforms;m.uTime.value+=t,m.uMirage.value=.85,m.uTreble.value=s.current,m.uLevel.value=s.current*.5;const f=e.current;if(r.current&&(r.current.position.set(f.x,f.y,.02),r.current.scale.setScalar(.7+.6*s.current)),a.current){a.current.position.set(f.x,f.y,.01);const g=.7+.5*s.current;a.current.scale.setScalar(g),a.current.material.opacity=.35*s.current}}),d.jsxs("group",{children:[d.jsx("mesh",{ref:a,geometry:i,material:n}),d.jsx("mesh",{ref:r,geometry:o,material:c})]})}const W=["tetra","box","octa","dodeca","icosa"];function De({controller:e,data:s}){const r=h.useRef(null),a=h.useRef(0),c=q({palette:"cosine",paletteOffset:[.55,.88,1.22],intensity:1.2,rimBoost:1.8,fresnelPower:2.5,alphaBase:0});h.useEffect(()=>{c.transparent=!0},[c]),C((o,i)=>{const u=e.current,t=s.phaseEdges[s.phaseEdges.length-2]??.83,m=pe.clamp((u.reveal-t)/Math.max(1e-4,1-t),0,1);a.current+=(m-a.current)*(1-Math.exp(-i*3)),c.uniforms.uTime.value+=i,c.uniforms.uMirage.value=.6+.4*a.current,r.current&&(r.current.rotation.y+=i*.18,r.current.rotation.x=.2+.05*Math.sin(c.uniforms.uTime.value*.4),r.current.scale.setScalar(.001+a.current))});const n=h.useMemo(()=>W.map((o,i)=>{const u=i/W.length*Math.PI*2-Math.PI/2,t=1.6;return{kind:o,position:[t*Math.cos(u),t*Math.sin(u),.4]}}),[]);return d.jsx("group",{ref:r,children:n.map(o=>d.jsx(fe,{kind:o.kind,size:.42,position:o.position,material:c,rotation:[.3,.6,0]},o.kind))})}function Ue({controller:e,data:s}){const[,r]=h.useState(0);h.useEffect(()=>{let n=0;const o=()=>{r(i=>i+1&65535),n=requestAnimationFrame(o)};return n=requestAnimationFrame(o),()=>cancelAnimationFrame(n)},[]);const a=n=>{const o=e.current,i=s.phaseEdges[n];if(i<o.reveal){const u=n===0?0:s.phaseEdges[n-1];o.reveal=u,o.target=1,o.fast=!1,o.holdT=0}else i>o.reveal&&(o.target=i,o.fast=!0)},c=e.current.activePhase;return d.jsx("div",{className:E.chipBar,role:"tablist","aria-label":"Sacred geometry phases",children:B.map((n,o)=>{const i=o===c;return d.jsxs("button",{type:"button",role:"tab","aria-selected":i,"aria-pressed":i,className:`${E.chip} ${i?E.chipActive:""}`,onClick:()=>a(o),children:[d.jsx("span",{className:E.chipIndex,children:String(o+1).padStart(2,"0")}),d.jsx("span",{children:n.label})]},n.id)})})}function Ve({width:e}){const s=te(),r=h.useMemo(()=>Ae(),[]),a=h.useRef(G()),c=h.useRef(new V(0,0)),n=h.useRef(0),o=e<480?9.5:e<768?8.4:7.4,i=Math.min(typeof window<"u"?window.devicePixelRatio:1,2);return h.useEffect(()=>{a.current=G()},[]),d.jsxs("div",{className:E.root,children:[d.jsx("div",{className:E.canvasHost,children:d.jsxs(re,{orthographic:!1,camera:{position:[0,0,o],fov:45,near:.1,far:100},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,i],children:[d.jsx("color",{attach:"background",args:["#050507"]}),d.jsx(He,{data:r,controller:a,pencilWorldRef:c,pencilStrengthRef:n,reduceMotion:s}),d.jsx(Oe,{pencilWorldRef:c,pencilStrengthRef:n}),d.jsx(De,{controller:a,data:r}),d.jsx(ne,{children:d.jsx(se,{intensity:1.35,luminanceThreshold:.18,luminanceSmoothing:.6,mipmapBlur:!0})})]})}),d.jsx(Ue,{controller:a,data:r})]})}export{Ve as default};
