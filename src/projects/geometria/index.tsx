import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import {
  useIridescentMaterial,
  usePrefersReducedMotion,
  HSV2RGB_GLSL,
  COSINE_SPECTRUM_GLSL,
} from '../../lib/iridescent';
import {
  PHASES,
  buildStrokeData,
  sampleHead,
  type StrokeData,
} from './phases';
import styles from './Geometria.module.css';

import strokeVert from './shaders/stroke.vert.glsl?raw';
import strokeFragTemplate from './shaders/stroke.frag.glsl?raw';

// Inject palette helper chunks once (per the iridescent library convention —
// no GLSL #include preprocessor).
const strokeFrag = strokeFragTemplate.replace(
  '// __PALETTE_CHUNKS__',
  `${HSV2RGB_GLSL}\n${COSINE_SPECTRUM_GLSL}`,
);

// ---------------------------------------------------------------------------
// Animation controller — shared via refs so the chip overlay (outside the
// Canvas) can imperatively retarget it without forcing React re-renders.
// ---------------------------------------------------------------------------

const BASE_SPEED = 1 / 70; // full sweep takes ~70s at base speed
const FAST_MULT = 8;

interface ControllerState {
  reveal: number;
  /** Target reveal in [0,1]; the loop drifts toward this. */
  target: number;
  /** When true, sweep at FAST_MULT until target is reached. */
  fast: boolean;
  /** Seconds spent holding at reveal=1 before resetting. */
  holdT: number;
  /** Currently-displayed phase index (derived; cached so chip UI can read). */
  activePhase: number;
}

type ControllerRef = React.MutableRefObject<ControllerState>;

function makeController(): ControllerState {
  return { reveal: 0, target: 1, fast: false, holdT: 0, activePhase: 0 };
}

// ---------------------------------------------------------------------------
// Settings (slider state) — imperatively read from refs inside useFrame.
// ---------------------------------------------------------------------------

interface Settings {
  speed: number;
  bloom: number;
  glow: number;
}

const DEFAULT_SETTINGS: Settings = { speed: 1.0, bloom: 1.35, glow: 1.4 };

// ---------------------------------------------------------------------------
// Stroke ribbon
// ---------------------------------------------------------------------------

interface StrokeRibbonProps {
  data: StrokeData;
  controller: ControllerRef;
  pencilWorldRef: React.MutableRefObject<THREE.Vector2>;
  pencilStrengthRef: React.MutableRefObject<number>;
  reduceMotion: boolean;
  settingsRef: React.MutableRefObject<Settings>;
  strokeDimRef: React.MutableRefObject<number>;
}

function StrokeRibbon({
  data,
  controller,
  pencilWorldRef,
  pencilStrengthRef,
  reduceMotion,
  settingsRef,
  strokeDimRef,
}: StrokeRibbonProps) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute('aArc', new THREE.BufferAttribute(data.arcs, 1));
    g.setAttribute('aIntensityMod', new THREE.BufferAttribute(data.intensityMods, 1));
    g.setIndex(new THREE.BufferAttribute(data.indices, 1));
    g.computeBoundingSphere();
    return g;
  }, [data]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: strokeVert,
      fragmentShader: strokeFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uIntensity: { value: DEFAULT_SETTINGS.glow },
        uPaletteOffset: { value: new THREE.Vector3(0.55, 0.88, 1.22) },
        uPencil: { value: new THREE.Vector2(0, 0) },
        uPencilStrength: { value: 0 },
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const c = controller.current;
    const speedMult = settingsRef.current.speed;

    if (reduceMotion) {
      // Snap directly to target — no animation.
      c.reveal = c.target;
    } else {
      const speed = (c.fast ? FAST_MULT : 1) * BASE_SPEED * speedMult;
      const dir = c.target >= c.reveal ? 1 : -1;
      const next = c.reveal + dir * speed * delta;
      if ((dir > 0 && next >= c.target) || (dir < 0 && next <= c.target)) {
        c.reveal = c.target;
        c.fast = false;
        // If the user dragged us back, immediately set target=1 so we
        // resume forward sweep at base speed.
        if (c.target < 1) c.target = 1;
      } else {
        c.reveal = next;
      }

      // Hold-at-end — once the construction reaches the Platonic Solids it
      // stays there. (Previously this looped back to the empty circle.)
      if (c.reveal >= 1 - 1e-4) {
        c.holdT += delta;
      } else {
        c.holdT = 0;
      }
    }

    // Derive active phase index from reveal.
    let phase = 0;
    for (let i = 0; i < data.phaseEdges.length; i++) {
      if (c.reveal <= data.phaseEdges[i] + 1e-6) {
        phase = i;
        break;
      }
      phase = i;
    }
    c.activePhase = phase;

    // Update uniforms.
    const u = material.uniforms;
    u.uTime.value += delta;
    u.uReveal.value = c.reveal;
    u.uIntensity.value = settingsRef.current.glow * strokeDimRef.current;

    // Sample current head to drive pencil position.
    const head = sampleHead(data, c.reveal);
    pencilWorldRef.current.set(head.x, head.y);
    (u.uPencil.value as THREE.Vector2).set(head.x, head.y);

    // Pencil strength fades when sitting at end.
    const targetStrength = c.reveal >= 1 - 1e-4 ? 0.2 : 1.0;
    pencilStrengthRef.current +=
      (targetStrength - pencilStrengthRef.current) * (1 - Math.exp(-delta * 4));
    u.uPencilStrength.value = pencilStrengthRef.current;
  });

  return <mesh geometry={geometry} material={material} />;
}

