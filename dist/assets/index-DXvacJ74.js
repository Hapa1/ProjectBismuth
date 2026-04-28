import{r as m,j as e}from"./index-3TOd4URH.js";import{C as V,b,c as P,F as I,S as H,d as G,u as k,V as C,e as E,f as R,O as Y,I as S,g as D,h as N}from"./react-three-fiber.esm-CSHYMaLq.js";import{u as $}from"./useAudioAnalyser-BDNtSOon.js";const W="_root_2pgom_1",q="_canvasHost_2pgom_17",O="_panel_2pgom_27",U="_panelTitle_2pgom_61",J="_subtitle_2pgom_77",K="_section_2pgom_91",Q="_sectionTitle_2pgom_99",X="_row_2pgom_115",Z="_label_2pgom_131",ee="_value_2pgom_141",ne="_slider_2pgom_155",te="_audioGrid_2pgom_197",re="_button_2pgom_211",ae="_buttonActive_2pgom_241",oe="_fileLabel_2pgom_253",ie="_fileInput_2pgom_267",se="_meters_2pgom_275",le="_meter_2pgom_275",ce="_meterLabel_2pgom_301",ue="_meterBar_2pgom_315",me="_meterFill_2pgom_329",s={root:W,canvasHost:q,panel:O,panelTitle:U,subtitle:J,section:K,sectionTitle:Q,row:X,label:Z,value:ee,slider:ne,audioGrid:te,button:re,buttonActive:ae,fileLabel:oe,fileInput:ie,meters:se,meter:le,meterLabel:ce,meterBar:ue,meterFill:me},de=`attribute float aHeight;\r
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
// Cheap hash for sparkle\r
float hash13(vec3 p) {\r
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));\r
  p += dot(p, p.yzx + 19.19);\r
  return fract((p.x + p.y) * p.z);\r
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
  // ---------------------------------------------------------------------\r
  // Subtle audio sparkle: pinpoint twinkles on facets, riding on treble.\r
  // ---------------------------------------------------------------------\r
  vec3 sparkleSeed = floor(vWorldPos * 18.0 + vSeed * 7.0);\r
  float h = hash13(sparkleSeed);\r
  // Each cell twinkles at its own phase; treble decides who is currently lit.\r
  float phase = h * 6.2831 + uTime * (1.5 + h * 2.0);\r
  float twinkle = pow(0.5 + 0.5 * sin(phase), 24.0);\r
  // Threshold so only a few cells fire at once, scaled by treble + level.\r
  float threshold = 0.85 - clamp(uTreble * 0.45 + uLevel * 0.15, 0.0, 0.55);\r
  float gate = smoothstep(threshold, threshold + 0.02, h);\r
  float sparkle = twinkle * gate * (0.25 + uTreble * 1.6);\r
  // Sparkle favors faces that point toward the camera (catches the eye).\r
  sparkle *= 0.4 + 0.6 * ndv;\r
  base += vec3(1.0, 0.96, 0.85) * sparkle;\r
\r
  // Very gentle overall lift with level so the field "breathes" rather than pumps.\r
  base *= 0.95 + uLevel * 0.10;\r
\r
  gl_FragColor = vec4(base, 1.0);\r
}\r
`,ve=`attribute float aRadius;\r
attribute float aTwinkle;\r
\r
uniform float uTime;\r
uniform float uTreble;\r
\r
varying float vTwinkle;\r
\r
void main() {\r
  vTwinkle = aTwinkle;\r
  vec4 mv = modelViewMatrix * vec4(position, 1.0);\r
  float pulse = 0.5 + 0.5 * sin(uTime * 1.7 + aTwinkle * 6.2831);\r
  gl_PointSize = aRadius * (1.0 + pulse * 0.6 + uTreble * 1.4) * (300.0 / -mv.z);\r
  gl_Position = projectionMatrix * mv;\r
}\r
`,he=`precision mediump float;\r
\r
uniform float uTime;\r
varying float vTwinkle;\r
\r
void main() {\r
  vec2 uv = gl_PointCoord - 0.5;\r
  float d = length(uv);\r
  float core = smoothstep(0.5, 0.0, d);\r
  float halo = smoothstep(0.5, 0.15, d) * 0.4;\r
  float a = core + halo;\r
  if (a < 0.02) discard;\r
\r
  vec3 col = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.85, 0.95), vTwinkle);\r
  gl_FragColor = vec4(col, a);\r
}\r
`,pe=`varying vec3 vDir;\r
\r
void main() {\r
  vDir = normalize(position);\r
  // Render at the far plane regardless of distance — sky dome.\r
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\r
  gl_Position = projectionMatrix * mvPosition;\r
}\r
`,be=`precision highp float;\r
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
  // Compose: sky base + slow cell glow + fast shimmer edges + sparkle dots.\r
  vec3 col = sky;\r
  col += cellTintA * coreA * (0.35 + uBass * 0.9 * uReactivity);\r
  col += cellTintB * edgeA * (0.25 + uMid * 0.8 * uReactivity);\r
  col += vec3(1.0, 0.95, 0.85) * edgeB * (0.18 + uTreble * 1.3 * uReactivity);\r
\r
  // Sparkle: tiny bright cores from the small voronoi, only on the brightest hits.\r
  float sparkle = pow(1.0 - smoothstep(0.0, 0.12, vB.x), 8.0);\r
  col += vec3(1.0, 0.92, 0.78) * sparkle * (uTreble * 1.4 + 0.05);\r
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
`,z=[{name:"midnight bloom",a:new b("#3a1f6b"),b:new b("#c84db0"),c:new b("#ffd07b"),fog:new b("#0a0820")},{name:"glacier",a:new b("#0e2a4d"),b:new b("#3ec0ff"),c:new b("#e0f7ff"),fog:new b("#04101f")},{name:"ember",a:new b("#3b0a14"),b:new b("#ff6b3d"),c:new b("#ffe07a"),fog:new b("#150607")},{name:"aurora",a:new b("#0c2230"),b:new b("#36e0a8"),c:new b("#a86bff"),fog:new b("#040c11")}],ge={count:240,spread:24,baseHeight:2.2,heightVariance:2.6,reactivity:.9,bandCount:6,paletteIndex:0,cameraDrift:.4,fogDensity:.05,moonHeight:.65,starCount:600,audioGain:.9,smoothing:.82};function ye({controls:r,bandsRef:i}){const{scene:a}=P(),o=z[r.paletteIndex]??z[0];return m.useEffect(()=>(a.fog=new I(o.fog.getHex(),r.fogDensity),a.background=null,()=>{a.fog=null}),[a,o,r.fogDensity]),e.jsxs(e.Fragment,{children:[e.jsx(xe,{controls:r,palette:o,bandsRef:i}),e.jsx(we,{controls:r,palette:o,bandsRef:i}),e.jsx(Te,{palette:o}),e.jsx(Me,{controls:r,palette:o,bandsRef:i}),e.jsx(je,{count:r.starCount,bandsRef:i}),e.jsx(Ae,{drift:r.cameraDrift,bandsRef:i})]})}function xe({controls:r,palette:i,bandsRef:a}){const o=m.useMemo(()=>new H({vertexShader:pe,fragmentShader:be,side:G,depthWrite:!1,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uLevel:{value:0},uReactivity:{value:r.reactivity},uMoonY:{value:r.moonHeight},uTintA:{value:i.a.clone()},uTintB:{value:i.b.clone()},uTintC:{value:i.c.clone()},uFog:{value:i.fog.clone()}}}),[]);return m.useEffect(()=>{o.uniforms.uReactivity.value=r.reactivity,o.uniforms.uMoonY.value=r.moonHeight,o.uniforms.uTintA.value.copy(i.a),o.uniforms.uTintB.value.copy(i.b),o.uniforms.uTintC.value.copy(i.c),o.uniforms.uFog.value.copy(i.fog)},[o,r.reactivity,r.moonHeight,i]),m.useEffect(()=>()=>o.dispose(),[o]),k((l,u)=>{const c=o.uniforms;c.uTime.value+=u;const n=a.current;c.uBass.value=n.bass,c.uMid.value=n.mid,c.uTreble.value=n.treble,c.uLevel.value=n.level}),e.jsxs("mesh",{frustumCulled:!1,renderOrder:-1,children:[e.jsx("sphereGeometry",{args:[120,48,32]}),e.jsx("primitive",{object:o,attach:"material"})]})}function we({controls:r,palette:i,bandsRef:a}){const o=m.useRef(null),l=m.useMemo(()=>{const t=[],d=[],v=[],w=[],h=[];for(let f=0;f<6;f+=1){const g=f/6*Math.PI*2;w.push(new C(Math.cos(g)*.5,0,Math.sin(g)*.5)),h.push(new C(Math.cos(g)*.5*.35,.92,Math.sin(g)*.5*.35))}const p=new C(0,1,0);for(let f=0;f<6;f+=1){const g=(f+1)%6,T=w[f],A=w[g],M=h[f],j=h[g],_=new C().copy(A).sub(T).cross(new C().copy(M).sub(T)).normalize(),B=t.length/3;[T,A,j,M].forEach(F=>{t.push(F.x,F.y,F.z),d.push(_.x,_.y,_.z)}),v.push(B,B+1,B+2,B,B+2,B+3)}for(let f=0;f<6;f+=1){const g=(f+1)%6,T=h[f],A=h[g],M=new C().copy(A).sub(T).cross(new C().copy(p).sub(T)).normalize(),j=t.length/3;[T,A,p].forEach(_=>{t.push(_.x,_.y,_.z),d.push(M.x,M.y,M.z)}),v.push(j,j+1,j+2)}const y=new E;return y.setAttribute("position",new R(t,3)),y.setAttribute("normal",new R(d,3)),y.setIndex(v),y.computeBoundingSphere(),y},[]),u=m.useMemo(()=>new H({vertexShader:de,fragmentShader:fe,uniforms:{uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uLevel:{value:0},uReactivity:{value:r.reactivity},uBands:{value:r.bandCount},uMoonY:{value:r.moonHeight},uTintA:{value:i.a.clone()},uTintB:{value:i.b.clone()},uTintC:{value:i.c.clone()}},transparent:!1}),[]);return m.useEffect(()=>{u.uniforms.uReactivity.value=r.reactivity,u.uniforms.uBands.value=r.bandCount,u.uniforms.uMoonY.value=r.moonHeight,u.uniforms.uTintA.value.copy(i.a),u.uniforms.uTintB.value.copy(i.b),u.uniforms.uTintC.value.copy(i.c)},[u,r.reactivity,r.bandCount,r.moonHeight,i]),m.useEffect(()=>{const c=o.current;if(!c)return;const n=r.count,t=new Float32Array(n),d=new Float32Array(n),v=new Float32Array(n),w=new Float32Array(n),h=new Y,p=L(12648430);for(let f=0;f<n;f+=1){const g=Math.sqrt(p())*r.spread,T=p()*Math.PI*2,A=Math.cos(T)*g,M=Math.sin(T)*g*.65,j=.5+p()*1.4;h.position.set(A,0,M),h.rotation.set(0,p()*Math.PI*2,0),h.scale.set(j,1,j),h.updateMatrix(),c.setMatrixAt(f,h.matrix),t[f]=r.baseHeight+p()*r.heightVariance+g*.05,d[f]=p(),v[f]=p(),w[f]=Math.floor(p()*3)}c.instanceMatrix.needsUpdate=!0;const y=c.geometry;y.setAttribute("aHeight",new S(t,1)),y.setAttribute("aHue",new S(d,1)),y.setAttribute("aSeed",new S(v,1)),y.setAttribute("aBand",new S(w,1)),c.count=n},[r.count,r.spread,r.baseHeight,r.heightVariance]),m.useEffect(()=>()=>{l.dispose(),u.dispose()},[l,u]),k((c,n)=>{const t=u.uniforms;t.uTime.value+=n;const d=a.current;t.uBass.value=d.bass,t.uMid.value=d.mid,t.uTreble.value=d.treble,t.uLevel.value=d.level}),e.jsx("instancedMesh",{ref:o,args:[l,u,r.count],frustumCulled:!1})}function Te({palette:r}){const i=m.useMemo(()=>new D({color:r.fog.clone().lerp(r.a,.35)}),[r]);return m.useEffect(()=>()=>i.dispose(),[i]),e.jsxs("mesh",{"rotation-x":-Math.PI/2,position:[0,-.02,0],children:[e.jsx("circleGeometry",{args:[80,64]}),e.jsx("primitive",{object:i,attach:"material"})]})}function Me({controls:r,palette:i,bandsRef:a}){const o=m.useRef(null),l=m.useMemo(()=>new D({color:new b("#fff5dc").lerp(i.c,.4),transparent:!0,opacity:.95}),[i]);m.useEffect(()=>()=>l.dispose(),[l]),k(()=>{const c=o.current;if(!c)return;const n=1+a.current.bass*.18;c.scale.setScalar(n)});const u=6+r.moonHeight*14;return e.jsxs("mesh",{ref:o,position:[6,u,-38],children:[e.jsx("sphereGeometry",{args:[3.4,48,48]}),e.jsx("primitive",{object:l,attach:"material"})]})}function je({count:r,bandsRef:i}){const a=m.useRef(null),o=m.useMemo(()=>{const u=new Float32Array(r*3),c=new Float32Array(r),n=new Float32Array(r),t=L(48879);for(let v=0;v<r;v+=1){const w=t()*Math.PI*2,h=Math.acos(.2+t()*.78),p=60+t()*20;u[v*3+0]=Math.sin(h)*Math.cos(w)*p,u[v*3+1]=Math.cos(h)*p*.6+4,u[v*3+2]=Math.sin(h)*Math.sin(w)*p,c[v]=.6+t()*1.6,n[v]=t()}const d=new E;return d.setAttribute("position",new N(u,3)),d.setAttribute("aRadius",new N(c,1)),d.setAttribute("aTwinkle",new N(n,1)),d},[r]),l=m.useMemo(()=>new H({vertexShader:ve,fragmentShader:he,uniforms:{uTime:{value:0},uTreble:{value:0}},transparent:!0,depthWrite:!1}),[]);return m.useEffect(()=>()=>{o.dispose(),l.dispose()},[o,l]),k((u,c)=>{l.uniforms.uTime.value+=c,l.uniforms.uTreble.value=i.current.treble}),e.jsx("points",{ref:a,args:[o,l]})}function Ae({drift:r,bandsRef:i}){const{camera:a}=P(),o=m.useRef(0);return k((l,u)=>{o.current+=u*(.15+r*.4);const c=14+Math.sin(o.current*.7)*2,n=o.current*.25,t=i.current.bass;a.position.x=Math.sin(n)*c,a.position.z=Math.cos(n)*c,a.position.y=3.2+Math.sin(o.current*.5)*.6+t*.5,a.lookAt(0,2.2+t*.4,0)}),null}function L(r){let i=r>>>0;return()=>{i=i+1831565813>>>0;let a=i;return a=Math.imul(a^a>>>15,a|1),a^=a+Math.imul(a^a>>>7,a|61),((a^a>>>14)>>>0)/4294967296}}function ke({width:r,height:i}){const[a,o]=m.useState(ge),l=$(),u=m.useRef(null);m.useEffect(()=>{l.setGain(a.audioGain)},[l,a.audioGain]),m.useEffect(()=>{l.setSmoothing(a.smoothing)},[l,a.smoothing]),m.useEffect(()=>{let n=0;const t=()=>{const d=u.current;if(d){const v=l.bands.current,w=d.querySelectorAll(`.${s.meterFill}`),h=[v.bass,v.mid,v.treble,v.level];w.forEach((p,y)=>{p.style.width=`${Math.min(100,h[y]*130)}%`})}n=requestAnimationFrame(t)};return n=requestAnimationFrame(t),()=>cancelAnimationFrame(n)},[l.bands]);const c=n=>{var d;const t=(d=n.target.files)==null?void 0:d[0];t&&l.loadFile(t),n.target.value=""};return e.jsxs("div",{className:s.root,style:{width:r,height:i},children:[e.jsx("div",{className:s.canvasHost,children:e.jsx(V,{gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],camera:{fov:55,position:[0,4,14],near:.1,far:200},children:e.jsx(ye,{controls:a,bandsRef:l.bands})})}),e.jsxs("aside",{className:s.panel,"aria-label":"Moonlight controls",children:[e.jsx("h3",{className:s.panelTitle,children:"Moonlight · LSDREAM Visualizer"}),e.jsx("p",{className:s.subtitle,children:"Pick an audio source and tune the crystal field."}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Audio Source"}),e.jsxs("div",{className:s.audioGrid,children:[e.jsx("button",{type:"button",className:`${s.button} ${l.source==="demo"?s.buttonActive:""}`,onClick:()=>void l.loadDemo(),children:"Demo Pad"}),e.jsx("button",{type:"button",className:`${s.button} ${l.source==="mic"?s.buttonActive:""}`,onClick:()=>void l.enableMic(),children:"Microphone"}),e.jsx("button",{type:"button",className:`${s.button} ${l.source==="tab"?s.buttonActive:""}`,onClick:()=>{l.captureTab().catch(n=>{const t=n instanceof Error?n.message:String(n);window.alert(`Tab audio capture failed:

${t}`)})},title:"Pick another tab (e.g. Spotify Web, YouTube) and tick 'Share tab audio'",children:"Tab Audio"}),e.jsxs("label",{className:`${s.button} ${s.fileLabel} ${l.source==="file"?s.buttonActive:""}`,children:["Load File",e.jsx("input",{className:s.fileInput,type:"file",accept:"audio/*",onChange:c})]}),e.jsx("button",{type:"button",className:s.button,onClick:()=>l.stop(),disabled:!l.isActive,children:"Stop"})]}),e.jsx("div",{className:s.meters,ref:u,children:["BASS","MID","TREBLE","LEVEL"].map(n=>e.jsxs("div",{className:s.meter,children:[e.jsx("span",{className:s.meterLabel,children:n}),e.jsx("span",{className:s.meterBar,children:e.jsx("span",{className:s.meterFill})})]},n))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Audio Mix"}),e.jsx(x,{label:"Audio Gain",min:0,max:1.5,step:.01,value:a.audioGain,onChange:n=>o(t=>({...t,audioGain:n}))}),e.jsx(x,{label:"Smoothing",min:0,max:.96,step:.01,value:a.smoothing,onChange:n=>o(t=>({...t,smoothing:n}))}),e.jsx(x,{label:"Reactivity",min:0,max:2,step:.05,value:a.reactivity,onChange:n=>o(t=>({...t,reactivity:n}))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Crystal Field"}),e.jsx(x,{label:"Crystal Count",min:40,max:600,step:10,value:a.count,onChange:n=>o(t=>({...t,count:n}))}),e.jsx(x,{label:"Spread",min:6,max:45,step:.5,value:a.spread,onChange:n=>o(t=>({...t,spread:n}))}),e.jsx(x,{label:"Base Height",min:.4,max:5,step:.05,value:a.baseHeight,onChange:n=>o(t=>({...t,baseHeight:n}))}),e.jsx(x,{label:"Height Variance",min:0,max:6,step:.05,value:a.heightVariance,onChange:n=>o(t=>({...t,heightVariance:n}))}),e.jsx(x,{label:"Color Bands",min:1,max:14,step:1,value:a.bandCount,onChange:n=>o(t=>({...t,bandCount:n}))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Sky & Camera"}),e.jsx(x,{label:"Camera Drift",min:0,max:1.5,step:.01,value:a.cameraDrift,onChange:n=>o(t=>({...t,cameraDrift:n}))}),e.jsx(x,{label:"Fog Density",min:0,max:.18,step:.005,value:a.fogDensity,onChange:n=>o(t=>({...t,fogDensity:n}))}),e.jsx(x,{label:"Moon Height",min:0,max:1.4,step:.01,value:a.moonHeight,onChange:n=>o(t=>({...t,moonHeight:n}))}),e.jsx(x,{label:"Star Count",min:0,max:1500,step:50,value:a.starCount,onChange:n=>o(t=>({...t,starCount:n}))})]}),e.jsxs("section",{className:s.section,children:[e.jsx("p",{className:s.sectionTitle,children:"Palette"}),e.jsx("div",{className:s.audioGrid,children:z.map((n,t)=>e.jsx("button",{type:"button",className:`${s.button} ${a.paletteIndex===t?s.buttonActive:""}`,onClick:()=>o(d=>({...d,paletteIndex:t})),children:n.name},n.name))})]})]})]})}function x({label:r,min:i,max:a,step:o,value:l,onChange:u}){const c=`mlight-${r.toLowerCase().replace(/\s+/g,"-")}`;return e.jsxs("div",{className:s.row,children:[e.jsx("label",{htmlFor:c,className:s.label,children:r}),e.jsx("span",{className:s.value,children:o>=1?l.toFixed(0):l.toFixed(2)}),e.jsx("input",{id:c,type:"range",className:s.slider,min:i,max:a,step:o,value:l,onChange:n=>u(Number(n.target.value))})]})}export{ke as default};
