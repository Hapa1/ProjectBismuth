import * as THREE from 'three';

interface ClusterParams {
  levels: number;
  outerSize: number;
  risePerLevel: number;
  barWidth: number;
  barHeight: number;
  maxDepth: number;
  seed: number;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash2(x: number, y: number, seed: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
}

function smoothNoise2(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x1, y0, seed);
  const n01 = hash2(x0, y1, seed);
  const n11 = hash2(x1, y1, seed);
  const nx0 = THREE.MathUtils.lerp(n00, n10, sx);
  const nx1 = THREE.MathUtils.lerp(n01, n11, sx);
  return THREE.MathUtils.lerp(nx0, nx1, sy);
}

function fbm2(x: number, y: number, seed: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let octave = 0; octave < 4; octave++) {
    value += smoothNoise2(x * frequency, y * frequency, seed + octave * 17.3) * amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

function addBar(
  group: THREE.Group,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth));
  mesh.position.set(x, y, z);
  group.add(mesh);
}

function addRing(group: THREE.Group, size: number, y: number, barWidth: number, barHeight: number, seed: number, level: number): void {
  const halfInner = size / 2 - barWidth / 2;
  const baseLen = size - barWidth;
  const gap = THREE.MathUtils.clamp(size * (0.16 + fbm2(level * 0.23, seed, seed) * 0.14), barWidth * 1.2, size * 0.38);
  const openingSide = (level + Math.floor(seed * 3.1)) % 4;
  const secondaryGapSide = (openingSide + 1) % 4;
  const driftX = (fbm2(level * 0.17, seed * 0.13, seed + 3) - 0.5) * size * 0.06;
  const driftZ = (fbm2(seed * 0.11, level * 0.17, seed + 7) - 0.5) * size * 0.06;

  for (let side = 0; side < 4; side++) {
    const isOpen = side === openingSide;
    const isSecondaryOpen = side === secondaryGapSide;
    const reduction = isOpen ? gap : isSecondaryOpen ? gap * 0.38 : gap * 0.16;
    const length = Math.max(baseLen - reduction, barWidth * 1.2);
    const shift = isOpen ? gap * 0.25 : isSecondaryOpen ? gap * 0.08 : 0;

    if (side === 0) {
      addBar(group, length, barHeight, barWidth, driftX - shift * 0.5, y, driftZ + halfInner);
    } else if (side === 1) {
      addBar(group, barWidth, barHeight, length, driftX + halfInner, y, driftZ + shift * 0.5);
    } else if (side === 2) {
      addBar(group, length, barHeight, barWidth, driftX + shift * 0.5, y, driftZ - halfInner);
    } else {
      addBar(group, barWidth, barHeight, length, driftX - halfInner, y, driftZ - shift * 0.5);
    }
  }

  const cornerChance = fbm2(level * 0.31, seed * 0.09, seed + 23);
  if (cornerChance > 0.52) {
    const pillarHeight = barHeight * (1.4 + cornerChance * 1.6);
    const pillarSize = barWidth * (0.9 + cornerChance * 0.45);
    const cornerOffset = size / 2 - pillarSize * 0.65;
    const cornerIndex = Math.floor(fbm2(seed + 8, level * 0.41, seed + 41) * 4) % 4;
    const signs: Array<[number, number]> = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    const [signX, signZ] = signs[cornerIndex];
    addBar(
      group,
      pillarSize,
      pillarHeight,
      pillarSize,
      driftX + signX * cornerOffset,
      y + pillarHeight * 0.35,
      driftZ + signZ * cornerOffset,
    );
  }
}

function buildTower(levels: number, outerSize: number, risePerLevel: number, barWidth: number, barHeight: number, seed: number): THREE.Group {
  const group = new THREE.Group();
  const shrinkPerLevel = outerSize / (levels + 2);

  for (let level = 0; level < levels; level++) {
    const taperNoise = fbm2(level * 0.09, seed * 0.17, seed + 13);
    const size = outerSize - level * shrinkPerLevel * (0.88 + taperNoise * 0.34);
    if (size <= barWidth * 2.5) {
      break;
    }

    const y = level * risePerLevel * (0.9 + fbm2(level * 0.15, seed * 0.07, seed + 19) * 0.3);
    addRing(group, size, y, barWidth, barHeight, seed, level);
  }

  return group;
}

function buildCluster(params: ClusterParams, depth: number, seed: number): THREE.Group {
  const group = new THREE.Group();
  const tower = buildTower(
    params.levels,
    params.outerSize,
    params.risePerLevel,
    params.barWidth,
    params.barHeight,
    seed,
  );
  group.add(tower);

  if (depth >= params.maxDepth) {
    return group;
  }

  const childLevels = Math.max(4, Math.floor(params.levels * (0.45 + fbm2(seed, depth, seed + 29) * 0.15)));
  const childSize = params.outerSize * (0.36 + fbm2(seed + 2, depth * 0.2, seed + 31) * 0.14);
  const childRise = params.risePerLevel * (0.88 + fbm2(seed + 3, depth * 0.18, seed + 37) * 0.28);
  const childBarWidth = params.barWidth * (0.82 + fbm2(seed + 5, depth * 0.14, seed + 43) * 0.22);
  const childBarHeight = params.barHeight * (0.86 + fbm2(seed + 7, depth * 0.16, seed + 47) * 0.22);
  const shoulderStart = Math.floor(params.levels * 0.34);
  const shoulderSpan = Math.max(3, Math.floor(params.levels * 0.26));

  for (let corner = 0; corner < 4; corner++) {
    const spawnNoise = fbm2(seed + corner * 1.7, depth * 0.3, seed + 53);
    if (spawnNoise < 0.3) {
      continue;
    }

    const angle = Math.PI * 0.25 + corner * (Math.PI / 2);
    const attachLevel = shoulderStart + Math.floor(spawnNoise * shoulderSpan);
    const attachY = attachLevel * params.risePerLevel;
    const radius = params.outerSize * (0.24 + spawnNoise * 0.2);
    const child = buildCluster(
      {
        levels: childLevels,
        outerSize: childSize,
        risePerLevel: childRise,
        barWidth: childBarWidth,
        barHeight: childBarHeight,
        maxDepth: params.maxDepth,
        seed: seed + corner * 13.1,
      },
      depth + 1,
      seed + corner * 13.1,
    );

    child.position.set(
      Math.cos(angle) * radius + (fbm2(corner, seed, seed + 59) - 0.5) * childSize * 0.35,
      attachY + (spawnNoise - 0.5) * params.risePerLevel * 1.8,
      Math.sin(angle) * radius + (fbm2(seed, corner, seed + 61) - 0.5) * childSize * 0.35,
    );
    child.rotation.y = corner * (Math.PI / 2) + fbm2(corner * 0.2, seed, seed + 67) * 0.45;
    group.add(child);
  }

  return group;
}

export function buildBismuth(levels: number): THREE.Group {
  const root = buildCluster(
    {
      levels,
      outerSize: 2.35,
      risePerLevel: 0.18,
      barWidth: 0.12,
      barHeight: 0.12,
      maxDepth: 2,
      seed: 4.2,
    },
    0,
    4.2,
  );

  root.rotation.y = Math.PI * 0.25;
  return root;
}
