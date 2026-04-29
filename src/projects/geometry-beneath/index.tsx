import { useCallback, useEffect, useRef, useState } from 'react';
import type P5 from 'p5';
import type { ProjectComponentProps } from '../../types/project';
import styles from './GeometryBeneath.module.css';
import { useRandomize } from '../../lib/useRandomize';

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
// Mandelbrot — GPU fragment shader (WebGL2). Renders a fullscreen triangle
// and computes escape-time per pixel. Order of magnitude faster than CPU,
// so we always render at full resolution with no fast/refine machinery.
// ---------------------------------------------------------------------------

const MANDELBROT_VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const MANDELBROT_FRAG = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uZoom;
uniform float uMaxIter;
uniform float uEscapeR;
uniform float uContrast;
uniform float uIridescent;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uD;
out vec4 fragColor;

vec3 sampleMandelbrot(vec2 c) {
  // Cardioid + period-2 bulb early-out.
  float xm = c.x - 0.25;
  float q = xm * xm + c.y * c.y;
  bool inSet = (q * (q + xm) <= 0.25 * c.y * c.y) ||
               ((c.x + 1.0) * (c.x + 1.0) + c.y * c.y <= 0.0625);

  vec2 z = vec2(0.0);
  float escapeSq = uEscapeR * uEscapeR;
  float iter = 0.0;
  bool escaped = false;
  if (!inSet) {
    for (int i = 0; i < 4096; i++) {
      if (float(i) >= uMaxIter) break;
      z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
      iter = float(i + 1);
      if (dot(z, z) > escapeSq) { escaped = true; break; }
    }
  }
  if (!escaped) return vec3(0.024, 0.027, 0.047);

  float log_zn = log(dot(z, z)) * 0.5;
  float nu = log(log_zn / log(uEscapeR)) / log(2.0);
  float smoothIter = max(0.0, iter - nu);
  float t = (log(1.0 + smoothIter) / log(1.0 + uMaxIter)) * uContrast;
  t = clamp(t, 0.0, 0.999);

  if (uIridescent > 0.5) {
    const float TAU = 6.2831853;
    return clamp(uA + uB * cos(TAU * (uC * t + uD)), 0.0, 1.0);
  }
  return vec3(pow(t, 0.7));
}