// ---------------------------------------------------------------------------
// Pencil tip — a small iridescent sphere that floats at the head.
// ---------------------------------------------------------------------------

interface PencilTipProps {
  pencilWorldRef: React.MutableRefObject<THREE.Vector2>;
  pencilStrengthRef: React.MutableRefObject<number>;
}

function PencilTip({ pencilWorldRef, pencilStrengthRef }: PencilTipProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const haloRef = useRef<THREE.Mesh>(null!);

  const material = useIridescentMaterial({
    palette: 'cosine',
    paletteOffset: [0.55, 0.88, 1.22],
    intensity: 1.6,
    rimBoost: 2.0,
    fresnelPower: 2.0,
  });

  const haloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff9ce6'),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => haloMaterial.dispose(), [haloMaterial]);

  const tipGeometry = useMemo(() => new THREE.SphereGeometry(0.045, 24, 16), []);
  const haloGeometry = useMemo(() => new THREE.SphereGeometry(0.18, 24, 16), []);
  useEffect(
    () => () => {
      tipGeometry.dispose();
      haloGeometry.dispose();
    },
    [tipGeometry, haloGeometry],
  );

  useFrame((_, delta) => {
    const u = material.uniforms;
    u.uTime.value += delta;
    u.uMirage.value = 0.85;
    u.uTreble.value = pencilStrengthRef.current;
    u.uLevel.value = pencilStrengthRef.current * 0.5;

    const p = pencilWorldRef.current;
    if (meshRef.current) {
      meshRef.current.position.set(p.x, p.y, 0.02);
      meshRef.current.scale.setScalar(0.7 + 0.6 * pencilStrengthRef.current);
    }
    if (haloRef.current) {
      haloRef.current.position.set(p.x, p.y, 0.01);
      const s = 0.7 + 0.5 * pencilStrengthRef.current;
      haloRef.current.scale.setScalar(s);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.35 * pencilStrengthRef.current;
    }
  });

  return (
    <group>
      <mesh ref={haloRef} geometry={haloGeometry} material={haloMaterial} />
      <mesh ref={meshRef} geometry={tipGeometry} material={material} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Platonic solids — ghost meshes + hand-drawn wireframe animation
// ---------------------------------------------------------------------------

type SolidKindName = 'tetra' | 'box' | 'octa' | 'dodeca' | 'icosa';
const SOLID_KINDS: SolidKindName[] = ['tetra', 'box', 'octa', 'dodeca', 'icosa'];

/** Build a BufferGeometry for a platonic solid. */
function buildSolidGeometry(kind: SolidKindName, size: number): THREE.BufferGeometry {
  switch (kind) {
    case 'tetra': return new THREE.TetrahedronGeometry(size);
    case 'box': return new THREE.BoxGeometry(size, size, size);
    case 'octa': return new THREE.OctahedronGeometry(size);
    case 'dodeca': return new THREE.DodecahedronGeometry(size);
    case 'icosa': return new THREE.IcosahedronGeometry(size);
  }
}

/** Extracts edges from a geometry and assigns BFS drawing order. */
function buildEdgeData(geometry: THREE.BufferGeometry): {
  edgeGeometry: THREE.BufferGeometry;
  edgeCount: number;
} {
  const edgesGeo = new THREE.EdgesGeometry(geometry, 1);
  const pos = edgesGeo.getAttribute('position');
  const numEdges = pos.count / 2;

  // Build adjacency for BFS ordering.
  const vertMap = new Map<string, number>();
  const adjList: { edgeIdx: number; other: number }[][] = [];
  const edgeVerts: [number, number][] = [];

  function getVert(x: number, y: number, z: number): number {
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    if (vertMap.has(key)) return vertMap.get(key)!;
    const id = adjList.length;
    vertMap.set(key, id);
    adjList.push([]);
    return id;
  }

  for (let i = 0; i < numEdges; i++) {
    const v1 = getVert(pos.getX(i * 2), pos.getY(i * 2), pos.getZ(i * 2));
    const v2 = getVert(pos.getX(i * 2 + 1), pos.getY(i * 2 + 1), pos.getZ(i * 2 + 1));
    adjList[v1].push({ edgeIdx: i, other: v2 });
    adjList[v2].push({ edgeIdx: i, other: v1 });
    edgeVerts.push([v1, v2]);
  }

  // BFS from vertex 0 to get connected drawing order.
  const edgeOrder = new Float32Array(numEdges * 2);
  const visited = new Set<number>();
  const queue: number[] = [0];
  const visitedVerts = new Set<number>([0]);
  let orderIdx = 0;

  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const { edgeIdx, other } of adjList[v]) {
      if (visited.has(edgeIdx)) continue;
      visited.add(edgeIdx);
      const norm = orderIdx / Math.max(1, numEdges - 1);
      edgeOrder[edgeIdx * 2] = norm;
      edgeOrder[edgeIdx * 2 + 1] = norm;
      orderIdx++;
      if (!visitedVerts.has(other)) {
        visitedVerts.add(other);
        queue.push(other);
      }
    }
  }

  edgesGeo.setAttribute('aEdgeOrder', new THREE.BufferAttribute(edgeOrder, 1));
  return { edgeGeometry: edgesGeo, edgeCount: numEdges };
}

