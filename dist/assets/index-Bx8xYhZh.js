import{j as a,C as s,r as i,a0 as c,S as l,a1 as m,b as v}from"./index-DfGpesBi.js";const u=`varying vec3 vNormal;\r
varying vec3 vViewDir;\r
\r
void main() {\r
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\r
  vNormal = normalize(normalMatrix * normal);\r
  vViewDir = normalize(-mvPosition.xyz);\r
  gl_Position = projectionMatrix * mvPosition;\r
}\r
`,f=`varying vec3 vNormal;\r
varying vec3 vViewDir;\r
uniform float uTime;\r
\r
vec3 cosineSpectrum(float t) {\r
  // Violet/cyan/pink bias via palette offset 0.55\r
  return 0.5 + 0.5 * cos(6.2831 * (vec3(0.55, 0.88, 1.22) + t));\r
}\r
\r
void main() {\r
  vec3 n = normalize(vNormal);\r
  vec3 v = normalize(vViewDir);\r
\r
  // Fresnel iridescence\r
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.5);\r
  vec3 iridColor = cosineSpectrum(fresnel * 1.2 + uTime * 0.04);\r
  iridColor *= 0.25 + 0.75 * fresnel;\r
\r
  // Blinn-Phong specular — single warm key light\r
  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));\r
  vec3 halfVec = normalize(lightDir + v);\r
  float spec = pow(max(dot(halfVec, n), 0.0), 64.0) * 1.8;\r
\r
  // Dark ambient so unlit faces stay near-black\r
  vec3 ambient = vec3(0.02);\r
\r
  vec3 col = iridColor + vec3(spec) + ambient;\r
  gl_FragColor = vec4(col, 1.0);\r
}\r
`;function p(){const r=i.useRef(null),e=i.useMemo(()=>{const o=new c(1,2,4,1);return o.rotateX(Math.PI),o},[]),n=i.useMemo(()=>new l({vertexShader:u,fragmentShader:f,uniforms:{uTime:{value:0}},side:m}),[]);return i.useEffect(()=>()=>{e.dispose(),n.dispose()},[e,n]),v((o,t)=>{n.uniforms.uTime.value+=t,r.current&&(r.current.rotation.y+=t*.25,r.current.rotation.x=Math.sin(n.uniforms.uTime.value*.3)*.06)}),a.jsx("mesh",{ref:r,geometry:e,material:n})}function g({width:r,height:e}){return a.jsx(s,{style:{width:r,height:e,display:"block"},camera:{position:[0,.5,4],fov:40},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:a.jsx(p,{})})}export{g as default};