void main() {
  // 2x2 rotated-grid supersampling. Four sub-samples per pixel softens
  // boundary edges and band aliasing without blurring real detail.
  vec2 frag = gl_FragCoord.xy;
  float scale = 3.5 / uZoom;
  float aspect = uResolution.x / uResolution.y;
  vec2 px = vec2(scale * aspect, scale) / uResolution;
  vec2 offsets[4] = vec2[4](
    vec2(-0.25,  0.125),
    vec2( 0.125, 0.25),
    vec2( 0.25, -0.125),
    vec2(-0.125, -0.25)
  );
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec2 uv = ((frag + offsets[i]) / uResolution) - 0.5;
    uv.x *= aspect;
    vec2 c = uCenter + uv * scale;
    acc += sampleMandelbrot(c);
  }
  fragColor = vec4(acc * 0.25, 1.0);
}
`;

interface MandelbrotGL {
  resize: (w: number, h: number, dpr: number) => void;
  render: (c: MandelbrotControls, iridescent: boolean, coeffs: CosineCoeffs) => void;
  dispose: () => void;
}

function createMandelbrotGL(canvas: HTMLCanvasElement): MandelbrotGL | null {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Mandelbrot shader compile failed: ${log}`);
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, MANDELBROT_VERT);
  const fs = compile(gl.FRAGMENT_SHADER, MANDELBROT_FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    throw new Error(`Mandelbrot program link failed: ${log}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const vao = gl.createVertexArray()!; // empty VAO is fine for a vertex-id triangle.
  const u = {
    res: gl.getUniformLocation(prog, 'uResolution'),
    center: gl.getUniformLocation(prog, 'uCenter'),
    zoom: gl.getUniformLocation(prog, 'uZoom'),
    maxIter: gl.getUniformLocation(prog, 'uMaxIter'),
    escapeR: gl.getUniformLocation(prog, 'uEscapeR'),
    contrast: gl.getUniformLocation(prog, 'uContrast'),
    iridescent: gl.getUniformLocation(prog, 'uIridescent'),
    a: gl.getUniformLocation(prog, 'uA'),
    b: gl.getUniformLocation(prog, 'uB'),
    c: gl.getUniformLocation(prog, 'uC'),
    d: gl.getUniformLocation(prog, 'uD'),
  };

  let drawW = 1;
  let drawH = 1;

  return {
    resize(w: number, h: number, dpr: number) {
      const pw = Math.max(1, Math.floor(w * dpr));
      const ph = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      drawW = pw;
      drawH = ph;
    },
    render(c, iridescent, coeffs) {
      gl.viewport(0, 0, drawW, drawH);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      const iterBoost = 0.5;
      const effIter = Math.max(
        20,
        Math.min(
          4000,
          Math.floor(c.maxIter * (1 + iterBoost * Math.log2(Math.max(1, c.zoom)))),
        ),
      );
      gl.uniform2f(u.res, drawW, drawH);
      gl.uniform2f(u.center, c.centerX, c.centerY);
      gl.uniform1f(u.zoom, Math.max(0.1, c.zoom));
      gl.uniform1f(u.maxIter, effIter);
      gl.uniform1f(u.escapeR, Math.max(2, c.escapeR));
      gl.uniform1f(u.contrast, Math.max(0.2, c.contrast));
      gl.uniform1f(u.iridescent, iridescent ? 1 : 0);
      gl.uniform3fv(u.a, coeffs.a);
      gl.uniform3fv(u.b, coeffs.b);
      gl.uniform3fv(u.c, coeffs.c);
      gl.uniform3fv(u.d, coeffs.d);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    },
    dispose() {
      gl.deleteProgram(prog);
      gl.deleteVertexArray(vao);
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    },
  };
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
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const glModRef = useRef<MandelbrotGL | null>(null);
  const glReadyRef = useRef(false);
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const controlsRef = useRef<Controls>(controls);
  const sizeRef = useRef({ width, height });
  const [branchStats, setBranchStats] = useState<BranchStats>({ segments: 0, capped: false });
  const lastReportedRef = useRef<BranchStats>({ segments: 0, capped: false });
  const rafRef = useRef(0);

  // Lazily create the WebGL Mandelbrot renderer the first time we need it.
  const ensureGL = useCallback(() => {
    if (glReadyRef.current) return glModRef.current;
    const canvas = glCanvasRef.current;
    if (!canvas) return null;
    try {
      const mod = createMandelbrotGL(canvas);
      glModRef.current = mod;
      glReadyRef.current = true;
      if (mod) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        mod.resize(sizeRef.current.width, sizeRef.current.height, dpr);
      }
      return mod;
    } catch (err) {
      console.warn('Mandelbrot WebGL init failed', err);
      glReadyRef.current = true;
      glModRef.current = null;
      return null;
    }
  }, []);

  const renderMandelbrot = useCallback(() => {
    const mod = ensureGL();
    if (!mod) return;
    const c = controlsRef.current;
    mod.render(c.mandelbrot, c.iridescent, c.gradientCoeffs);
  }, [ensureGL]);

  useEffect(() => {
    controlsRef.current = controls;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (controlsRef.current.mode === 'mandelbrot') {
        renderMandelbrot();
      } else {
        sketchRef.current?.redraw();
      }
    });
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [controls, renderMandelbrot]);

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
          }
          // mandelbrot mode is rendered by WebGL on a separate canvas, so
          // p5 has nothing to do for that mode.
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
      glModRef.current?.dispose();
      glModRef.current = null;
      glReadyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const instance = sketchRef.current;
    if (instance) {
      instance.resizeCanvas(width, height);
      if (controlsRef.current.mode !== 'mandelbrot') instance.redraw();
    }
    const mod = glModRef.current;
    if (mod) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mod.resize(width, height, dpr);
      if (controlsRef.current.mode === 'mandelbrot') {
        mod.render(
          controlsRef.current.mandelbrot,
          controlsRef.current.iridescent,
          controlsRef.current.gradientCoeffs,
        );
      }
    }
  }, [width, height]);

  // Auto-zoom: smoothly drive zoom toward targetZoom while easing center
  // toward (targetX, targetY). Only runs when the toggle is on and we're in
  // mandelbrot mode. Stops automatically when target zoom is reached.
  useEffect(() => {
    if (controls.mode !== 'mandelbrot' || !controls.mandelbrot.autoZoom) return;
    let raf = 0;
    let last = performance.now();
    let lastTick = 0;
    // Throttle to ~24 fps so each fast render gets enough budget to look
    // good. Going faster just produces more grainy frames per second; this
    // trades fewer-but-cleaner frames, which the eye reads as smoother.
    const minStep = 1000 / 24;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now - lastTick >= minStep) {
        lastTick = now;
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
      }
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

  useRandomize(randomize);

  const reset = useCallback(() => {
    setControls((prev) => ({ ...DEFAULTS, mode: prev.mode }));
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.canvasHost} style={{ position: 'relative' }}>
        <div
          ref={hostRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: controls.mode === 'mandelbrot' ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        <canvas
          ref={glCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: controls.mode === 'mandelbrot' ? 'block' : 'none',
          }}
          aria-hidden="true"
        />
      </div>

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
