import{j as w,r as B}from"./index-DFysevIV.js";import{G as j,M as N,a as R,B as G,C as O,S as T,D as V,u as b}from"./react-three-fiber.esm-NJIcqF1q.js";import{O as k}from"./OrbitControls-DEwHJlrl.js";import"./extends-CF3RwP-h.js";function z(t){return t-Math.floor(t)}function D(t,o,n){return z(Math.sin(t*127.1+o*311.7+n*74.7)*43758.5453123)}function E(t,o,n){const e=Math.floor(t),c=Math.floor(o),r=e+1,i=c+1,l=t-e,u=o-c,v=l*l*(3-2*l),x=u*u*(3-2*u),p=D(e,c,n),s=D(r,c,n),h=D(e,i,n),M=D(r,i,n),f=N.lerp(p,s,v),m=N.lerp(h,M,v);return N.lerp(f,m,x)}function a(t,o,n){let e=0,c=.5,r=1;for(let i=0;i<4;i++)e+=E(t*r,o*r,n+i*17.3)*c,c*=.5,r*=2;return e}function L(t,o,n,e,c,r,i){const l=new R(new G(o,n,e));l.position.set(c,r,i),t.add(l)}function Z(t,o,n,e,c,r,i){const l=o/2-e/2,u=o-e,v=N.clamp(o*(.16+a(i*.23,r,r)*.14),e*1.2,o*.38),x=(i+Math.floor(r*3.1))%4,p=(x+1)%4,s=(a(i*.17,r*.13,r+3)-.5)*o*.06,h=(a(r*.11,i*.17,r+7)-.5)*o*.06;for(let f=0;f<4;f++){const m=f===x,g=f===p,S=m?v:g?v*.38:v*.16,y=Math.max(u-S,e*1.2),P=m?v*.25:g?v*.08:0;f===0?L(t,y,c,e,s-P*.5,n,h+l):f===1?L(t,e,c,y,s+l,n,h+P*.5):f===2?L(t,y,c,e,s+P*.5,n,h-l):L(t,e,c,y,s-l,n,h-P*.5)}const M=a(i*.31,r*.09,r+23);if(M>.52){const f=c*(1.4+M*1.6),m=e*(.9+M*.45),g=o/2-m*.65,S=Math.floor(a(r+8,i*.41,r+41)*4)%4,y=[[1,1],[1,-1],[-1,-1],[-1,1]],[P,I]=y[S];L(t,m,f,m,s+P*g,n+f*.35,h+I*g)}}function _(t,o,n,e,c,r){const i=new j,l=o/(t+2);for(let u=0;u<t;u++){const v=a(u*.09,r*.17,r+13),x=o-u*l*(.88+v*.34);if(x<=e*2.5)break;const p=u*n*(.9+a(u*.15,r*.07,r+19)*.3);Z(i,x,p,e,c,r,u)}return i}function C(t,o,n){const e=new j,c=_(t.levels,t.outerSize,t.risePerLevel,t.barWidth,t.barHeight,n);if(e.add(c),o>=t.maxDepth)return e;const r=Math.max(4,Math.floor(t.levels*(.45+a(n,o,n+29)*.15))),i=t.outerSize*(.36+a(n+2,o*.2,n+31)*.14),l=t.risePerLevel*(.88+a(n+3,o*.18,n+37)*.28),u=t.barWidth*(.82+a(n+5,o*.14,n+43)*.22),v=t.barHeight*(.86+a(n+7,o*.16,n+47)*.22),x=Math.floor(t.levels*.34),p=Math.max(3,Math.floor(t.levels*.26));for(let s=0;s<4;s++){const h=a(n+s*1.7,o*.3,n+53);if(h<.3)continue;const M=Math.PI*.25+s*(Math.PI/2),m=(x+Math.floor(h*p))*t.risePerLevel,g=t.outerSize*(.24+h*.2),S=C({levels:r,outerSize:i,risePerLevel:l,barWidth:u,barHeight:v,maxDepth:t.maxDepth},o+1,n+s*13.1);S.position.set(Math.cos(M)*g+(a(s,n,n+59)-.5)*i*.35,m+(h-.5)*t.risePerLevel*1.8,Math.sin(M)*g+(a(n,s,n+61)-.5)*i*.35),S.rotation.y=s*(Math.PI/2)+a(s*.2,n,n+67)*.45,e.add(S)}return e}function F(t){const o=C({levels:t,outerSize:2.35,risePerLevel:.18,barWidth:.12,barHeight:.12,maxDepth:2},0,4.2);return o.rotation.y=Math.PI*.25,o}const H=`varying vec3 vN;\r
varying vec3 vV;\r
\r
void main() {\r
  vec4 mv = modelViewMatrix * vec4(position, 1.0);\r
  vN = normalize(normalMatrix * normal);\r
  vV = normalize(-mv.xyz);\r
  gl_Position = projectionMatrix * mv;\r
}\r
`,X=`varying vec3 vN;\r
varying vec3 vV;\r
uniform float uTime;\r
\r
vec3 spectrum(float t) {\r
  return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t));\r
}\r
\r
void main() {\r
  float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);\r
  vec3 col = spectrum(fres + uTime * 0.05);\r
  gl_FragColor = vec4(col * (0.3 + 0.7 * fres), 1.0);\r
}\r
`;function d({width:t}){const o=B.useRef(null),n=t<480?9:16,e=B.useMemo(()=>new T({vertexShader:H,fragmentShader:X,uniforms:{uTime:{value:0}},side:V}),[]);return B.useEffect(()=>{const c=F(n);return c.traverse(r=>{r.isMesh&&(r.material=e)}),o.current.add(c),()=>{var r;c.traverse(i=>{i.isMesh&&i.geometry.dispose()}),(r=o.current)==null||r.remove(c)}},[n,e]),B.useEffect(()=>()=>{e.dispose()},[e]),b((c,r)=>{e.uniforms.uTime.value+=r,o.current&&(o.current.rotation.y+=r*.12)}),w.jsx("group",{ref:o})}function J({width:t,height:o}){const n=t<480?6.5:5.6;return w.jsxs(O,{style:{width:t,height:o,display:"block"},camera:{position:[3.3,4.1,n],fov:36},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[w.jsx("ambientLight",{intensity:.1}),w.jsx(d,{width:t}),w.jsx(k,{enablePan:!1,makeDefault:!0,target:[0,1.7,0]})]})}export{J as default};
