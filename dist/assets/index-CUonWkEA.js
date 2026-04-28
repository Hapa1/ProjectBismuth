import{r as d,c as E,j as e,C as L,d as v,e as k,F as P,S as R,f as I,b as N,V as B,g as V,h as z,O as G,I as F,i as D}from"./index-DfGpesBi.js";const Y="_root_2pgom_1",$="_canvasHost_2pgom_17",W="_panel_2pgom_27",q="_panelTitle_2pgom_61",O="_subtitle_2pgom_77",U="_section_2pgom_91",J="_sectionTitle_2pgom_99",K="_row_2pgom_115",Q="_label_2pgom_131",X="_value_2pgom_141",Z="_slider_2pgom_155",ee="_audioGrid_2pgom_197",ne="_button_2pgom_211",te="_buttonActive_2pgom_241",re="_fileLabel_2pgom_253",oe="_fileInput_2pgom_267",ae="_meters_2pgom_275",ie="_meter_2pgom_275",se="_meterLabel_2pgom_301",le="_meterBar_2pgom_315",ce="_meterFill_2pgom_329",i={root:Y,canvasHost:$,panel:W,panelTitle:q,subtitle:O,section:U,sectionTitle:J,row:K,label:Q,value:X,slider:Z,audioGrid:ee,button:ne,buttonActive:te,fileLabel:re,fileInput:oe,meters:ae,meter:ie,meterLabel:se,meterBar:le,meterFill:ce},ue=`attribute float aHeight;\r
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
`,me=`precision highp float;\r
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
`,de=`varying vec3 vDir;\r
\r
void main() {\r
  vDir = normalize(position);\r
  // Render at the far plane regardless of distance — sky dome.\r
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\r
  gl_Position = projectionMatrix * mvPosition;\r
}\r
`,fe=`precision highp float;\r
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
// 3D hash → 3D point. Cheap, no textures.\r
vec3 hash33(vec3 p) {\r
  p = vec3(\r
    dot(p, vec3(127.1, 311.7, 74.7)),\r
    dot(p, vec3(269.5, 183.3, 246.1)),\r
    dot(p, vec3(113.5, 271.9, 124.6))\r
  );\r
  return fract(sin(p) * 43758.5453123);\r
}\r
\r
// Voronoi (F1, F2) on the unit sphere using direction-based cells.\r
// Returns vec3(F1, F2, cellId) where cellId is a per-cell hash.\r
vec3 voronoi3(vec3 p, float t) {\r
  vec3 g = floor(p);\r
  vec3 f = fract(p);\r
  float f1 = 1e9;\r
  float f2 = 1e9;\r
  float id = 0.0;\r
\r
  for (int z = -1; z <= 1; z++) {\r
    for (int y = -1; y <= 1; y++) {\r
      for (int x = -1; x <= 1; x++) {\r
        vec3 b = vec3(float(x), float(y), float(z));\r
        vec3 cell = g + b;\r
        vec3 h = hash33(cell);\r
        // Animate cell points: they orbit inside their cell to make the sky shimmer.\r
        vec3 jitter = 0.5 + 0.5 * sin(t * (0.7 + h * 1.3) + h * 6.2831);\r
        vec3 r = b + jitter - f;\r
        float d = dot(r, r);\r
        if (d < f1) {\r
          f2 = f1;\r
          f1 = d;\r
          id = h.x + h.y * 0.31 + h.z * 0.17;\r
        } else if (d < f2) {\r
          f2 = d;\r
        }\r
      }\r
    }\r
  }\r
  return vec3(sqrt(f1), sqrt(f2), id);\r
}\r
\r
void main() {\r
  vec3 dir = normalize(vDir);\r
\r
  // Vertical gradient as the base sky.\r
  float horizon = smoothstep(-0.15, 0.55, dir.y);\r
  vec3 sky = mix(uFog, uTintA, horizon);\r
  sky = mix(sky, uTintB, smoothstep(0.35, 1.0, dir.y) * 0.6);\r
\r
  // Drift the sky pattern over time + audio.\r
  float drift = uTime * (0.18 + uMid * 0.6 * uReactivity);\r
\r
  // Two octaves of voronoi: large slow cells + small fast shimmer.\r
  float scaleA = 3.0 + uBass * 1.4 * uReactivity;\r
  float scaleB = 11.0 + uTreble * 8.0 * uReactivity;\r
\r
  vec3 pA = dir * scaleA + vec3(drift * 0.4, drift * 0.25, -drift * 0.3);\r
  vec3 pB = dir * scaleB + vec3(-drift * 0.9, drift * 0.6, drift * 0.7);\r
\r
  vec3 vA = voronoi3(pA, uTime * (0.6 + uBass * 1.2));\r
  vec3 vB = voronoi3(pB, uTime * (1.4 + uTreble * 2.5));\r
\r
  // Cell edges = F2 - F1 inverted. Thin glowing seams between cells.\r
  float edgeA = 1.0 - smoothstep(0.0, 0.18 + uBass * 0.2, vB.y - vB.x);\r
  float edgeB = 1.0 - smoothstep(0.0, 0.06 + uTreble * 0.05, vA.y - vA.x);\r
\r
  // Cell core glow (closer to center = brighter), modulated by bass.\r
  float coreA = pow(1.0 - smoothstep(0.0, 0.6, vA.x), 2.0);\r
  float coreB = pow(1.0 - smoothstep(0.0, 0.5, vB.x), 4.0);\r
\r
  // Per-cell color: hue derived from the cell id.\r
  float idA = fract(vA.z + uTime * 0.05);\r
  vec3 cellTintA = mix(uTintB, uTintC, idA);\r
  cellTintA = mix(cellTintA, uTintA, 0.3);\r
\r
  float idB = fract(vB.z * 1.7 + uTime * 0.13);\r
  vec3 cellTintB = mix(uTintC, uTintB, idB);\r
\r
  // Compose: sky base + slow cell glow + fast shimmer edges.\r
  vec3 col = sky;\r
  col += cellTintA * coreA * (0.35 + uBass * 0.9 * uReactivity);\r
  col += cellTintB * edgeA * (0.25 + uMid * 0.8 * uReactivity);\r
  col += vec3(1.0, 0.95, 0.85) * edgeB * (0.18 + uTreble * 1.3 * uReactivity);\r
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
  gl_FragColor = vec4(col, 1.0);\r
}\r
`,H=[{name:"midnight bloom",a:new v("#3a1f6b"),b:new v("#c84db0"),c:new v("#ffd07b"),fog:new v("#0a0820")},{name:"glacier",a:new v("#0e2a4d"),b:new v("#3ec0ff"),c:new v("#e0f7ff"),fog:new v("#04101f")},{name:"ember",a:new v("#3b0a14"),b:new v("#ff6b3d"),c:new v("#ffe07a"),fog:new v("#150607")},{name:"aurora",a:new v("#0c2230"),b:new v("#36e0a8"),c:new v("#a86bff"),fog:new v("#040c11")}],ve={count:600,spread:24,baseHeight:.4,heightVariance:2.6,reactivity:.9,bandCount:6,paletteIndex:0,cameraDrift:.4,fogDensity:.05,moonHeight:.65,audioGain:.9,smoothing:.82};function he({controls:r,bandsRef:s}){const{scene:o}=k(),a=H[r.paletteIndex]??H[0];return d.useEffect(()=>(o.fog=new P(a.fog.getHex(),r.fogDensity),o.background=null,()=>{o.fog=null}),[o,a,r.fogDensity]),e.jsxs(e.Fragment,{children:[e.jsx(be,{controls:r,palette:a,bandsRef:s}),e.jsx(pe,{controls:r,palette:a,bandsRef:s}),e.jsx(ge,{palette:a}),e.jsx(ye,{controls:r,palette:a,bandsRef:s}),e.jsx(xe,{drift:r.cameraDrift,bandsRef:s})]})}function be({controls:r,palette:s,bandsRef:o}){const a=d.useMemo(()=>new R({vertexShader:de,fragmentShader:fe,side:I,depthWrite:!1,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uLevel:{value:0},uReactivity:{value:r.reactivity},uMoonY:{value:r.moonHeight},uTintA:{value:s.a.clone()},uTintB:{value:s.b.clone()},uTintC:{value:s.c.clone()},uFog:{value:s.fog.clone()}}}),[]);return d.useEffect(()=>{a.uniforms.uReactivity.value=r.reactivity,a.uniforms.uMoonY.value=r.moonHeight,a.uniforms.uTintA.value.copy(s.a),a.uniforms.uTintB.value.copy(s.b),a.uniforms.uTintC.value.copy(s.c),a.uniforms.uFog.value.copy(s.fog)},[a,r.reactivity,r.moonHeight,s]),d.useEffect(()=>()=>a.dispose(),[a]),N((l,u)=>{const c=a.uniforms;c.uTime.value+=u;const n=o.current;c.uBass.value=n.bass,c.uMid.value=n.mid,c.uTreble.value=n.treble,c.uLevel.value=n.level}),e.jsxs("mesh",{frustumCulled:!1,renderOrder:-1,children:[e.jsx("sphereGeometry",{args:[120,48,32]}),e.jsx("primitive",{object:a,attach:"material"})]})}function pe({controls:r,palette:s,bandsRef:o}){const a=d.useRef(null),l=d.useMemo(()=>{const t=[],f=[],y=[],T=[],h=[];for(let m=0;m<6;m+=1){const p=m/6*Math.PI*2;T.push(new B(Math.cos(p)*.5,0,Math.sin(p)*.5)),h.push(new B(Math.cos(p)*.5*.35,.92,Math.sin(p)*.5*.35))}const b=new B(0,1,0);for(let m=0;m<6;m+=1){const p=(m+1)%6,w=T[m],_=T[p],j=h[m],M=h[p],A=new B().copy(_).sub(w).cross(new B().copy(j).sub(w)).normalize(),C=t.length/3;[w,_,M,j].forEach(S=>{t.push(S.x,S.y,S.z),f.push(A.x,A.y,A.z)}),y.push(C,C+1,C+2,C,C+2,C+3)}for(let m=0;m<6;m+=1){const p=(m+1)%6,w=h[m],_=h[p],j=new B().copy(_).sub(w).cross(new B().copy(b).sub(w)).normalize(),M=t.length/3;[w,_,b].forEach(A=>{t.push(A.x,A.y,A.z),f.push(j.x,j.y,j.z)}),y.push(M,M+1,M+2)}const g=new V;return g.setAttribute("position",new z(t,3)),g.setAttribute("normal",new z(f,3)),g.setIndex(y),g.computeBoundingSphere(),g},[]),u=d.useMemo(()=>new R({vertexShader:ue,fragmentShader:me,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uLevel:{value:0},uReactivity:{value:r.reactivity},uBands:{value:r.bandCount},uMoonY:{value:r.moonHeight},uTintA:{value:s.a.clone()},uTintB:{value:s.b.clone()},uTintC:{value:s.c.clone()}},transparent:!1}),[]);return d.useEffect(()=>{u.uniforms.uReactivity.value=r.reactivity,u.uniforms.uBands.value=r.bandCount,u.uniforms.uMoonY.value=r.moonHeight,u.uniforms.uTintA.value.copy(s.a),u.uniforms.uTintB.value.copy(s.b),u.uniforms.uTintC.value.copy(s.c)},[u,r.reactivity,r.bandCount,r.moonHeight,s]),d.useEffect(()=>{const c=a.current;if(!c)return;const n=r.count,t=new Float32Array(n),f=new Float32Array(n),y=new Float32Array(n),T=new Float32Array(n),h=new G,b=we(12648430);for(let m=0;m<n;m+=1){const p=Math.sqrt(b())*r.spread,w=b()*Math.PI*2,_=Math.cos(w)*p,j=Math.sin(w)*p*.65,M=.5+b()*1.4;h.position.set(_,0,j),h.rotation.set(0,b()*Math.PI*2,0),h.scale.set(M,1,M),h.updateMatrix(),c.setMatrixAt(m,h.matrix),t[m]=r.baseHeight+b()*r.heightVariance+p*.05,f[m]=b(),y[m]=b(),T[m]=Math.floor(b()*3)}c.instanceMatrix.needsUpdate=!0;const g=c.geometry;g.setAttribute("aHeight",new F(t,1)),g.setAttribute("aHue",new F(f,1)),g.setAttribute("aSeed",new F(y,1)),g.setAttribute("aBand",new F(T,1)),c.count=n},[r.count,r.spread,r.baseHeight,r.heightVariance]),d.useEffect(()=>()=>{l.dispose(),u.dispose()},[l,u]),N((c,n)=>{const t=u.uniforms;t.uTime.value+=n;const f=o.current;t.uBass.value=f.bass,t.uMid.value=f.mid,t.uTreble.value=f.treble,t.uLevel.value=f.level}),e.jsx("instancedMesh",{ref:a,args:[l,u,r.count],frustumCulled:!1})}function ge({palette:r}){const s=d.useMemo(()=>new D({color:r.fog.clone().lerp(r.a,.35)}),[r]);return d.useEffect(()=>()=>s.dispose(),[s]),e.jsxs("mesh",{"rotation-x":-Math.PI/2,position:[0,-.02,0],children:[e.jsx("circleGeometry",{args:[80,64]}),e.jsx("primitive",{object:s,attach:"material"})]})}function ye({controls:r,palette:s,bandsRef:o}){const a=d.useRef(null),l=d.useMemo(()=>new D({color:new v("#fff5dc").lerp(s.c,.4),transparent:!0,opacity:.95}),[s]);d.useEffect(()=>()=>l.dispose(),[l]),N(()=>{const c=a.current;if(!c)return;const n=1+o.current.bass*.18;c.scale.setScalar(n)});const u=6+r.moonHeight*14;return e.jsxs("mesh",{ref:a,position:[6,u,-38],children:[e.jsx("sphereGeometry",{args:[3.4,48,48]}),e.jsx("primitive",{object:l,attach:"material"})]})}function xe({drift:r,bandsRef:s}){const{camera:o}=k(),a=d.useRef(0);return N((l,u)=>{a.current+=u*(.15+r*.4);const c=14+Math.sin(a.current*.7)*2,n=a.current*.25,t=s.current.bass;o.position.x=Math.sin(n)*c,o.position.z=Math.cos(n)*c,o.position.y=3.2+Math.sin(a.current*.5)*.6+t*.5,o.lookAt(0,2.2+t*.4,0)}),null}function we(r){let s=r>>>0;return()=>{s=s+1831565813>>>0;let o=s;return o=Math.imul(o^o>>>15,o|1),o^=o+Math.imul(o^o>>>7,o|61),((o^o>>>14)>>>0)/4294967296}}function je({width:r,height:s}){const[o,a]=d.useState(ve),l=E(),u=d.useRef(null);d.useEffect(()=>{l.setGain(o.audioGain)},[l,o.audioGain]),d.useEffect(()=>{l.setSmoothing(o.smoothing)},[l,o.smoothing]),d.useEffect(()=>{let n=0;const t=()=>{const f=u.current;if(f){const y=l.bands.current,T=f.querySelectorAll(`.${i.meterFill}`),h=[y.bass,y.mid,y.treble,y.level];T.forEach((b,g)=>{b.style.width=`${Math.min(100,h[g]*130)}%`})}n=requestAnimationFrame(t)};return n=requestAnimationFrame(t),()=>cancelAnimationFrame(n)},[l.bands]);const c=n=>{var f;const t=(f=n.target.files)==null?void 0:f[0];t&&l.loadFile(t),n.target.value=""};return e.jsxs("div",{className:i.root,style:{width:r,height:s},children:[e.jsx("div",{className:i.canvasHost,children:e.jsx(L,{gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],camera:{fov:55,position:[0,4,14],near:.1,far:200},children:e.jsx(he,{controls:o,bandsRef:l.bands})})}),e.jsxs("aside",{className:i.panel,"aria-label":"Moonlight controls",children:[e.jsx("h3",{className:i.panelTitle,children:"Moonlight"}),e.jsx("p",{className:i.subtitle,children:"Pick an audio source and tune the crystal field."}),e.jsxs("section",{className:i.section,children:[e.jsx("p",{className:i.sectionTitle,children:"Audio Source"}),e.jsxs("div",{className:i.audioGrid,children:[e.jsx("button",{type:"button",className:`${i.button} ${l.source==="demo"?i.buttonActive:""}`,onClick:()=>void l.loadDemo(),children:"Demo Pad"}),e.jsx("button",{type:"button",className:`${i.button} ${l.source==="mic"?i.buttonActive:""}`,onClick:()=>void l.enableMic(),children:"Microphone"}),e.jsx("button",{type:"button",className:`${i.button} ${l.source==="tab"?i.buttonActive:""}`,onClick:()=>{l.captureTab().catch(n=>{const t=n instanceof Error?n.message:String(n);window.alert(`Tab audio capture failed:

${t}`)})},title:"Pick another tab (e.g. Spotify Web, YouTube) and tick 'Share tab audio'",children:"Tab Audio"}),e.jsxs("label",{className:`${i.button} ${i.fileLabel} ${l.source==="file"?i.buttonActive:""}`,children:["Load File",e.jsx("input",{className:i.fileInput,type:"file",accept:"audio/*",onChange:c})]}),e.jsx("button",{type:"button",className:i.button,onClick:()=>l.stop(),disabled:!l.isActive,children:"Stop"})]}),e.jsx("div",{className:i.meters,ref:u,children:["BASS","MID","TREBLE","LEVEL"].map(n=>e.jsxs("div",{className:i.meter,children:[e.jsx("span",{className:i.meterLabel,children:n}),e.jsx("span",{className:i.meterBar,children:e.jsx("span",{className:i.meterFill})})]},n))})]}),e.jsxs("section",{className:i.section,children:[e.jsx("p",{className:i.sectionTitle,children:"Audio Mix"}),e.jsx(x,{label:"Audio Gain",min:0,max:1.5,step:.01,value:o.audioGain,onChange:n=>a(t=>({...t,audioGain:n}))}),e.jsx(x,{label:"Smoothing",min:0,max:.96,step:.01,value:o.smoothing,onChange:n=>a(t=>({...t,smoothing:n}))}),e.jsx(x,{label:"Reactivity",min:0,max:2,step:.05,value:o.reactivity,onChange:n=>a(t=>({...t,reactivity:n}))})]}),e.jsxs("section",{className:i.section,children:[e.jsx("p",{className:i.sectionTitle,children:"Crystal Field"}),e.jsx(x,{label:"Crystal Count",min:40,max:600,step:10,value:o.count,onChange:n=>a(t=>({...t,count:n}))}),e.jsx(x,{label:"Spread",min:6,max:45,step:.5,value:o.spread,onChange:n=>a(t=>({...t,spread:n}))}),e.jsx(x,{label:"Base Height",min:.4,max:5,step:.05,value:o.baseHeight,onChange:n=>a(t=>({...t,baseHeight:n}))}),e.jsx(x,{label:"Height Variance",min:0,max:6,step:.05,value:o.heightVariance,onChange:n=>a(t=>({...t,heightVariance:n}))}),e.jsx(x,{label:"Color Bands",min:1,max:14,step:1,value:o.bandCount,onChange:n=>a(t=>({...t,bandCount:n}))})]}),e.jsxs("section",{className:i.section,children:[e.jsx("p",{className:i.sectionTitle,children:"Sky & Camera"}),e.jsx(x,{label:"Camera Drift",min:0,max:1.5,step:.01,value:o.cameraDrift,onChange:n=>a(t=>({...t,cameraDrift:n}))}),e.jsx(x,{label:"Fog Density",min:0,max:.18,step:.005,value:o.fogDensity,onChange:n=>a(t=>({...t,fogDensity:n}))}),e.jsx(x,{label:"Moon Height",min:0,max:1.4,step:.01,value:o.moonHeight,onChange:n=>a(t=>({...t,moonHeight:n}))})]}),e.jsxs("section",{className:i.section,children:[e.jsx("p",{className:i.sectionTitle,children:"Palette"}),e.jsx("div",{className:i.audioGrid,children:H.map((n,t)=>e.jsx("button",{type:"button",className:`${i.button} ${o.paletteIndex===t?i.buttonActive:""}`,onClick:()=>a(f=>({...f,paletteIndex:t})),children:n.name},n.name))})]})]})]})}function x({label:r,min:s,max:o,step:a,value:l,onChange:u}){const c=`mlight-${r.toLowerCase().replace(/\s+/g,"-")}`;return e.jsxs("div",{className:i.row,children:[e.jsx("label",{htmlFor:c,className:i.label,children:r}),e.jsx("span",{className:i.value,children:a>=1?l.toFixed(0):l.toFixed(2)}),e.jsx("input",{id:c,type:"range",className:i.slider,min:s,max:o,step:a,value:l,onChange:n=>u(Number(n.target.value))})]})}export{je as default};
