import type { AudioBands } from '../useAudioAnalyser';

/**
 * Pure beat-detector FSM extracted from the Voronoi/Apex/Lattice projects.
 * Tracks a fast-attack / slow-release envelope on the bass band and emits
 * `true` when a transient (or fallback heartbeat) is detected.
 *
 * Construct one per audio-reactive scene and call `step()` every frame from
 * a `useFrame` callback. The detector is purely functional with no React
 * coupling, so it is safe to mutate from outside React's render loop.
 */
export interface BeatDetectorOptions {
  /** Multiplier on slow envelope; transient fires when fast > slow * threshold. */
  threshold?: number;
  /** Minimum seconds between successive transients. */
  refractory?: number;
  /** Seconds without a beat before a heartbeat fires. */
  heartbeatGap?: number;
  /** Floor for `bands.bass` below which transients are suppressed. */
  noiseFloor?: number;
}

const DEFAULTS: Required<BeatDetectorOptions> = {
  threshold: 1.6,
  refractory: 0.18,
  heartbeatGap: 1.2,
  noiseFloor: 0.08,
};

export interface BeatStep {
  /** True if any beat (transient or heartbeat) fired this frame. */
  fired: boolean;
  /** True specifically for transients (vs. heartbeats). */
  transient: boolean;
  /** Energy in [0..~1] suitable for scaling pulse intensity. */
  energy: number;
}

export class BeatDetector {
  private slow = 0;
  private fast = 0;
  private lastBeat = 999;
  private sinceAny = 0;
  private opts: Required<BeatDetectorOptions>;

  constructor(opts: BeatDetectorOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  setOptions(opts: BeatDetectorOptions): void {
    this.opts = { ...this.opts, ...opts };
  }

  step(dt: number, bands: AudioBands): BeatStep {
    const { threshold, refractory, heartbeatGap, noiseFloor } = this.opts;

    if (bands.bass > this.fast) this.fast = bands.bass;
    else this.fast = Math.max(bands.bass, this.fast - dt * 4.5);
    this.slow = this.slow * 0.985 + bands.bass * 0.015;

    this.lastBeat += dt;
    this.sinceAny += dt;

    const transient =
      bands.bass > noiseFloor &&
      this.fast > this.slow * threshold &&
      this.lastBeat > refractory;

    const heartbeat =
      !transient && this.sinceAny > heartbeatGap && bands.level > noiseFloor;

    if (transient || heartbeat) {
      if (transient) this.lastBeat = 0;
      this.sinceAny = 0;
      const energy = transient
        ? Math.max(bands.bass, this.fast - this.slow)
        : bands.level * 0.7;
      return { fired: true, transient, energy };
    }

    return { fired: false, transient: false, energy: 0 };
  }
}
