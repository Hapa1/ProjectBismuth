import { useCallback, useEffect, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './GeometryBeneath.module.css';

type Mode = 'branching' | 'spiral' | 'tiling' | 'mandelbrot';

// ---------------------------------------------------------------------------
// Cosine-palette gradient presets: color(t) = a + b * cos(2π(c*t + d))
// Each channel (R, G, B) has its own [a, b, c, d] tuple.
// ---------------------------------------------------------------------------
interface CosineCoeffs {
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
  d: [number, number, number];
}

interface GradientPreset {
  label: string;
  coeffs: CosineCoeffs;
}

const GRADIENT_PRESETS: Record<string, GradientPreset> = {
  iridescent: {
    label: 'Iridescent',
    coeffs: {
      a: [0.62, 0.54, 0.78],
      b: [0.28, 0.22, 0.18],
      c: [0.72, 0.72, 0.72],
      d: [0.00, 0.35, 0.58],
    },
  },
  ember: {
    label: 'Ember',
    coeffs: {
      a: [0.70, 0.30, 0.20],
      b: [0.30, 0.25, 0.15],
      c: [0.80, 0.80, 0.50],
      d: [0.00, 0.15, 0.20],
    },
  },
  aurora: {
    label: 'Aurora',
    coeffs: {
      a: [0.30, 0.60, 0.55],
      b: [0.25, 0.30, 0.35],
      c: [0.90, 0.70, 0.80],
      d: [0.65, 0.00, 0.30],
    },
  },
  sakura: {
    label: 'Sakura',
    coeffs: {
      a: [0.75, 0.48, 0.58],
      b: [0.22, 0.18, 0.20],
      c: [0.60, 0.60, 0.60],
      d: [0.00, 0.50, 0.35],
    },
  },
  ocean: {
    label: 'Ocean',
    coeffs: {
      a: [0.22, 0.46, 0.70],
      b: [0.18, 0.28, 0.22],
      c: [0.75, 0.75, 0.75],
      d: [0.50, 0.20, 0.00],
    },
  },
  neon: {
    label: 'Neon',
    coeffs: {
      a: [0.50, 0.50, 0.50],
      b: [0.50, 0.50, 0.50],
      c: [1.00, 1.00, 1.00],
      d: [0.00, 0.33, 0.67],
    },
  },
  gold: {
    label: 'Gold',
    coeffs: {
      a: [0.72, 0.58, 0.30],
      b: [0.24, 0.20, 0.15],
      c: [0.55, 0.55, 0.40],
      d: [0.00, 0.10, 0.30],
    },
  },
};

const GRADIENT_KEYS = Object.keys(GRADIENT_PRESETS);

function randomCoeffs(): CosineCoeffs {
  const r = () => Math.random();
  return {
    a: [0.35 + r() * 0.45, 0.35 + r() * 0.45, 0.35 + r() * 0.45],
    b: [0.15 + r() * 0.40, 0.15 + r() * 0.40, 0.15 + r() * 0.40],
    c: [0.50 + r() * 0.60, 0.50 + r() * 0.60, 0.50 + r() * 0.60],
    d: [r(), r(), r()],
  };
}

interface BranchingControls {
  depth: number;
  angleDeg: number;
  ratio: number;
  branches: number;
  jitter: number;
  seed: number;
}

interface SpiralControls {
  count: number;
  angleDeg: number;
  scale: number;
  dotSize: number;
}

interface TilingControls {
  cellSize: number;
  jitter: number;
  edgeAlpha: number;
  fillBrightness: number;
  seed: number;
}

interface MandelbrotControls {
  centerX: number;
  centerY: number;
  zoom: number;
  maxIter: number;
  escapeR: number;
  contrast: number;
  autoZoom: boolean;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

interface Controls {
  mode: Mode;
  iridescent: boolean;
  gradient: string;
  gradientCoeffs: CosineCoeffs;
  branching: BranchingControls;
  spiral: SpiralControls;
  tiling: TilingControls;
  mandelbrot: MandelbrotControls;
}

const DEFAULTS: Controls = {
  mode: 'tiling',
  iridescent: true,
  gradient: 'iridescent',
  gradientCoeffs: GRADIENT_PRESETS.iridescent.coeffs,
  branching: {
    depth: 8,
    angleDeg: 24,
    ratio: 0.72,
    branches: 2,
    jitter: 0.15,
    seed: 1,
  },
  spiral: {
    count: 800,
    angleDeg: 137.5,
    scale: 6,
    dotSize: 3,
  },
  tiling: {
    cellSize: 36,
    jitter: 0.08,
    edgeAlpha: 0.85,
    fillBrightness: 14,
    seed: 1,
  },
  mandelbrot: {
    centerX: -0.7,
    centerY: 0,
    zoom: 1,
    maxIter: 180,
    escapeR: 4,
    contrast: 1,
    autoZoom: false,
    targetX: -0.743643887037151,
    targetY: 0.13182590420533,
    targetZoom: 8000,
  },
};

const TAGLINES: Record<Mode, string> = {
  branching: 'Repetition across scale — a small branch looks like the whole tree.',
  spiral: 'Growth and proportion — slide the angle to see why nature settled on 137.5°.',
  tiling: 'Symmetry and tiling — honeycombs, dried mud, and cells use the same packing.',
  mandelbrot: 'Self-similarity from one rule — z ↦ z² + c, repeated forever.',
};

const SEGMENT_CAP = 60_000;

// ---------------------------------------------------------------------------
// Offscreen glow buffer — draw halo strokes here, composite blurred in one
// GPU-accelerated drawImage call instead of per-segment shadowBlur.
// ---------------------------------------------------------------------------
let _glowCanvas: HTMLCanvasElement | null = null;
let _glowCtx: CanvasRenderingContext2D | null = null;

function getGlowBuffer(w: number, h: number): CanvasRenderingContext2D {
  if (!_glowCanvas || _glowCanvas.width !== w || _glowCanvas.height !== h) {
    _glowCanvas = document.createElement('canvas');
    _glowCanvas.width = w;
    _glowCanvas.height = h;
    _glowCtx = _glowCanvas.getContext('2d')!;
  } else {
    _glowCtx!.clearRect(0, 0, w, h);
  }
  return _glowCtx!;
}

function compositeGlow(
  ctx: CanvasRenderingContext2D,
  blurPx: number = 12,
) {
  if (!_glowCanvas) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(_glowCanvas, 0, 0);
  ctx.filter = 'none';
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Cosine-palette color — driven by the active gradient preset coefficients
// ---------------------------------------------------------------------------

function paletteColor(
  px: number,
  py: number,
  w: number,
  h: number,
  co: CosineCoeffs,
): [number, number, number] {
  const nx = px / w;
  const ny = py / h;
  const t =
    nx * 0.55 +
    ny * 0.45 +
    Math.sin(nx * 3.1) * 0.08 +
    Math.sin(ny * 2.7) * 0.06;

  const TAU = Math.PI * 2;
  const r = co.a[0] + co.b[0] * Math.cos(TAU * (co.c[0] * t + co.d[0]));
  const g = co.a[1] + co.b[1] * Math.cos(TAU * (co.c[1] * t + co.d[1]));
  const b = co.a[2] + co.b[2] * Math.cos(TAU * (co.c[2] * t + co.d[2]));

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ];
}

function mulberry32(a: number): () => number {
  let t = a >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

interface BranchStats {
  segments: number;
  capped: boolean;
}

function drawBranching(
  p: P5,
  width: number,
  height: number,
  c: BranchingControls,
  iridescent: boolean,
  coeffs: CosineCoeffs,
): BranchStats {
  p.background(8, 9, 12);
  const stats: BranchStats = { segments: 0, capped: false };
  const rand = mulberry32(c.seed);
  const halfAngle = (c.angleDeg * Math.PI) / 180;
  const initialLength = Math.min(width, height) * 0.32;
  const ctx = (p.drawingContext as CanvasRenderingContext2D);

  // Collect segments first, then draw in two passes (halo + core) for glow.
  const segments: Array<{
    x1: number; y1: number; x2: number; y2: number;
    sw: number; r: number; g: number; b: number;
  }> = [];

  function recur(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
  ) {
    if (stats.capped) return;
    if (depth <= 0 || length < 0.6) return;
    if (stats.segments >= SEGMENT_CAP) {
      stats.capped = true;
      return;
    }
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const sw = Math.max(0.4, depth * 0.55);
    let sr: number, sg: number, sb: number;
    if (iridescent) {
      const mx = (x + x2) * 0.5;
      const my = (y + y2) * 0.5;
      [sr, sg, sb] = paletteColor(mx, my, width, height, coeffs);
    } else {
      sr = 232; sg = 234; sb = 240;
    }
    segments.push({ x1: x, y1: y, x2, y2, sw, r: sr, g: sg, b: sb });
    stats.segments++;

    const n = c.branches;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const base = -halfAngle + t * 2 * halfAngle;
      const jitter = (rand() - 0.5) * 2 * c.jitter * halfAngle;
      recur(x2, y2, angle + base + jitter, length * c.ratio, depth - 1);
    }
  }

  const startX = width / 2;
  const startY = height - height * 0.06;
  recur(startX, startY, -Math.PI / 2, initialLength, c.depth);

  if (iridescent) {
    // Pass 1: halo strokes → offscreen buffer, composite blurred in one call
    const gctx = getGlowBuffer(width, height);
    gctx.globalCompositeOperation = 'lighter';
    gctx.lineCap = 'round';
    for (const seg of segments) {
      gctx.strokeStyle = `rgba(${seg.r | 0},${seg.g | 0},${seg.b | 0},0.35)`;
      gctx.lineWidth = seg.sw * 3;
      gctx.beginPath();
      gctx.moveTo(seg.x1, seg.y1);
      gctx.lineTo(seg.x2, seg.y2);
      gctx.stroke();
    }
    compositeGlow(ctx, 14);

    // Pass 2: bright narrow core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const seg of segments) {
      ctx.strokeStyle = `rgba(${seg.r | 0},${seg.g | 0},${seg.b | 0},0.9)`;
      ctx.lineWidth = seg.sw;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    for (const seg of segments) {
      p.stroke(seg.r, seg.g, seg.b, 235);
      p.strokeWeight(seg.sw);
      p.line(seg.x1, seg.y1, seg.x2, seg.y2);
    }
  }

  return stats;
}

function drawSpiral(p: P5, width: number, height: number, c: SpiralControls, iridescent: boolean, coeffs: CosineCoeffs) {
  p.background(8, 9, 12);
  const cx = width / 2;
  const cy = height / 2;
  const radians = (c.angleDeg * Math.PI) / 180;
  const maxR = Math.min(width, height) * 0.46;
  let maxNeeded = 0;
  for (let i = 0; i < c.count; i++) {
    const r = c.scale * Math.sqrt(i);
    if (r > maxNeeded) maxNeeded = r;
  }
  const fit = maxNeeded > maxR ? maxR / maxNeeded : 1;

  if (iridescent) {
    const ctx = (p.drawingContext as CanvasRenderingContext2D);

    // Pass 1: halo → offscreen buffer, composite blurred in one call
    const gctx = getGlowBuffer(width, height);
    gctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < c.count; i++) {
      const r = c.scale * Math.sqrt(i) * fit;
      const a = i * radians;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const [cr, cg, cb] = paletteColor(x, y, width, height, coeffs);
      gctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},0.4)`;
      gctx.beginPath();
      gctx.arc(x, y, c.dotSize * 1.5, 0, Math.PI * 2);
      gctx.fill();
    }
    compositeGlow(ctx, 10);

    // Pass 2: bright core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < c.count; i++) {
      const r = c.scale * Math.sqrt(i) * fit;
      const a = i * radians;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const [cr, cg, cb] = paletteColor(x, y, width, height, coeffs);
      ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},0.95)`;
      ctx.beginPath();
      ctx.arc(x, y, c.dotSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    p.noStroke();
    for (let i = 0; i < c.count; i++) {
      const r = c.scale * Math.sqrt(i) * fit;
      const a = i * radians;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      p.fill(232, 234, 240, 235);
      p.circle(x, y, c.dotSize);
    }
  }
}

function drawTiling(p: P5, width: number, height: number, c: TilingControls, iridescent: boolean, coeffs: CosineCoeffs) {
  const fillVal = Math.max(0, Math.min(60, c.fillBrightness));
  p.background(8, 9, 12);

  const r = Math.max(8, c.cellSize);
  const w = Math.sqrt(3) * r;
  const h = 1.5 * r;

  const rand = mulberry32(c.seed);
  const jitterCache = new Map<string, number>();
  function jitterFor(key: string): number {
    let v = jitterCache.get(key);
    if (v === undefined) {
      v = rand();
      jitterCache.set(key, v);
    }
    return v;
  }

  const cols = Math.ceil(width / w) + 2;
  const rows = Math.ceil(height / h) + 2;

  // Collect hex data so we can draw glow in two passes
  const hexes: Array<{
    cx: number; cy: number;
    verts: Array<[number, number]>;
    er: number; eg: number; eb: number;
  }> = [];

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * w + (row % 2 === 0 ? 0 : w / 2);
      const cy = row * h;
      const verts: Array<[number, number]> = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 2;
        const j1 = jitterFor(`${col},${row},${k},x`) - 0.5;
        const j2 = jitterFor(`${col},${row},${k},y`) - 0.5;
        const dx = j1 * c.jitter * r;
        const dy = j2 * c.jitter * r;
        verts.push([cx + Math.cos(a) * r + dx, cy + Math.sin(a) * r + dy]);
      }

      let er: number, eg: number, eb: number;
      if (iridescent) {
        [er, eg, eb] = paletteColor(cx, cy, width, height, coeffs);
      } else {
        er = 167; eg = 139; eb = 250;
      }
      hexes.push({ cx, cy, verts, er, eg, eb });
    }
  }

  // Draw fills
  p.noStroke();
  for (const hex of hexes) {
    p.fill(fillVal, fillVal, fillVal + 4);
    p.beginShape();
    for (const [vx, vy] of hex.verts) p.vertex(vx, vy);
    p.endShape(p.CLOSE);
  }

  if (iridescent) {
    const ctx = (p.drawingContext as CanvasRenderingContext2D);
    const alpha = Math.round(c.edgeAlpha * 255);

    // Pass 1: glow edges → offscreen buffer, composite blurred in one call
    const gctx = getGlowBuffer(width, height);
    gctx.globalCompositeOperation = 'lighter';
    for (const hex of hexes) {
      gctx.strokeStyle = `rgba(${hex.er | 0},${hex.eg | 0},${hex.eb | 0},${(alpha / 255 * 0.45).toFixed(3)})`;
      gctx.lineWidth = 3;
      gctx.beginPath();
      for (let k = 0; k < hex.verts.length; k++) {
        const [vx, vy] = hex.verts[k];
        if (k === 0) gctx.moveTo(vx, vy);
        else gctx.lineTo(vx, vy);
      }
      gctx.closePath();
      gctx.stroke();
    }
    compositeGlow(ctx, 12);

    // Pass 2: bright narrow core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const hex of hexes) {
      ctx.strokeStyle = `rgba(${hex.er | 0},${hex.eg | 0},${hex.eb | 0},${(alpha / 255 * 0.85).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < hex.verts.length; k++) {
        const [vx, vy] = hex.verts[k];
        if (k === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  } else {
    p.noFill();
    p.stroke(167, 139, 250, Math.round(c.edgeAlpha * 255));
    p.strokeWeight(1);
    for (const hex of hexes) {
      p.beginShape();
      for (const [vx, vy] of hex.verts) p.vertex(vx, vy);
      p.endShape(p.CLOSE);
    }
  }
}

// ---------------------------------------------------------------------------
// Mandelbrot — CPU escape-time renderer drawn into an offscreen ImageData,
// then blitted via drawImage. Uses adaptive sampling on small viewports.
// ---------------------------------------------------------------------------
let _mbCanvas: HTMLCanvasElement | null = null;
let _mbCtx: CanvasRenderingContext2D | null = null;

function getMandelbrotBuffer(w: number, h: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  if (!_mbCanvas || _mbCanvas.width !== w || _mbCanvas.height !== h) {
    _mbCanvas = document.createElement('canvas');
    _mbCanvas.width = w;
    _mbCanvas.height = h;
    _mbCtx = _mbCanvas.getContext('2d')!;
  }
  return { canvas: _mbCanvas, ctx: _mbCtx! };
}

function drawMandelbrot(
  p: P5,
  width: number,
  height: number,
  c: MandelbrotControls,
  iridescent: boolean,
  coeffs: CosineCoeffs,
  fast: boolean,
) {
  p.background(8, 9, 12);

  // Resolution cap: low during animation/interaction, high when idle.
  const maxEdge = Math.max(width, height);
  const cap = fast ? 820 : 1600;
  const scale = maxEdge > cap ? cap / maxEdge : 1;
  const rw = Math.max(2, Math.floor(width * scale));
  const rh = Math.max(2, Math.floor(height * scale));

  const { canvas: buf, ctx: bctx } = getMandelbrotBuffer(rw, rh);
  const img = bctx.createImageData(rw, rh);
  const data = img.data;

  // Map pixel space to complex plane: keep aspect, base view ~3.5 wide at zoom=1.
  const baseSpan = 3.5;
  const aspect = rw / rh;
  const spanX = baseSpan / c.zoom;
  const spanY = spanX / aspect;
  const x0 = c.centerX - spanX / 2;
  const y0 = c.centerY - spanY / 2;

  const iterBoost = fast ? 0.15 : 0.5;
  const maxIter = Math.max(
    20,
    Math.floor(c.maxIter * (1 + iterBoost * Math.log2(Math.max(1, c.zoom)))),
  );
  const escapeSq = Math.max(2, c.escapeR) * Math.max(2, c.escapeR);
  const logEscape = Math.log(Math.max(2, c.escapeR));
  const contrast = Math.max(0.2, c.contrast);

  // Faster pixel writes via 32-bit view (little-endian: 0xAABBGGRR).
  const buf32 = new Uint32Array(data.buffer);
  const interiorColor = (255 << 24) | (12 << 16) | (7 << 8) | 6;

  // 1D cosine palette: color depends purely on smooth iteration count, so
  // bands follow the fractal instead of being smeared across the screen.
  const TAU = Math.PI * 2;
  const palette1D = (t: number): number => {
    const r = coeffs.a[0] + coeffs.b[0] * Math.cos(TAU * (coeffs.c[0] * t + coeffs.d[0]));
    const g = coeffs.a[1] + coeffs.b[1] * Math.cos(TAU * (coeffs.c[1] * t + coeffs.d[1]));
    const b = coeffs.a[2] + coeffs.b[2] * Math.cos(TAU * (coeffs.c[2] * t + coeffs.d[2]));
    const R = Math.round(Math.max(0, Math.min(1, r)) * 255);
    const G = Math.round(Math.max(0, Math.min(1, g)) * 255);
    const B = Math.round(Math.max(0, Math.min(1, b)) * 255);
    return (255 << 24) | (B << 16) | (G << 8) | R;
  };

  // Precompute palette LUT (1024 entries) — avoids cosine cost per pixel.
  const LUT_SIZE = 1024;
  const lut = new Uint32Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) lut[i] = palette1D(i / LUT_SIZE);

  for (let py = 0; py < rh; py++) {
    const ci = y0 + (py / rh) * spanY;
    for (let px = 0; px < rw; px++) {
      const cr = x0 + (px / rw) * spanX;
      const idx = py * rw + px;

      // Fast interior tests: main cardioid and period-2 bulb. Points inside
      // these regions are guaranteed to be in the set, so we skip iteration.
      const xm = cr - 0.25;
      const q = xm * xm + ci * ci;
      if (q * (q + xm) <= 0.25 * ci * ci) {
        buf32[idx] = interiorColor;
        continue;
      }
      const xp1 = cr + 1;
      if (xp1 * xp1 + ci * ci <= 0.0625) {
        buf32[idx] = interiorColor;
        continue;
      }

      let zr = 0;
      let zi = 0;
      let iter = 0;
      let zr2 = 0;
      let zi2 = 0;
      while (iter < maxIter && zr2 + zi2 <= escapeSq) {
        zi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
        zr2 = zr * zr;
        zi2 = zi * zi;
        iter++;
      }
      if (iter >= maxIter) {
        buf32[idx] = interiorColor;
      } else {
        // Smooth iteration count (continuous coloring).
        const log_zn = Math.log(zr2 + zi2) * 0.5;
        const nu = Math.log(log_zn / logEscape) / Math.LN2;
        const smooth = Math.max(0, iter + 1 - nu);
        // Log-spaced mapping keeps bands evenly spaced even at deep zoom and
        // avoids the harsh wrap that produced neon noise. The cosine palette
        // already oscillates, so we just feed it a smooth monotonic value.
        const t = (Math.log(1 + smooth) / Math.log(1 + maxIter)) * contrast;
        const tClamped = Math.max(0, Math.min(0.999, t));
        if (iridescent) {
          buf32[idx] = lut[(tClamped * LUT_SIZE) | 0];
        } else {
          const v = Math.round(255 * Math.pow(tClamped, 0.7));
          buf32[idx] = (255 << 24) | (v << 16) | (v << 8) | v;
        }
      }
    }
  }
  bctx.putImageData(img, 0, 0);

  const ctx = p.drawingContext as CanvasRenderingContext2D;
  ctx.save();
  // Always bilinear-smooth on upscale; keeps the fast pass from looking blocky.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(buf, 0, 0, width, height);
  ctx.restore();
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function SliderControl({ label, min, max, step, value, onChange, format }: SliderProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {format ? format(value) : value.toFixed(step < 1 ? 2 : 0)}
      </span>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function GeometryBeneath({ width, height }: ProjectComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<P5 | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const controlsRef = useRef<Controls>(controls);
  const sizeRef = useRef({ width, height });
  const [branchStats, setBranchStats] = useState<BranchStats>({ segments: 0, capped: false });
  const lastReportedRef = useRef<BranchStats>({ segments: 0, capped: false });
  const rafRef = useRef(0);
  const refineTimerRef = useRef<number | null>(null);
  const fastRef = useRef(false);

  // Schedule a high-quality re-render after the user (or auto-zoom) stops.
  const scheduleRefine = useCallback((delayMs: number) => {
    if (refineTimerRef.current !== null) {
      window.clearTimeout(refineTimerRef.current);
    }
    refineTimerRef.current = window.setTimeout(() => {
      refineTimerRef.current = null;
      fastRef.current = false;
      sketchRef.current?.redraw();
    }, delayMs);
  }, []);

  useEffect(() => {
    controlsRef.current = controls;
    // Any control change is interactive: render fast first, refine after idle.
    fastRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      sketchRef.current?.redraw();
    });
    if (!controls.mandelbrot.autoZoom) scheduleRefine(180);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [controls, scheduleRefine]);

  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const host = hostRef.current;
      if (!host || sketchRef.current) return;
      const p5Module = await import('p5');
      if (cancelled || !hostRef.current) return;
      const P5Constructor = p5Module.default;

      const sketch = (p: P5) => {
        p.setup = () => {
          const { width: w, height: h } = sizeRef.current;
          p.createCanvas(w, h);
          p.pixelDensity(Math.min(window.devicePixelRatio, 2));
          p.noLoop();
        };

        p.draw = () => {
          const { width: w, height: h } = sizeRef.current;
          const c = controlsRef.current;
          if (c.mode === 'branching') {
            const stats = drawBranching(p, w, h, c.branching, c.iridescent, c.gradientCoeffs);
            const last = lastReportedRef.current;
            if (stats.segments !== last.segments || stats.capped !== last.capped) {
              lastReportedRef.current = stats;
              setBranchStats(stats);
            }
          } else if (c.mode === 'spiral') {
            drawSpiral(p, w, h, c.spiral, c.iridescent, c.gradientCoeffs);
          } else if (c.mode === 'tiling') {
            drawTiling(p, w, h, c.tiling, c.iridescent, c.gradientCoeffs);
          } else {
            drawMandelbrot(p, w, h, c.mandelbrot, c.iridescent, c.gradientCoeffs, fastRef.current);
          }
        };
      };

      sketchRef.current = new P5Constructor(sketch, host);
      // Initial draw after p5 setup completes
      requestAnimationFrame(() => sketchRef.current?.redraw());
    }

    void start();

    return () => {
      cancelled = true;
      sketchRef.current?.remove();
      sketchRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = sketchRef.current;
    if (!instance) return;
    instance.resizeCanvas(width, height);
    instance.redraw();
  }, [width, height]);

  // Auto-zoom: smoothly drive zoom toward targetZoom while easing center
  // toward (targetX, targetY). Only runs when the toggle is on and we're in
  // mandelbrot mode. Stops automatically when target zoom is reached.
  useEffect(() => {
    if (controls.mode !== 'mandelbrot' || !controls.mandelbrot.autoZoom) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setControls((prev) => {
        if (!prev.mandelbrot.autoZoom) return prev;
        const m = prev.mandelbrot;
        // Multiplicative zoom feels constant on a log scale: ~30% per second.
        const nextZoom = Math.min(m.targetZoom, m.zoom * Math.exp(0.3 * dt));
        // Ease center toward target proportional to remaining log-zoom.
        const k = 1 - Math.exp(-1.2 * dt);
        const cx = m.centerX + (m.targetX - m.centerX) * k;
        const cy = m.centerY + (m.targetY - m.centerY) * k;
        const reached = nextZoom >= m.targetZoom - 1e-6;
        return {
          ...prev,
          mandelbrot: {
            ...m,
            zoom: nextZoom,
            centerX: cx,
            centerY: cy,
            autoZoom: reached ? false : m.autoZoom,
          },
        };
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [controls.mode, controls.mandelbrot.autoZoom]);

  const setMode = useCallback((mode: Mode) => {
    setControls((prev) => ({ ...prev, mode }));
  }, []);

  const randomize = useCallback(() => {
    setControls((prev) => {
      const next = { ...prev };
      const seed = Math.floor(Math.random() * 0xffffffff);
      if (prev.mode === 'branching') {
        next.branching = { ...prev.branching, seed };
      } else if (prev.mode === 'tiling') {
        next.tiling = { ...prev.tiling, seed };
      } else if (prev.mode === 'mandelbrot') {
        // Pick a random interesting point near the boundary of the set.
        const POIs: Array<[number, number, number]> = [
          [-0.743643887037151, 0.131825904205330, 8000],
          [-0.10109636384562, 0.95628651080914, 2000],
          [-1.25066, 0.02012, 2000],
          [-0.7269, 0.1889, 3000],
          [0.28693186889, 0.014286693, 4000],
          [-0.748, 0.1, 800],
          [-1.7497219, 0, 2000],
        ];
        const [cx, cy, z] = POIs[Math.floor(Math.random() * POIs.length)];
        next.mandelbrot = {
          ...prev.mandelbrot,
          // If auto-zoom is on, set the target and reset to a wide view to
          // animate in. Otherwise jump to the POI for instant exploration.
          targetX: cx,
          targetY: cy,
          targetZoom: z,
          ...(prev.mandelbrot.autoZoom
            ? { centerX: -0.7, centerY: 0, zoom: 1 }
            : { centerX: cx, centerY: cy, zoom: z }),
        };
      } else {
        next.spiral = {
          ...prev.spiral,
          angleDeg: 130 + Math.random() * 15,
        };
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setControls((prev) => ({ ...DEFAULTS, mode: prev.mode }));
  }, []);

  return (
    <div className={styles.root}>
      <div ref={hostRef} className={styles.canvasHost} />

      <aside className={styles.panel} aria-label="Geometry Beneath Everything controls">
        <h3 className={styles.panelTitle}>The Geometry Beneath Everything</h3>
        <p className={styles.tagline}>{TAGLINES[controls.mode]}</p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Pillar</p>
          <select
            className={styles.select}
            value={controls.mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            aria-label="Pillar"
          >
            <option value="branching">1 — Repetition (branching)</option>
            <option value="spiral">2 — Growth (spiral)</option>
            <option value="tiling">3 — Tiling (honeycomb)</option>
            <option value="mandelbrot">4 — Self-similarity (Mandelbrot)</option>
          </select>
        </section>

        <section className={styles.section}>
          <label className={styles.toggleRow}>
            <span className={styles.label}>Iridescent</span>
            <input
              type="checkbox"
              className={styles.toggle}
              checked={controls.iridescent}
              onChange={(e) =>
                setControls((prev) => ({ ...prev, iridescent: e.target.checked }))
              }
            />
          </label>
        </section>

        {controls.iridescent && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Gradient</p>
            <div className={styles.row}>
              <select
                className={styles.select}
                value={controls.gradient}
                onChange={(e) => {
                  const key = e.target.value;
                  if (key === 'random') {
                    setControls((prev) => ({
                      ...prev,
                      gradient: 'random',
                      gradientCoeffs: randomCoeffs(),
                    }));
                  } else {
                    setControls((prev) => ({
                      ...prev,
                      gradient: key,
                      gradientCoeffs: GRADIENT_PRESETS[key].coeffs,
                    }));
                  }
                }}
                aria-label="Gradient preset"
              >
                {GRADIENT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {GRADIENT_PRESETS[k].label}
                  </option>
                ))}
                <option value="random">Random</option>
              </select>
              {controls.gradient === 'random' && (
                <button
                  className={styles.button}
                  type="button"
                  onClick={() =>
                    setControls((prev) => ({
                      ...prev,
                      gradientCoeffs: randomCoeffs(),
                    }))
                  }
                  style={{ minWidth: '3.2rem' }}
                >
                  ↻
                </button>
              )}
            </div>
          </section>
        )}

        {controls.mode === 'branching' && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Branching</p>
            <SliderControl
              label="Depth"
              min={1}
              max={10}
              step={1}
              value={controls.branching.depth}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, depth: v } }))
              }
            />
            <SliderControl
              label="Branch angle"
              min={10}
              max={60}
              step={1}
              value={controls.branching.angleDeg}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, angleDeg: v } }))
              }
              format={(v) => `${v.toFixed(0)}°`}
            />
            <SliderControl
              label="Length ratio"
              min={0.5}
              max={0.85}
              step={0.01}
              value={controls.branching.ratio}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, ratio: v } }))
              }
            />
            <SliderControl
              label="Branches / node"
              min={2}
              max={4}
              step={1}
              value={controls.branching.branches}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, branches: v } }))
              }
            />
            <SliderControl
              label="Jitter"
              min={0}
              max={0.5}
              step={0.01}
              value={controls.branching.jitter}
              onChange={(v) =>
                setControls((p) => ({ ...p, branching: { ...p.branching, jitter: v } }))
              }
            />
            <p className={styles.note}>
              Segments: {branchStats.segments.toLocaleString()}
              {branchStats.capped ? ` (capped at ${SEGMENT_CAP.toLocaleString()})` : ''}
            </p>
          </section>
        )}

        {controls.mode === 'spiral' && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Spiral</p>
            <SliderControl
              label="Seed count"
              min={50}
              max={2000}
              step={10}
              value={controls.spiral.count}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, count: v } }))
              }
            />
            <SliderControl
              label="Angle"
              min={130}
              max={145}
              step={0.1}
              value={controls.spiral.angleDeg}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, angleDeg: v } }))
              }
              format={(v) => `${v.toFixed(1)}°`}
            />
            <SliderControl
              label="Scale"
              min={1}
              max={14}
              step={0.1}
              value={controls.spiral.scale}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, scale: v } }))
              }
            />
            <SliderControl
              label="Dot size"
              min={1}
              max={8}
              step={0.5}
              value={controls.spiral.dotSize}
              onChange={(v) =>
                setControls((p) => ({ ...p, spiral: { ...p.spiral, dotSize: v } }))
              }
            />
            <p className={styles.note}>
              The golden angle is 137.5°. Slide off and back to see the packing collapse and recover.
            </p>
          </section>
        )}

        {controls.mode === 'tiling' && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Tiling</p>
            <SliderControl
              label="Cell size"
              min={12}
              max={80}
              step={1}
              value={controls.tiling.cellSize}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, cellSize: v } }))
              }
              format={(v) => `${v.toFixed(0)} px`}
            />
            <SliderControl
              label="Jitter"
              min={0}
              max={0.4}
              step={0.01}
              value={controls.tiling.jitter}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, jitter: v } }))
              }
            />
            <SliderControl
              label="Edge highlight"
              min={0}
              max={1}
              step={0.05}
              value={controls.tiling.edgeAlpha}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, edgeAlpha: v } }))
              }
            />
            <SliderControl
              label="Fill brightness"
              min={0}
              max={60}
              step={1}
              value={controls.tiling.fillBrightness}
              onChange={(v) =>
                setControls((p) => ({ ...p, tiling: { ...p.tiling, fillBrightness: v } }))
              }
            />
          </section>
        )}

        {controls.mode === 'mandelbrot' && (
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Mandelbrot</p>
            <label className={styles.toggleRow}>
              <span className={styles.label}>Auto zoom</span>
              <input
                type="checkbox"
                className={styles.toggle}
                checked={controls.mandelbrot.autoZoom}
                onChange={(e) =>
                  setControls((prev) => ({
                    ...prev,
                    mandelbrot: {
                      ...prev.mandelbrot,
                      autoZoom: e.target.checked,
                      // When turning on from idle, restart from a wide view.
                      ...(e.target.checked && prev.mandelbrot.zoom >= prev.mandelbrot.targetZoom - 1e-6
                        ? { zoom: 1, centerX: -0.7, centerY: 0 }
                        : null),
                    },
                  }))
                }
              />
            </label>
            <SliderControl
              label="Zoom"
              min={0.5}
              max={2000}
              step={0.5}
              value={controls.mandelbrot.zoom}
              onChange={(v) =>
                setControls((p) => ({ ...p, mandelbrot: { ...p.mandelbrot, zoom: v } }))
              }
              format={(v) => `${v.toFixed(1)}×`}
            />
            <SliderControl
              label="Center X"
              min={-2}
              max={1}
              step={0.0001}
              value={controls.mandelbrot.centerX}
              onChange={(v) =>
                setControls((p) => ({ ...p, mandelbrot: { ...p.mandelbrot, centerX: v } }))
              }
              format={(v) => v.toFixed(4)}
            />
            <SliderControl
              label="Center Y"
              min={-1.2}
              max={1.2}
              step={0.0001}
              value={controls.mandelbrot.centerY}
              onChange={(v) =>
                setControls((p) => ({ ...p, mandelbrot: { ...p.mandelbrot, centerY: v } }))
              }
              format={(v) => v.toFixed(4)}
            />
            <SliderControl
              label="Max iterations"
              min={40}
              max={800}
              step={10}
              value={controls.mandelbrot.maxIter}
              onChange={(v) =>
                setControls((p) => ({ ...p, mandelbrot: { ...p.mandelbrot, maxIter: v } }))
              }
            />
            <SliderControl
              label="Escape radius"
              min={2}
              max={32}
              step={1}
              value={controls.mandelbrot.escapeR}
              onChange={(v) =>
                setControls((p) => ({ ...p, mandelbrot: { ...p.mandelbrot, escapeR: v } }))
              }
            />
            <SliderControl
              label="Contrast"
              min={0.5}
              max={3}
              step={0.05}
              value={controls.mandelbrot.contrast}
              onChange={(v) =>
                setControls((p) => ({ ...p, mandelbrot: { ...p.mandelbrot, contrast: v } }))
              }
            />
            <p className={styles.note}>
              One rule, applied forever: z ↦ z² + c. Zoom in to see the same forms repeat at every scale.
            </p>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.buttonRow}>
            <button className={styles.button} type="button" onClick={randomize}>
              Randomize
            </button>
            <button className={styles.button} type="button" onClick={reset}>
              Reset
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

export default GeometryBeneath;
