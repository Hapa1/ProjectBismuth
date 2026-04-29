import{r as c,a as V,j as e,C as Y,b as h,c as P,F as I,S as L,B as W,d as k,O as $,M as G,V as _,e as O,f as R,I as H}from"./index-DMYix05E.js";const q="_root_2pgom_1",U="_canvasHost_2pgom_17",J="_panel_2pgom_27",K="_panelTitle_2pgom_61",Q="_subtitle_2pgom_77",X="_section_2pgom_91",Z="_sectionTitle_2pgom_99",ee="_row_2pgom_115",ne="_label_2pgom_131",te="_value_2pgom_141",ae="_slider_2pgom_155",oe="_audioGrid_2pgom_197",re="_button_2pgom_211",ie="_buttonActive_2pgom_241",se="_meters_2pgom_275",le="_meter_2pgom_275",ue="_meterLabel_2pgom_301",ce="_meterBar_2pgom_315",me="_meterFill_2pgom_329",s={root:q,canvasHost:U,panel:J,panelTitle:K,subtitle:Q,section:X,sectionTitle:Z,row:ee,label:ne,value:te,slider:ae,audioGrid:oe,button:re,buttonActive:ie,meters:se,meter:le,meterLabel:ue,meterBar:ce,meterFill:me},de=`attribute float aHeight;\r
attribute float aHue;\r
attribute float aSeed;\r
attribute float aBand;\r
\r
uniform float uTime;\r
uniform float uBass;\r
uniform float uMid;\r
uniform float uTreble;\r
uniform float uReactivity;\r
\r
varying vec3 vWorldPos;\r
varying vec3 vNormalW;\r
varying float vHue;\r
varying float vSeed;\r
varying float vAudio;\r
varying float vY01;\r
\r
float pickBand(float band) {\r
  if (band < 0.5) return uBass;\r
  if (band < 1.5) return uMid;\r
  return uTreble;\r
}\r
\r
void main() {\r
  vHue = aHue;\r
  vSeed = aSeed;\r
\r
  // y in geometry runs 0..1 (base..tip)\r
  float y01 = clamp(position.y, 0.0, 1.0);\r
  vY01 = y01;\r
\r
  float audio = pickBand(aBand);\r
  vAudio = audio;\r
\r
  // Mostly static crystals — only the very tip breathes a tiny amount with audio.\r
  float pulse = audio * uReactivity;\r
  float stretched = position.y * aHeight * (1.0 + pulse * 0.06 * y01 * y01);\r
\r
  // Very gentle sway, more at tip\r
  float sway = sin(uTime * 0.6 + aSeed * 8.0) * 0.015 * y01;\r
\r
  vec3 local = vec3(position.x + sway, stretched, position.z + sway * 0.6);\r
\r
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(local, 1.0);\r
  vWorldPos = worldPos.xyz;\r
\r
  vec3 nrm = normalize(mat3(instanceMatrix) * normal);\r
  vNormalW = normalize(mat3(modelMatrix) * nrm);\r
\r
  gl_Position = projectionMatrix * viewMatrix * worldPos;\r
}\r
`,fe=`precision highp float;\r
\r
uniform float uTime;\r
uniform float uBass;\r
uniform float uMid;\r
uniform float uTreble;\r
uniform float uLevel;\r
uniform float uMoonY;\r
uniform vec3 uTintA;\r
uniform vec3 uTintB;\r
uniform vec3 uTintC;\r
uniform float uBands;\r
\r
varying vec3 vWorldPos;\r
varying vec3 vNormalW;\r
varying float vHue;\r
varying float vSeed;\r
varying float vAudio;\r
varying float vY01;\r
\r
vec3 hsl2rgb(vec3 c) {\r
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);\r
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));\r
}\r
\r
void main() {\r
  vec3 N = normalize(vNormalW);\r
  vec3 V = normalize(cameraPosition - vWorldPos);\r
\r
  // Horizontal banding driven by world-y, time, and crystal seed (no longer audio-stretched)\r
  float bandCount = max(2.0, uBands);\r
  float waves = sin((vWorldPos.y * bandCount) + uTime * 1.2 + vSeed * 6.2831);\r
  float bandMix = 0.5 + 0.5 * waves;\r
\r
  // Three-color gradient mixed by bands (purely positional)\r
  vec3 lower = mix(uTintA, uTintB, smoothstep(0.0, 0.6, vY01));\r
  vec3 upper = mix(uTintB, uTintC, smoothstep(0.4, 1.0, vY01));\r
  vec3 base = mix(lower, upper, bandMix);\r
\r
  // Slow vertical hue drift — independent of audio so the body stays calm\r
  float hueShift = vHue + uTime * 0.03;\r
  vec3 neon = hsl2rgb(vec3(fract(hueShift), 0.85, 0.55));\r
  base = mix(base, neon, 0.30);\r
\r
  // Edge glow from grazing angle — static rim, no audio reaction\r
  float ndv = clamp(dot(N, V), 0.0, 1.0);\r
  float rim = pow(1.0 - ndv, 3.0);\r
  vec3 rimColor = mix(vec3(0.85, 0.95, 1.0), uTintC, 0.5);\r
  base += rimColor * rim * 0.55;\r
\r
  // Moonlight wash from above — static\r
  float moonDot = clamp(dot(N, normalize(vec3(0.2, uMoonY, 0.4))), 0.0, 1.0);\r
  base += vec3(0.55, 0.65, 0.95) * moonDot * 0.25;\r
\r
  // Soft inner glow at tips — static\r
  base += vec3(1.0, 0.92, 0.78) * pow(vY01, 4.0) * 0.22;\r
\r
  // Very gentle overall lift with level so the field "breathes" rather than pumps.\r
  base *= 0.95 + uLevel * 0.10;\r
\r
  gl_FragColor = vec4(base, 1.0);\r
}\r
`,he=`varying vec3 vDir;\r
\r
void main() {\r
  vDir = normalize(position);\r
  // Render at the far plane regardless of distance — sky dome.\r
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\r
  gl_Position = projectionMatrix * mvPosition;\r
}\r
`,ve=`precision highp float;\r
\r
uniform float uTime;\r
uniform float uBass;\r
uniform float uMid;\r
uniform float uTreble;\r
uniform float uLevel;\r
uniform vec3 uTintA;\r
uniform vec3 uTintB;\r
uniform vec3 uTintC;\r
uniform vec3 uFog;\r
uniform float uReactivity;\r
uniform float uMoonY;\r
\r
varying vec3 vDir;\r
\r
void main() {\r
  vec3 dir = normalize(vDir);\r
\r
  // Multi-stop vertical gradient: deep zenith → mid → warm horizon.\r
  // Slightly darker zenith gives the sky more depth without drawing attention.\r
  vec3 zenith   = mix(uFog, uTintA, 0.55);\r
  vec3 midSky   = mix(uTintA, uTintB, 0.35);\r
  vec3 horizonC = mix(uFog, uTintA, 0.85);\r
\r
  // Smooth blend between three stops along dir.y.\r
  float t1 = smoothstep(-0.05, 0.45, dir.y);            // horizon → mid\r
  float t2 = smoothstep(0.35,  0.95, dir.y);            // mid     → zenith\r
  vec3 sky = mix(horizonC, midSky, t1);\r
  sky = mix(sky, zenith, t2);\r
\r
  // Subtle warm tint exactly at the horizon line.\r
  float horizonGlow = exp(-pow((dir.y - 0.02) * 6.0, 2.0));\r
  sky += mix(vec3(0.0), uTintC, 0.18) * horizonGlow * 0.35;\r
\r
  vec3 col = sky;\r
\r
  // Fade out below horizon to fog so the ground/scene blends in.\r
  float belowFade = smoothstep(-0.05, 0.15, dir.y);\r
  col = mix(uFog, col, belowFade);\r
\r
  // Subtle moon halo: brighten direction roughly toward moon.\r
  vec3 moonDir = normalize(vec3(0.18, uMoonY, -0.92));\r
  float halo = pow(max(dot(dir, moonDir), 0.0), 24.0);\r
  col += vec3(0.95, 0.9, 0.75) * halo * 0.6;\r
\r
  // Lift overall with level so the whole sky breathes with the music.\r
  col *= 0.85 + uLevel * 0.35 * uReactivity;\r
\r
  // Suppress unused-uniform warnings without contributing visual noise.\r
  col += 0.0 * (uBass + uMid + uTreble + uTintC.r + uTime);\r
\r
  gl_FragColor = vec4(col, 1.0);\r
}\r
`,E=[{name:"midnight bloom",a:new h("#3a1f6b"),b:new h("#c84db0"),c:new h("#ffd07b"),fog:new h("#0a0820")},{name:"glacier",a:new h("#0e2a4d"),b:new h("#3ec0ff"),c:new h("#e0f7ff"),fog:new h("#04101f")},{name:"ember",a:new h("#3b0a14"),b:new h("#ff6b3d"),c:new h("#ffe07a"),fog:new h("#150607")},{name:"aurora",a:new h("#0c2230"),b:new h("#36e0a8"),c:new h("#a86bff"),fog:new h("#040c11")}],ge={count:600,spread:24,baseHeight:.4,heightVariance:1.5,reactivity:.9,bandCount:6,paletteIndex:0,cameraDrift:.4,fogDensity:.05,moonHeight:.65,audioGain:.9,smoothing:.82};function be({controls:o,bandsRef:i}){const{scene:r}=P(),a=E[o.paletteIndex]??E[0];return c.useEffect(()=>(r.fog=new I(a.fog.getHex(),o.fogDensity),r.background=null,()=>{r.fog=null}),[r,a,o.fogDensity]),e.jsxs(e.Fragment,{children:[e.jsx(pe,{controls:o,palette:a,bandsRef:i}),e.jsx(xe,{controls:o,palette:a,bandsRef:i}),e.jsx(we,{palette:a}),e.jsx(Me,{controls:o,palette:a,bandsRef:i}),e.jsx(Te,{drift:o.cameraDrift,bandsRef:i})]})}function pe({controls:o,palette:i,bandsRef:r}){const a=c.useMemo(()=>new L({vertexShader:he,fragmentShader:ve,side:W,depthWrite:!1,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uLevel:{value:0},uReactivity:{value:o.reactivity},uMoonY:{value:o.moonHeight},uTintA:{value:i.a.clone()},uTintB:{value:i.b.clone()},uTintC:{value:i.c.clone()},uFog:{value:i.fog.clone()}}}),[]);return c.useEffect(()=>{a.uniforms.uReactivity.value=o.reactivity,a.uniforms.uMoonY.value=o.moonHeight,a.uniforms.uTintA.value.copy(i.a),a.uniforms.uTintB.value.copy(i.b),a.uniforms.uTintC.value.copy(i.c),a.uniforms.uFog.value.copy(i.fog)},[a,o.reactivity,o.moonHeight,i]),c.useEffect(()=>()=>a.dispose(),[a]),k((l,d)=>{const n=a.uniforms;n.uTime.value+=d;const t=r.current;n.uBass.value=t.bass,n.uMid.value=t.mid,n.uTreble.value=t.treble,n.uLevel.value=t.level}),e.jsxs("mesh",{frustumCulled:!1,renderOrder:-1,children:[e.jsx("sphereGeometry",{args:[120,48,32]}),e.jsx("primitive",{object:a,attach:"material"})]})}const ye=.55;function D(o){const a=[],l=[],d=[],n=[],t=[];for(let u=0;u<6;u+=1){const m=u/6*Math.PI*2;n.push(new _(Math.cos(m)*.5,0,Math.sin(m)*.5)),t.push(new _(Math.cos(m)*.5*.35,.92,Math.sin(m)*.5*.35))}const v=new _(0,1,0);if(o){for(let u=0;u<6;u+=1){const m=(u+1)%6,g=n[u],w=n[m],b=t[u],f=t[m],y=new _().copy(b).sub(g).cross(new _().copy(f).sub(g)).normalize(),x=a.length/3;[g,b,f,w].forEach(M=>{a.push(M.x,M.y,M.z),l.push(y.x,y.y,y.z)}),d.push(x,x+1,x+2,x,x+2,x+3)}for(let u=0;u<6;u+=1){const m=(u+1)%6,g=t[u],w=t[m],b=new _().copy(v).sub(g).cross(new _().copy(w).sub(g)).normalize(),f=a.length/3;[g,v,w].forEach(y=>{a.push(y.x,y.y,y.z),l.push(b.x,b.y,b.z)}),d.push(f,f+1,f+2)}}else for(let u=0;u<6;u+=1){const m=(u+1)%6,g=n[u],w=n[m],b=new _().copy(v).sub(g).cross(new _().copy(w).sub(g)).normalize(),f=a.length/3;[g,v,w].forEach(y=>{a.push(y.x,y.y,y.z),l.push(b.x,b.y,b.z)}),d.push(f,f+1,f+2)}const p=new O;return p.setAttribute("position",new R(a,3)),p.setAttribute("normal",new R(l,3)),p.setIndex(d),p.computeBoundingSphere(),p}function xe({controls:o,palette:i,bandsRef:r}){const a=c.useRef(null),l=c.useRef(null),d=c.useMemo(()=>D(!0),[]),n=c.useMemo(()=>D(!1),[]),t=c.useMemo(()=>new L({vertexShader:de,fragmentShader:fe,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uLevel:{value:0},uReactivity:{value:o.reactivity},uBands:{value:o.bandCount},uMoonY:{value:o.moonHeight},uTintA:{value:i.a.clone()},uTintB:{value:i.b.clone()},uTintC:{value:i.c.clone()}},transparent:!1}),[]);return c.useEffect(()=>{t.uniforms.uReactivity.value=o.reactivity,t.uniforms.uBands.value=o.bandCount,t.uniforms.uMoonY.value=o.moonHeight,t.uniforms.uTintA.value.copy(i.a),t.uniforms.uTintB.value.copy(i.b),t.uniforms.uTintC.value.copy(i.c)},[t,o.reactivity,o.bandCount,o.moonHeight,i]),c.useEffect(()=>{const v=a.current,p=l.current;if(!v||!p)return;const u=o.count,m=o.spread*ye,g=[],w=[],b=new $,f=je(12648430);for(let x=0;x<u;x+=1){const M=Math.sqrt(f())*o.spread,j=f()*Math.PI*2,N=Math.cos(j)*M,F=Math.sin(j)*M*.65,S=.5+f()*1.4;b.position.set(N,0,F),b.rotation.set(0,f()*Math.PI*2,0),b.scale.set(S,1,S),b.updateMatrix();const A={matrix:b.matrix.clone(),height:o.baseHeight+f()*o.heightVariance+M*.05,hue:f(),seed:f(),band:Math.floor(f()*3)};M<m?g.push(A):w.push(A)}const y=(x,M)=>{const j=M.length,N=new Float32Array(j),F=new Float32Array(j),S=new Float32Array(j),A=new Float32Array(j);for(let C=0;C<j;C+=1){const B=M[C];x.setMatrixAt(C,B.matrix),N[C]=B.height,F[C]=B.hue,S[C]=B.seed,A[C]=B.band}x.instanceMatrix.needsUpdate=!0;const z=x.geometry;z.setAttribute("aHeight",new H(N,1)),z.setAttribute("aHue",new H(F,1)),z.setAttribute("aSeed",new H(S,1)),z.setAttribute("aBand",new H(A,1)),x.count=j};y(v,g),y(p,w)},[o.count,o.spread,o.baseHeight,o.heightVariance]),c.useEffect(()=>()=>{d.dispose(),n.dispose(),t.dispose()},[d,n,t]),k((v,p)=>{const u=t.uniforms;u.uTime.value+=p;const m=r.current;u.uBass.value=m.bass,u.uMid.value=m.mid,u.uTreble.value=m.treble,u.uLevel.value=m.level}),e.jsxs(e.Fragment,{children:[e.jsx("instancedMesh",{ref:a,args:[d,t,o.count],frustumCulled:!1}),e.jsx("instancedMesh",{ref:l,args:[n,t,o.count],frustumCulled:!1})]})}function we({palette:o}){const i=c.useMemo(()=>new G({color:o.fog.clone().lerp(o.a,.35)}),[o]);return c.useEffect(()=>()=>i.dispose(),[i]),e.jsxs("mesh",{"rotation-x":-Math.PI/2,position:[0,-.02,0],children:[e.jsx("circleGeometry",{args:[80,64]}),e.jsx("primitive",{object:i,attach:"material"})]})}function Me({controls:o,palette:i,bandsRef:r}){const a=c.useRef(null),l=c.useMemo(()=>new G({color:new h("#fff5dc").lerp(i.c,.4),transparent:!0,opacity:.95}),[i]);c.useEffect(()=>()=>l.dispose(),[l]),k(()=>{const n=a.current;if(!n)return;const t=1+r.current.bass*.18;n.scale.setScalar(t)});const d=6+o.moonHeight*14;return e.jsxs("mesh",{ref:a,position:[6,d,-38],children:[e.jsx("sphereGeometry",{args:[3.4,48,48]}),e.jsx("primitive",{object:l,attach:"material"})]})}function Te({drift:o,bandsRef:i}){const{camera:r}=P(),a=c.useRef(0);return k((l,d)=>{a.current+=d*(.15+o*.4);const n=14+Math.sin(a.current*.7)*2,t=a.current*.25,v=i.current.bass;r.position.x=Math.sin(t)*n,r.position.z=Math.cos(t)*n,r.position.y=7.5+Math.sin(a.current*.5)*.8+v*.5,r.lookAt(0,2.6+v*.4,0)}),null}function je(o){let i=o>>>0;return()=>{i=i+1831565813>>>0;let r=i;return r=Math.imul(r^r>>>15,r|1),r^=r+Math.imul(r^r>>>7,r|61),((r^r>>>14)>>>0)/4294967296}}function Ce({width:o,height:i}){const[r,a]=c.useState(ge),l=V();c.useEffect(()=>{l.loadDemo()},[]);const d=c.useRef(null);return c.useEffect(()=>{l.setGain(r.audioGain)},[l,r.audioGain]),c.useEffect(()=>{l.setSmoothing(r.smoothing)},[l,r.smoothing]),c.useEffect(()=>{let n=0;const t=()=>{const v=d.current;if(v){const p=l.bands.current,u=v.querySelectorAll(`.${s.meterFill}`),m=[p.bass,p.mid,p.treble,p.level];u.forEach((g,w)=>{g.style.width=`${Math.min(100,m[w]*130)}%`})}n=requestAnimationFrame(t)};return n=requestAnimationFrame(t),()=>cancelAnimationFrame(n)},[l.bands]),e.jsxs("div",{className:s.root,style:{width:o,height:i},children:[e.jsx("div",{className:s.canvasHost,children:e.jsx(Y,{gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],camera:{fov:55,position:[0,8,14],near:.1,far:200},children:e.jsx(be,{controls:r,bandsRef:l.bands})})}),e.jsxs("aside",{className:s.panel,"aria-label":"Moonlight controls",children:[e.jsx("h3",{className:s.panelTitle,children:"Moonlight"}),e.jsx("p",{className:s.subtitle,children:"Pick an audio source and tune the crystal field."}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Audio Source"}),e.jsxs("div",{className:s.audioGrid,children:[e.jsx("button",{type:"button",className:`${s.button} ${l.source==="mic"?s.buttonActive:""}`,onClick:()=>void l.enableMic(),children:"Microphone"}),e.jsx("button",{type:"button",className:`${s.button} ${l.source==="tab"?s.buttonActive:""}`,onClick:()=>{l.captureTab().catch(n=>{const t=n instanceof Error?n.message:String(n);window.alert(`Tab audio capture failed:

${t}`)})},title:"Pick another tab (e.g. Spotify Web, YouTube) and tick 'Share tab audio'",children:"Tab Audio"}),e.jsx("button",{type:"button",className:s.button,onClick:()=>l.stop(),disabled:!l.isActive,children:"Stop"})]}),e.jsx("div",{className:s.meters,ref:d,children:["BASS","MID","TREBLE","LEVEL"].map(n=>e.jsxs("div",{className:s.meter,children:[e.jsx("span",{className:s.meterLabel,children:n}),e.jsx("span",{className:s.meterBar,children:e.jsx("span",{className:s.meterFill})})]},n))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Audio Mix"}),e.jsx(T,{label:"Audio Gain",min:0,max:1.5,step:.01,value:r.audioGain,onChange:n=>a(t=>({...t,audioGain:n}))}),e.jsx(T,{label:"Smoothing",min:0,max:.96,step:.01,value:r.smoothing,onChange:n=>a(t=>({...t,smoothing:n}))}),e.jsx(T,{label:"Reactivity",min:0,max:2,step:.05,value:r.reactivity,onChange:n=>a(t=>({...t,reactivity:n}))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Crystal Field"}),e.jsx(T,{label:"Crystal Count",min:40,max:600,step:10,value:r.count,onChange:n=>a(t=>({...t,count:n}))}),e.jsx(T,{label:"Spread",min:6,max:45,step:.5,value:r.spread,onChange:n=>a(t=>({...t,spread:n}))}),e.jsx(T,{label:"Base Height",min:.4,max:5,step:.05,value:r.baseHeight,onChange:n=>a(t=>({...t,baseHeight:n}))}),e.jsx(T,{label:"Height Variance",min:0,max:6,step:.05,value:r.heightVariance,onChange:n=>a(t=>({...t,heightVariance:n}))}),e.jsx(T,{label:"Color Bands",min:1,max:14,step:1,value:r.bandCount,onChange:n=>a(t=>({...t,bandCount:n}))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Sky & Camera"}),e.jsx(T,{label:"Camera Drift",min:0,max:1.5,step:.01,value:r.cameraDrift,onChange:n=>a(t=>({...t,cameraDrift:n}))}),e.jsx(T,{label:"Fog Density",min:0,max:.18,step:.005,value:r.fogDensity,onChange:n=>a(t=>({...t,fogDensity:n}))}),e.jsx(T,{label:"Moon Height",min:0,max:1.4,step:.01,value:r.moonHeight,onChange:n=>a(t=>({...t,moonHeight:n}))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Palette"}),e.jsx("div",{className:s.audioGrid,children:E.map((n,t)=>e.jsx("button",{type:"button",className:`${s.button} ${r.paletteIndex===t?s.buttonActive:""}`,onClick:()=>a(v=>({...v,paletteIndex:t})),children:n.name},n.name))})]})]})]})}function T({label:o,min:i,max:r,step:a,value:l,onChange:d}){const n=`mlight-${o.toLowerCase().replace(/\s+/g,"-")}`;return e.jsxs("div",{className:s.row,children:[e.jsx("label",{htmlFor:n,className:s.label,children:o}),e.jsx("span",{className:s.value,children:a>=1?l.toFixed(0):l.toFixed(2)}),e.jsx("input",{id:n,type:"range",className:s.slider,min:i,max:r,step:a,value:l,onChange:t=>d(Number(t.target.value))})]})}export{Ce as default};
