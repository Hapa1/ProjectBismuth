import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ProjectComponentProps } from '../../types/project';
import {
  IridescentSolid,
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
const HOLD_AT_END = 4; // seconds held on completed construction before looping

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
// Stroke ribbon
// ---------------------------------------------------------------------------

interface StrokeRibbonProps {
  data: StrokeData;
  controller: ControllerRef;
  pencilWorldRef: React.MutableRefObject<THREE.Vector2>;
  pencilStrengthRef: React.MutableRefObject<number>;
  reduceMotion: boolean;
}

function StrokeRibbon({
  data,
  controller,
  pencilWorldRef,
  pencilStrengthRef,
  reduceMotion,
}: StrokeRibbonProps) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute('aArc', new THREE.BufferAttribute(data.arcs, 1));
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
        uIntensity: { value: 1.4 },
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

    if (reduceMotion) {
      // Snap directly to target — no animation.
      c.reveal = c.target;
    } else {
      const speed = (c.fast ? FAST_MULT : 1) * BASE_SPEED;
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

      // Hold-at-end + loop.
      if (c.reveal >= 1 - 1e-4) {
        c.holdT += delta;
        if (c.holdT >= HOLD_AT_END) {
          c.holdT = 0;
          c.reveal = 0;
          c.target = 1;
          c.fast = false;
        }
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
// Platonic solids — fade in during the final phase.
// ---------------------------------------------------------------------------

const SOLID_KINDS = ['tetra', 'box', 'octa', 'dodeca', 'icosa'] as const;

interface SolidsProps {
  controller: ControllerRef;
  data: StrokeData;
}

function Solids({ controller, data }: SolidsProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const opacityRef = useRef(0);

  // Shared iridescent material so all five solids dedupe.
  const material = useIridescentMaterial({
    palette: 'cosine',
    paletteOffset: [0.55, 0.88, 1.22],
    intensity: 1.2,
    rimBoost: 1.8,
    fresnelPower: 2.5,
    alphaBase: 0.0,
  });

  useEffect(() => {
    material.transparent = true;
  }, [material]);

  useFrame((_, delta) => {
    const c = controller.current;
    const finalEdgeStart = data.phaseEdges[data.phaseEdges.length - 2] ?? 0.83;
    // 0 across earlier phases, ramps to 1 across the final phase span.
    const t = THREE.MathUtils.clamp(
      (c.reveal - finalEdgeStart) / Math.max(1e-4, 1 - finalEdgeStart),
      0,
      1,
    );
    opacityRef.current += (t - opacityRef.current) * (1 - Math.exp(-delta * 3));
    material.uniforms.uTime.value += delta;
    material.uniforms.uMirage.value = 0.6 + 0.4 * opacityRef.current;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18;
      groupRef.current.rotation.x = 0.2 + 0.05 * Math.sin(material.uniforms.uTime.value * 0.4);
      // We can't fade a ShaderMaterial without a uniform; scale instead.
      groupRef.current.scale.setScalar(0.001 + opacityRef.current);
    }
  });

  // Lay out 5 solids on a ring in the XY plane, slightly forward in z.
  const layout = useMemo(() => {
    return SOLID_KINDS.map((kind, i) => {
      const a = (i / SOLID_KINDS.length) * Math.PI * 2 - Math.PI / 2;
      const r = 1.6;
      return {
        kind,
        position: [r * Math.cos(a), r * Math.sin(a), 0.4] as [number, number, number],
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {layout.map((s) => (
        <IridescentSolid
          key={s.kind}
          kind={s.kind}
          size={0.42}
          position={s.position}
          material={material}
          rotation={[0.3, 0.6, 0]}
        />
      ))}
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
// Public component
// ---------------------------------------------------------------------------

function Geometria({ width, height }: ProjectComponentProps) {
  const reduceMotion = usePrefersReducedMotion();
  const data = useMemo(() => buildStrokeData(), []);
  const controller = useRef<ControllerState>(makeController());
  const pencilWorldRef = useRef(new THREE.Vector2(0, 0));
  const pencilStrengthRef = useRef(0);

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
          />
          <PencilTip
            pencilWorldRef={pencilWorldRef}
            pencilStrengthRef={pencilStrengthRef}
          />
          <Solids controller={controller} data={data} />
          <EffectComposer>
            <Bloom
              intensity={1.35}
              luminanceThreshold={0.18}
              luminanceSmoothing={0.6}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>
      <PhaseChips controller={controller} data={data} />
    </div>
  );
}

export default Geometria;