// Wireframe drawing shader (inlined — small enough not to need separate files).
const WIRE_VERT = `
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
`;

const WIRE_FRAG = `
precision highp float;
uniform float uProgress;
uniform float uTime;
uniform vec3 uColor;
varying float vEdgeOrder;
varying vec3 vWorldPos;
void main() {
  if (uProgress < 0.005 || vEdgeOrder > uProgress) discard;
  // Drawing head glow — tight gaussian at the frontier.
  float headDist = uProgress - vEdgeOrder;
  float head = exp(-headDist * headDist * 300.0);
  // Shimmer for hand-drawn feel.
  float shimmer = 0.75 + 0.25 * sin(uTime * 2.5 + vWorldPos.x * 12.0 + vWorldPos.y * 9.0);
  vec3 col = uColor * shimmer * 1.1;
  col += vec3(1.0, 0.92, 1.15) * head * 1.8;
  gl_FragColor = vec4(col, 1.0);
}
`;

interface WireframeSolidProps {
  kind: SolidKindName;
  size: number;
  position: [number, number, number];
  /** 0-1 how much of the wireframe is drawn. */
  progress: number;
  /** 0-1 ghost mesh opacity. */
  ghostAlpha: number;
  time: number;
  ghostMaterial: THREE.ShaderMaterial;
  /** Unique rotation speed offset per solid. */
  rotationSeed: number;
}

function WireframeSolid({
  kind,
  size,
  position: pos,
  progress,
  ghostAlpha,
  time,
  ghostMaterial,
  rotationSeed,
}: WireframeSolidProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const solidGeo = useMemo(() => buildSolidGeometry(kind, size), [kind, size]);
  const { edgeGeometry, edgeCount: _edgeCount } = useMemo(
    () => buildEdgeData(solidGeo),
    [solidGeo],
  );

  const wireMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WIRE_VERT,
        fragmentShader: WIRE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#a78bfa') },
        },
      }),
    [],
  );

  useEffect(() => {
    return () => {
      solidGeo.dispose();
      edgeGeometry.dispose();
      wireMaterial.dispose();
    };
  }, [solidGeo, edgeGeometry, wireMaterial]);

  // Independent rotation per solid.
  useFrame((_, delta) => {
    wireMaterial.uniforms.uProgress.value = progress;
    wireMaterial.uniforms.uTime.value = time;
    if (groupRef.current) {
      const speed = 0.15 + rotationSeed * 0.12;
      groupRef.current.rotation.y += delta * speed;
      groupRef.current.rotation.x += delta * speed * 0.4;
    }
  });

  return (
    <group position={pos}>
      <group ref={groupRef}>
        {/* Ghost solid — fades in */}
        <mesh
          geometry={solidGeo}
          material={ghostMaterial}
          scale={ghostAlpha > 0.001 ? 1 : 0}
        />
        {/* Hand-drawn wireframe edges */}
        <lineSegments
          geometry={edgeGeometry}
          material={wireMaterial}
        />
      </group>
    </group>
  );
}

