import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { IridescentPolygon, usePrefersReducedMotion } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

const TAU = Math.PI * 2;

/** Returns positions for 1 center + 6 surrounding circles at radius r (Seed of Life). */
function seedPositions(r: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

/** Returns 12 additional positions that extend the Seed of Life into the Flower of Life. */
function fruitExtension(r: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    out.push([2 * r * Math.cos(a), 2 * r * Math.sin(a)]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    out.push([r * Math.sqrt(3) * Math.cos(a), r * Math.sqrt(3) * Math.sin(a)]);
  }
  return out;
}

/** The 13 Fruit of Life centers: origin + 6 at r + 6 at 2r (axis-aligned). */
function fruitCenters13(r: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  for (let i = 0; i < 12; i++) {
    const dist = i < 6 ? r : 2 * r;
    const a = (i % 6) / 6 * TAU;
    out.push([dist * Math.cos(a), dist * Math.sin(a)]);
  }
  return out;
}

/** Builds a BufferGeometry with all C(n,2) Metatron line segments. */
function buildMetatronGeometry(centers: [number, number][]): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      pts.push(centers[i][0], centers[i][1], 0, centers[j][0], centers[j][1], 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

// ---------------------------------------------------------------------------
// Metatron's Cube line overlay (stage 4+)
// ---------------------------------------------------------------------------

function MetatronLines({ centers, opacity }: { centers: [number, number][]; opacity: number }) {
  const geo = useMemo(() => buildMetatronGeometry(centers), [centers]);
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#a78bfa'),
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  useFrame(() => { mat.opacity = opacity * 0.2; });

  return <lineSegments geometry={geo} material={mat} />;
}

// ---------------------------------------------------------------------------
// Rotating wireframe platonic solid (stage 5)
// ---------------------------------------------------------------------------

type SolidKind = 'tetra' | 'box' | 'octa' | 'dodeca' | 'icosa';

function buildSolidGeo(kind: SolidKind, size: number): THREE.BufferGeometry {
  switch (kind) {
    case 'tetra':  return new THREE.TetrahedronGeometry(size);
    case 'box':    return new THREE.BoxGeometry(size, size, size);
    case 'octa':   return new THREE.OctahedronGeometry(size);
    case 'dodeca': return new THREE.DodecahedronGeometry(size);
    case 'icosa':  return new THREE.IcosahedronGeometry(size);
  }
}

function WireSolid({
  kind,
  size,
  position,
  opacity,
  rotSeed,
}: {
  kind: SolidKind;
  size: number;
  position: [number, number, number];
  opacity: number;
  rotSeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const solidGeo = useMemo(() => buildSolidGeo(kind, size), [kind, size]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(solidGeo, 1), [solidGeo]);
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#c4b5fd'),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(
    () => () => { solidGeo.dispose(); edgesGeo.dispose(); mat.dispose(); },
    [solidGeo, edgesGeo, mat],
  );

  useFrame((_, delta) => {
    mat.opacity = opacity * 0.85;
    if (!groupRef.current) return;
    const speed = 0.15 + rotSeed * 0.12;
    groupRef.current.rotation.y += delta * speed;
    groupRef.current.rotation.x += delta * speed * 0.4;
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        <lineSegments geometry={edgesGeo} material={mat} />
      </group>
    </group>
  );
}

const SOLID_KINDS: SolidKind[] = ['tetra', 'box', 'octa', 'dodeca', 'icosa'];

// ---------------------------------------------------------------------------
// Main exhibit component
//
// Stage 1 (circles=1): single circle
// Stage 2 (circles=2): Seed of Life — 7 interlocking circles
// Stage 3 (circles=3): Flower of Life — 19 circles
// Stage 4 (circles=4): Metatron's Cube — Flower of Life + all 78 connecting lines
// Stage 5 (circles=5): Platonic Solids — Metatron's Cube + 5 rotating wireframes
// ---------------------------------------------------------------------------

export function GeometriaScene({ params }: SceneProps) {
  const reduce = usePrefersReducedMotion();
  const rootRef = useRef<THREE.Group>(null);

  const stage = Math.round(params.circles ?? 2);
  const hue = params.hue ?? 0;
  const spin = params.spin ?? 0.06;

  const material = useExhibitMaterial({
    hueShift: hue,
    pulseTravel: 3.5,
    pointerRadius: 2.2,
    effect: 'streaks',
    intensity: stage >= 5 ? 0.7 : 1.3,
  });

  useFrame((_, delta) => {
    if (reduce || !rootRef.current) return;
    rootRef.current.rotation.z += delta * spin;
  });

  const r = 0.7;
  const positions: [number, number][] = stage >= 1 ? [[0, 0]] : [];
  if (stage >= 2) positions.push(...seedPositions(r).slice(1));
  if (stage >= 3) positions.push(...fruitExtension(r));

  const groupScale = stage <= 1 ? 1.3 : stage === 2 ? 0.58 : 0.38;
  const tubeWidth = stage <= 1 ? 0.028 : 0.016;

  const centers13 = useMemo(() => fruitCenters13(r), []);

  // Pentagon layout for the 5 platonic solids.
  const solidLayout = useMemo(
    () =>
      SOLID_KINDS.map((kind, i) => {
        const a = (i / SOLID_KINDS.length) * TAU - Math.PI / 2;
        const ring = 1.45;
        return { kind, position: [ring * Math.cos(a), ring * Math.sin(a), 0] as [number, number, number] };
      }),
    [],
  );

  return (
    <ExhibitFrame>
      {/* Circles (stages 1–4; hidden at stage 5 to let solids read clearly) */}
      {stage < 5 && (
        <group ref={rootRef} scale={[groupScale, groupScale, groupScale]}>
          {positions.map(([x, y], i) => (
            <IridescentPolygon
              key={i}
              sides={96}
              radius={r}
              outlineWidth={tubeWidth}
              radialSegments={16}
              material={material}
              position={[x, y, 0]}
            />
          ))}
          {/* Metatron's Cube lines — stage 4 */}
          {stage >= 4 && <MetatronLines centers={centers13} opacity={1} />}
        </group>
      )}

      {/* Stage 5: Metatron's Cube (scaled, dim) + platonic solids */}
      {stage >= 5 && (
        <>
          <group scale={[groupScale, groupScale, groupScale]}>
            <MetatronLines centers={centers13} opacity={0.35} />
          </group>
          {solidLayout.map((s, i) => (
            <WireSolid
              key={s.kind}
              kind={s.kind}
              size={0.3}
              position={s.position}
              opacity={1}
              rotSeed={i}
            />
          ))}
        </>
      )}
    </ExhibitFrame>
  );
}
