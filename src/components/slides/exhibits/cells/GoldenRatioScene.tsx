import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { IridescentLine } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

const PHI = (1 + Math.sqrt(5)) / 2;

interface ArcDef {
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
}

interface RectDef {
  cx: number;
  cy: number;
  size: number;
}

/**
 * Golden Ratio — nested φ-rectangles with a stepped golden spiral built
 * from a chain of small rotated boxes (matches the bismuth/blocky aesthetic).
 *
 * Construction:
 *  - Place a unit square, rotate 90° each step, scale by φ.
 *  - Spiral arcs are quarter-circles centered on the corner opposite to the
 *    next square's direction, with radius equal to the square's side.
 *  - Sample the arcs and place flat box meshes at each sample, oriented to
 *    the local tangent. Boxes share one geometry + one material.
 */
export function GoldenRatioScene({ params }: SceneProps) {
  const iterations = Math.max(2, Math.round(params.iterations ?? 7));
  const thickness = params.thickness ?? 0.03;
  const hue = params.hue ?? 0;

  const material = useExhibitMaterial({
    hueShift: hue,
    pulseTravel: 4.5,
    pointerRadius: 2.4,
  });

  const { rects, boxes } = useMemo(() => {
    const rectDefs: RectDef[] = [];
    const arcDefs: ArcDef[] = [];

    let size = 1;
    let cx = 0;
    let cy = 0;
    const dirs: Array<[number, number]> = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];

    for (let i = 0; i < iterations; i += 1) {
      const dir = dirs[i % 4];
      rectDefs.push({ cx, cy, size });

      arcDefs.push({
        cx: cx - (dir[0] * size) / 2,
        cy: cy - (dir[1] * size) / 2,
        radius: size,
        startAngle: (i % 4) * (Math.PI / 2) + Math.PI,
      });

      const next = size * PHI;
      cx += (dir[0] * (size + next)) / 2;
      cy += (dir[1] * (size + next)) / 2;
      size = next;
    }

    // Tight bbox including arc extents.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of rectDefs) {
      minX = Math.min(minX, r.cx - r.size / 2);
      minY = Math.min(minY, r.cy - r.size / 2);
      maxX = Math.max(maxX, r.cx + r.size / 2);
      maxY = Math.max(maxY, r.cy + r.size / 2);
    }
    for (const a of arcDefs) {
      const samples = 8;
      for (let s = 0; s <= samples; s += 1) {
        const t = a.startAngle + (s / samples) * (Math.PI / 2);
        const x = a.cx + Math.cos(t) * a.radius;
        const y = a.cy + Math.sin(t) * a.radius;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    const ox = (minX + maxX) / 2;
    const oy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY);
    const fit = 2.6 / span;

    const rects: { points: THREE.Vector3[] }[] = rectDefs.map((r) => {
      const half = r.size / 2;
      const x = (r.cx - ox) * fit;
      const y = (r.cy - oy) * fit;
      const h = half * fit;
      return {
        points: [
          new THREE.Vector3(x - h, y - h, 0),
          new THREE.Vector3(x + h, y - h, 0),
          new THREE.Vector3(x + h, y + h, 0),
          new THREE.Vector3(x - h, y + h, 0),
          new THREE.Vector3(x - h, y - h, 0),
        ],
      };
    });

    // Boxes along the spiral. Step count scales with each arc's radius so
    // small inner arcs still get a few boxes and the tail gets a long chain.
    type BoxInst = {
      pos: [number, number, number];
      rot: [number, number, number];
      size: [number, number, number];
    };
    const boxes: BoxInst[] = [];
    const boxThickness = thickness * fit * 0.9;
    arcDefs.forEach((a) => {
      const arcLen = (Math.PI / 2) * a.radius * fit;
      const stepLen = boxThickness * 1.4;
      const n = Math.max(4, Math.round(arcLen / stepLen));
      for (let s = 0; s < n; s += 1) {
        const t = a.startAngle + ((s + 0.5) / n) * (Math.PI / 2);
        const x = (a.cx + Math.cos(t) * a.radius - ox) * fit;
        const y = (a.cy + Math.sin(t) * a.radius - oy) * fit;
        // Tangent direction = perpendicular to radial, sweeping CCW.
        const tangent = t + Math.PI / 2;
        const segLen = (Math.PI / 2) * a.radius * fit / n + boxThickness * 0.4;
        boxes.push({
          pos: [x, y, 0],
          rot: [0, 0, tangent],
          size: [segLen, boxThickness, boxThickness],
        });
      }
    });

    return { rects, boxes };
  }, [iterations, thickness]);

  // One shared box geometry — meshes are scaled per-instance.
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => boxGeometry.dispose(), [boxGeometry]);

  return (
    <ExhibitFrame>
      {rects.map((r, i) => (
        <IridescentLine
          key={i}
          points={r.points}
          width={thickness * 0.45}
          radialSegments={10}
          material={material}
        />
      ))}
      {boxes.map((b, i) => (
        <mesh
          key={i}
          geometry={boxGeometry}
          material={material}
          position={b.pos}
          rotation={b.rot}
          scale={b.size}
        />
      ))}
    </ExhibitFrame>
  );
}
