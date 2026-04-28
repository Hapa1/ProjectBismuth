import{G as j,M as N,a as R,B as b,j as w,C as G,r as B,S as O,D as T,b as V}from"./index-CuS_Sl1Z.js";import{O as k}from"./OrbitControls-ZvE0b-ve.js";function z(n){return n-Math.floor(n)}function D(n,o,t){return z(Math.sin(n*127.1+o*311.7+t*74.7)*43758.5453123)}function E(n,o,t){const e=Math.floor(n),c=Math.floor(o),r=e+1,i=c+1,l=n-e,u=o-c,v=l*l*(3-2*l),x=u*u*(3-2*u),S=D(e,c,t),s=D(r,c,t),h=D(e,i,t),M=D(r,i,t),f=N.lerp(S,s,v),m=N.lerp(h,M,v);return N.lerp(f,m,x)}function a(n,o,t){let e=0,c=.5,r=1;for(let i=0;i<4;i++)e+=E(n*r,o*r,t+i*17.3)*c,c*=.5,r*=2;return e}function L(n,o,t,e,c,r,i){const l=new R(new b(o,t,e));l.position.set(c,r,i),n.add(l)}function Z(n,o,t,e,c,r,i){const l=o/2-e/2,u=o-e,v=N.clamp(o*(.16+a(i*.23,r,r)*.14),e*1.2,o*.38),x=(i+Math.floor(r*3.1))%4,S=(x+1)%4,s=(a(i*.17,r*.13,r+3)-.5)*o*.06,h=(a(r*.11,i*.17,r+7)-.5)*o*.06;for(let f=0;f<4;f++){const m=f===x,g=f===S,p=m?v:g?v*.38:v*.16,y=Math.max(u-p,e*1.2),P=m?v*.25:g?v*.08:0;f===0?L(n,y,c,e,s-P*.5,t,h+l):f===1?L(n,e,c,y,s+l,t,h+P*.5):f===2?L(n,y,c,e,s+P*.5,t,h-l):L(n,e,c,y,s-l,t,h-P*.5)}const M=a(i*.31,r*.09,r+23);if(M>.52){const f=c*(1.4+M*1.6),m=e*(.9+M*.45),g=o/2-m*.65,p=Math.floor(a(r+8,i*.41,r+41)*4)%4,y=[[1,1],[1,-1],[-1,-1],[-1,1]],[P,I]=y[p];L(n,m,f,m,s+P*g,t+f*.35,h+I*g)}}function _(n,o,t,e,c,r){const i=new j,l=o/(n+2);for(let u=0;u<n;u++){const v=a(u*.09,r*.17,r+13),x=o-u*l*(.88+v*.34);if(x<=e*2.5)break;const S=u*t*(.9+a(u*.15,r*.07,r+19)*.3);Z(i,x,S,e,c,r,u)}return i}function C(n,o,t){const e=new j,c=_(n.levels,n.outerSize,n.risePerLevel,n.barWidth,n.barHeight,t);if(e.add(c),o>=n.maxDepth)return e;const r=Math.max(4,Math.floor(n.levels*(.45+a(t,o,t+29)*.15))),i=n.outerSize*(.36+a(t+2,o*.2,t+31)*.14),l=n.risePerLevel*(.88+a(t+3,o*.18,t+37)*.28),u=n.barWidth*(.82+a(t+5,o*.14,t+43)*.22),v=n.barHeight*(.86+a(t+7,o*.16,t+47)*.22),x=Math.floor(n.levels*.34),S=Math.max(3,Math.floor(n.levels*.26));for(let s=0;s<4;s++){const h=a(t+s*1.7,o*.3,t+53);if(h<.3)continue;const M=Math.PI*.25+s*(Math.PI/2),m=(x+Math.floor(h*S))*n.risePerLevel,g=n.outerSize*(.24+h*.2),p=C({levels:r,outerSize:i,risePerLevel:l,barWidth:u,barHeight:v,maxDepth:n.maxDepth},o+1,t+s*13.1);p.position.set(Math.cos(M)*g+(a(s,t,t+59)-.5)*i*.35,m+(h-.5)*n.risePerLevel*1.8,Math.sin(M)*g+(a(t,s,t+61)-.5)*i*.35),p.rotation.y=s*(Math.PI/2)+a(s*.2,t,t+67)*.45,e.add(p)}return e}function F(n){const o=C({levels:n,outerSize:2.35,risePerLevel:.18,barWidth:.12,barHeight:.12,maxDepth:2},0,4.2);return o.rotation.y=Math.PI*.25,o}const H=`varying vec3 vN;\r
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
`;function d({width:n}){const o=B.useRef(null),t=n<480?9:16,e=B.useMemo(()=>new O({vertexShader:H,fragmentShader:X,uniforms:{uTime:{value:0}},side:T}),[]);return B.useEffect(()=>{const c=F(t);return c.traverse(r=>{r.isMesh&&(r.material=e)}),o.current.add(c),()=>{var r;c.traverse(i=>{i.isMesh&&i.geometry.dispose()}),(r=o.current)==null||r.remove(c)}},[t,e]),B.useEffect(()=>()=>{e.dispose()},[e]),V((c,r)=>{e.uniforms.uTime.value+=r,o.current&&(o.current.rotation.y+=r*.12)}),w.jsx("group",{ref:o})}function Y({width:n,height:o}){const t=n<480?6.5:5.6;return w.jsxs(G,{style:{width:n,height:o,display:"block"},camera:{position:[3.3,4.1,t],fov:36},gl:{antialias:!0,powerPreference:"high-performance"},dpr:[1,Math.min(window.devicePixelRatio,2)],children:[w.jsx("ambientLight",{intensity:.1}),w.jsx(d,{width:n}),w.jsx(k,{enablePan:!1,makeDefault:!0,target:[0,1.7,0]})]})}export{Y as default};
