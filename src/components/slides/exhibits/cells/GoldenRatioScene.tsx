import { useMemo } from 'react';
import * as THREE from 'three';
import { IridescentLine } from '../../../../lib/iridescent';
import { useExhibitMaterial } from '../useExhibitMaterial';
import type { SceneProps } from '../types';
import { ExhibitFrame } from './ExhibitFrame';

const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * Golden Spiral — nested golden-ratio squares with a smooth quarter-circle
 * spiral connecting them, approximating the logarithmic golden spiral
 * r(θ) = a · φ^(2θ/π).
 *
 * Arc i has centre C_i, radius r_i = φ^i, and sweeps π/2 CCW from θ_i.
 * The recurrence that keeps consecutive arcs endpoint-continuous:
 *   C_{i+1} = C_i + r_i · (1 − φ) · (cos(θ_i + π/2), sin(θ_i + π/2))
 *
 * Each arc's centre is a corner of its square, so the four square corners
 * fall out directly from the arc geometry — no separate rect-centre tracking.
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

  const { squareLines, spiralPoints } = useMemo(() => {
    // --- Arc centres via the endpoint-continuity recurrence -----------
    const THETA_0 = 0; // first arc: east → north CCW
    const arcCx: number[] = [];
    const arcCy: number[] = [];
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < iterations; i += 1) {
      arcCx.push(cx);
      arcCy.push(cy);
      const r = Math.pow(PHI, i);
      const nextTheta = THETA_0 + i * (Math.PI / 2) + Math.PI / 2;
      cx += r * (1 - PHI) * Math.cos(nextTheta);
      cy += r * (1 - PHI) * Math.sin(nextTheta);
    }

    // --- Tight bounding box from all square corners ------------------
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const expand = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    for (let i = 0; i < iterations; i += 1) {
      const r = Math.pow(PHI, i);
      const theta = THETA_0 + i * (Math.PI / 2);
      const acx = arcCx[i];
      const acy = arcCy[i];
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const cosT2 = Math.cos(theta + Math.PI / 2);
      const sinT2 = Math.sin(theta + Math.PI / 2);
      // All four corners of the square.
      expand(acx, acy);
      expand(acx + r * cosT, acy + r * sinT);
      expand(acx + r * cosT2, acy + r * sinT2);
      expand(acx + r * cosT + r * cosT2, acy + r * sinT + r * sinT2);
    }
    const ox = (minX + maxX) / 2;
    const oy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY);
    const fit = 2.6 / span;

    const v = (x: number, y: number) =>
      new THREE.Vector3((x - ox) * fit, (y - oy) * fit, 0);

    // --- Square outlines: one closed loop per square -----------------
    const squareLines: { points: THREE.Vector3[] }[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const r = Math.pow(PHI, i);
      const theta = THETA_0 + i * (Math.PI / 2);
      const acx = arcCx[i];
      const acy = arcCy[i];
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const cosT2 = Math.cos(theta + Math.PI / 2);
      const sinT2 = Math.sin(theta + Math.PI / 2);
      // A = arc centre (corner), B = arc start, D = arc end, C = opposite corner.
      const A = v(acx, acy);
      const B = v(acx + r * cosT, acy + r * sinT);
      const C = v(acx + r * cosT + r * cosT2, acy + r * sinT + r * sinT2);
      const D = v(acx + r * cosT2, acy + r * sinT2);
      squareLines.push({ points: [A, B, C, D, A] });
    }

    // --- Spiral: continuous polyline through all quarter-circle arcs --
    const spiralPoints: THREE.Vector3[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const r = Math.pow(PHI, i);
      const theta = THETA_0 + i * (Math.PI / 2);
      const acx = arcCx[i];
      const acy = arcCy[i];
      // Scale sample density with arc length so larger arcs stay smooth.
      const arcLen = (Math.PI / 2) * r * fit;
      const n = Math.max(8, Math.round(arcLen * 24));
      const endS = i === iterations - 1 ? n : n - 1; // avoid duplicate junction points
      for (let s = 0; s <= endS; s += 1) {
        const t = theta + (s / n) * (Math.PI / 2);
        spiralPoints.push(v(acx + Math.cos(t) * r, acy + Math.sin(t) * r));
      }
    }

    return { squareLines, spiralPoints };
  }, [iterations]);

  return (
    <ExhibitFrame>
      {squareLines.map((sq, i) => (
        <IridescentLine
          key={`sq-${i}`}
          points={sq.points}
          width={thickness * 0.35}
          radialSegments={8}
          material={material}
        />
      ))}
      {spiralPoints.length >= 2 && (
        <IridescentLine
          points={spiralPoints}
          width={thickness * 0.9}
          radialSegments={12}
          material={material}
        />
      )}
    </ExhibitFrame>
  );
}