interface SolidsProps {
  controller: ControllerRef;
  data: StrokeData;
  /** Ref written to by Solids so StrokeRibbon can read a 0-1 dim factor. */
  strokeDimRef: React.MutableRefObject<number>;
}

function Solids({ controller, data, strokeDimRef }: SolidsProps) {
  const progressRef = useRef(0);
  const timeRef = useRef(0);
  const ghostAlphaRef = useRef(0);
  const [frameVals, setFrameVals] = useState({
    progress: 0,
    ghostAlpha: 0,
    time: 0,
  });

  // Shared iridescent material for ghost solids — very dim.
  const ghostMaterial = useIridescentMaterial({
    palette: 'cosine',
    paletteOffset: [0.55, 0.88, 1.22],
    intensity: 0.25,
    rimBoost: 0.6,
    fresnelPower: 2.5,
    alphaBase: 0.0,
  });

  useEffect(() => {
    ghostMaterial.transparent = true;
    ghostMaterial.depthWrite = false;
    ghostMaterial.blending = THREE.AdditiveBlending;
  }, [ghostMaterial]);

  useFrame((_, delta) => {
    const c = controller.current;
    const finalEdgeStart = data.phaseEdges[data.phaseEdges.length - 2] ?? 0.83;
    // 0 across earlier phases, ramps to 1 across the final phase span.
    const t = THREE.MathUtils.clamp(
      (c.reveal - finalEdgeStart) / Math.max(1e-4, 1 - finalEdgeStart),
      0,
      1,
    );

    // Ghost fades in quickly but stays very subtle.
    const targetGhost = Math.min(t * 2.0, 1.0) * 0.2;
    ghostAlphaRef.current +=
      (targetGhost - ghostAlphaRef.current) * (1 - Math.exp(-delta * 3));

    // Wireframe progress ramps after a brief delay.
    const wireT = THREE.MathUtils.clamp((t - 0.1) / 0.9, 0, 1);
    const targetProgress = wireT;
    progressRef.current +=
      (targetProgress - progressRef.current) * (1 - Math.exp(-delta * 2));

    timeRef.current += delta;

    ghostMaterial.uniforms.uTime.value += delta;
    ghostMaterial.uniforms.uMirage.value = 0.15 + 0.25 * ghostAlphaRef.current;

    // Write stroke dim factor — dims the 2D construction when solids are visible.
    const targetDim = 1.0 - t * 0.6;
    strokeDimRef.current +=
      (targetDim - strokeDimRef.current) * (1 - Math.exp(-delta * 3));

    setFrameVals({
      progress: progressRef.current,
      ghostAlpha: ghostAlphaRef.current,
      time: timeRef.current,
    });
  });

  // Pentagon layout — 5 solids evenly on a ring.
  const layout = useMemo(() => {
    return SOLID_KINDS.map((kind, i) => {
      const a = (i / SOLID_KINDS.length) * Math.PI * 2 - Math.PI / 2;
      const r = 2.4;
      return {
        kind,
        position: [r * Math.cos(a), r * Math.sin(a), 0.4] as [number, number, number],
      };
    });
  }, []);

  return (
    <group>
      {layout.map((s, i) => {
        // Stagger each solid's wireframe start slightly.
        const stagger = i * 0.08;
        const solidProgress = THREE.MathUtils.clamp(
          (frameVals.progress - stagger) / (1 - stagger),
          0,
          1,
        );
        return (
          <WireframeSolid
            key={s.kind}
            kind={s.kind}
            size={0.42}
            position={s.position}
            progress={solidProgress}
            ghostAlpha={frameVals.ghostAlpha}
            time={frameVals.time}
            ghostMaterial={ghostMaterial}
            rotationSeed={i}
          />
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Phase chips overlay (DOM, outside the canvas).
// ---------------------------------------------------------------------------

interface PhaseChipsProps {
  controller: ControllerRef;
  data: StrokeData;
}

function PhaseChips({ controller, data }: PhaseChipsProps) {
  // Re-render once per animation frame so the active-chip highlight tracks
  // the controller without needing a global store.
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setTick((n) => (n + 1) & 0xffff);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onClick = (idx: number) => {
    const c = controller.current;
    const target = data.phaseEdges[idx];
    if (target < c.reveal) {
      // Rewind to the start of the phase, then resume forward at base speed.
      const prevEdge = idx === 0 ? 0 : data.phaseEdges[idx - 1];
      c.reveal = prevEdge;
      c.target = 1;
      c.fast = false;
      c.holdT = 0;
    } else if (target > c.reveal) {
      c.target = target;
      c.fast = true;
    }
  };

  const active = controller.current.activePhase;

  return (
    <div className={styles.chipBar} role="tablist" aria-label="Sacred geometry phases">
      {PHASES.map((phase, i) => {
        const isActive = i === active;
        return (
          <button
            key={phase.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-pressed={isActive}
            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            onClick={() => onClick(i)}
          >
            <span className={styles.chipIndex}>{String(i + 1).padStart(2, '0')}</span>
            <span>{phase.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slider panel (DOM overlay)
// ---------------------------------------------------------------------------

interface SliderPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

function SliderPanel({ settings, onChange }: SliderPanelProps) {
  const [open, setOpen] = useState(false);

  const sliders: { key: keyof Settings; label: string; min: number; max: number; step: number }[] = [
    { key: 'speed', label: 'Speed', min: 0.25, max: 4, step: 0.25 },
    { key: 'bloom', label: 'Bloom', min: 0, max: 3, step: 0.05 },
    { key: 'glow', label: 'Glow', min: 0.3, max: 2.5, step: 0.05 },
  ];

  return (
    <div className={styles.sliderPanel}>
      <button
        type="button"
        className={styles.sliderToggle}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Hide settings' : 'Show settings'}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {open && (
        <div className={styles.sliderTray}>
          {sliders.map((s) => (
            <label key={s.key} className={styles.sliderRow}>
              <span className={styles.sliderLabel}>{s.label}</span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={settings[s.key]}
                onChange={(e) => onChange({ [s.key]: parseFloat(e.target.value) })}
                className={styles.sliderInput}
              />
              <span className={styles.sliderValue}>{settings[s.key].toFixed(2)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

function Geometria({ width }: ProjectComponentProps) {
  const reduceMotion = usePrefersReducedMotion();
  const data = useMemo(() => buildStrokeData(), []);
  const controller = useRef<ControllerState>(makeController());
  const pencilWorldRef = useRef(new THREE.Vector2(0, 0));
  const pencilStrengthRef = useRef(0);
  const strokeDimRef = useRef(1.0);

  // Settings state — React owns the values, ref mirrors for useFrame reads.
  const [settings, setSettingsState] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onSettingsChange = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Camera distance scales for narrow viewports so the figure stays framed.
  const cameraZ = width < 480 ? 9.5 : width < 768 ? 8.4 : 7.4;
  const dprMax = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2);

  // Initial conditions: start at reveal=0, target=1.
  useEffect(() => {
    controller.current = makeController();
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.canvasHost}>
        <Canvas
          orthographic={false}
          camera={{ position: [0, 0, cameraZ], fov: 45, near: 0.1, far: 100 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, dprMax]}
        >
          <color attach="background" args={['#050507']} />
          <StrokeRibbon
            data={data}
            controller={controller}
            pencilWorldRef={pencilWorldRef}
            pencilStrengthRef={pencilStrengthRef}
            reduceMotion={reduceMotion}
            settingsRef={settingsRef}
            strokeDimRef={strokeDimRef}
          />
          <PencilTip
            pencilWorldRef={pencilWorldRef}
            pencilStrengthRef={pencilStrengthRef}
          />
          <Solids controller={controller} data={data} strokeDimRef={strokeDimRef} />
          <EffectComposer>
            <Bloom
              intensity={settings.bloom}
              luminanceThreshold={0.18}
              luminanceSmoothing={0.6}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>
      <PhaseChips controller={controller} data={data} />
      <SliderPanel settings={settings} onChange={onSettingsChange} />
    </div>
  );
}

export default Geometria;
