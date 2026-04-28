import{u as d,j as o}from"./index-Cn0ECLdO.js";const m={id:"v2-big-idea",title:"Prompted, not Coded"};function s(e){const{Code:t,Compare:r,Demo:i,Prompt:a}={...d(),...e.components};return t||n("Code"),r||n("Compare"),i||n("Demo"),a||n("Prompt"),o.jsxs(r,{layout:"split",headline:"What used to take a textbook now takes a sentence.",children:[o.jsx(t,{language:"three.js",label:"Old way",caption:"≈ 90 lines just to see a spinning shape.",children:`import * as THREE from 'three';

const root = document.getElementById('app');
const width = root.clientWidth;
const height = root.clientHeight;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0a0a');

const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
camera.position.set(0, 0.4, 4.2);

const renderer = new THREE.WebGLRenderer({
antialias: true,
powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
root.appendChild(renderer.domElement);

let geometry = new THREE.IcosahedronGeometry(1.2);
const material = new THREE.MeshStandardMaterial({
color: new THREE.Color().setHSL(265 / 360, 0.55, 0.6),
metalness: 0.4,
roughness: 0.25,
flatShading: true,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0x9bb6ff, 0.35);
fill.position.set(-4, -2, -3);
scene.add(fill);

function setShape(name) {
const next =
  name === 'tetrahedron'  ? new THREE.TetrahedronGeometry(1.2) :
  name === 'cube'         ? new THREE.BoxGeometry(1.68, 1.68, 1.68) :
  name === 'octahedron'   ? new THREE.OctahedronGeometry(1.2) :
  name === 'dodecahedron' ? new THREE.DodecahedronGeometry(1.2) :
                            new THREE.IcosahedronGeometry(1.2);
geometry.dispose();
geometry = next;
mesh.geometry = next;
}

let rotationSpeed = 0.4;
function setSpeed(v) { rotationSpeed = v; }
function setWireframe(on) { material.wireframe = on; material.needsUpdate = true; }
function setHue(deg) { material.color.setHSL(deg / 360, 0.55, 0.6); }
function setSize(s) {
// rebuild geometry at new size, dispose old, swap into mesh…
}

const clock = new THREE.Clock();
let raf = 0;

function tick() {
const delta = clock.getDelta();
mesh.rotation.y += delta * rotationSpeed;
mesh.rotation.x += delta * rotationSpeed * 0.45;
renderer.render(scene, camera);
raf = requestAnimationFrame(tick);
}

const onResize = () => {
const w = root.clientWidth;
const h = root.clientHeight;
camera.aspect = w / h;
camera.updateProjectionMatrix();
renderer.setSize(w, h);
};
window.addEventListener('resize', onResize);

tick();

// …and don't forget the cleanup nobody writes:
//   cancelAnimationFrame(raf);
//   window.removeEventListener('resize', onResize);
//   geometry.dispose(); material.dispose(); renderer.dispose();
//   root.removeChild(renderer.domElement);
`}),o.jsx(a,{label:"Prompt",children:`Build me a small three.js scene that renders a Platonic
solid I can pick from a dropdown. Sliders for size, rotation
speed, hue, and a wireframe toggle. Dark background, subtle
lighting.`}),o.jsx(i,{projectId:"polyhedra",scrim:!1})]})}function l(e={}){const{wrapper:t}={...d(),...e.components};return t?o.jsx(t,{...e,children:o.jsx(s,{...e})}):s(e)}function n(e,t){throw new Error("Expected component `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{l as default,m as meta};
