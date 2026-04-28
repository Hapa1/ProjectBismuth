import { useEffect, useRef, useState } from 'react';

export interface AudioBands {
  bass: number;
  mid: number;
  treble: number;
  level: number;
}

export interface AudioController {
  bands: React.MutableRefObject<AudioBands>;
  isActive: boolean;
  source: AudioSourceKind;
  loadFile: (file: File) => Promise<void>;
  enableMic: () => Promise<void>;
  captureTab: () => Promise<void>;
  loadDemo: () => Promise<void>;
  stop: () => void;
  setGain: (value: number) => void;
  setSmoothing: (value: number) => void;
}

export type AudioSourceKind = 'none' | 'demo' | 'file' | 'mic' | 'tab';

const ZERO_BANDS: AudioBands = { bass: 0, mid: 0, treble: 0, level: 0 };

export function useAudioAnalyser(): AudioController {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const elementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const oscNodesRef = useRef<AudioNode[]>([]);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const bandsRef = useRef<AudioBands>({ ...ZERO_BANDS });

  const [source, setSource] = useState<AudioSourceKind>('none');
  const [isActive, setIsActive] = useState(false);

  const ensureContext = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio API not available');
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      const gain = ctx.createGain();
      gain.gain.value = 0.9;
      gain.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      gainRef.current = gain;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    }
    return ctxRef.current!;
  };

  const tearDownSource = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    for (const node of oscNodesRef.current) {
      try {
        (node as OscillatorNode).stop?.();
        node.disconnect();
      } catch {
        // ignore
      }
    }
    oscNodesRef.current = [];
    if (elementRef.current) {
      elementRef.current.pause();
      elementRef.current.src = '';
      elementRef.current.load();
      elementRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  };

  const startLoop = () => {
    if (rafRef.current != null) return;
    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const bins = data.length;
        const bassEnd = Math.floor(bins * 0.08);
        const midEnd = Math.floor(bins * 0.32);
        let bass = 0;
        let mid = 0;
        let treble = 0;
        for (let i = 0; i < bassEnd; i += 1) bass += data[i];
        for (let i = bassEnd; i < midEnd; i += 1) mid += data[i];
        for (let i = midEnd; i < bins; i += 1) treble += data[i];
        bass /= Math.max(1, bassEnd) * 255;
        mid /= Math.max(1, midEnd - bassEnd) * 255;
        treble /= Math.max(1, bins - midEnd) * 255;
        const level = (bass + mid + treble) / 3;
        // Light smoothing on top of analyser smoothing
        const prev = bandsRef.current;
        bandsRef.current = {
          bass: prev.bass * 0.4 + bass * 0.6,
          mid: prev.mid * 0.4 + mid * 0.6,
          treble: prev.treble * 0.4 + treble * 0.6,
          level: prev.level * 0.4 + level * 0.6,
        };
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stop = () => {
    tearDownSource();
    bandsRef.current = { ...ZERO_BANDS };
    setIsActive(false);
    setSource('none');
  };

  const loadFile = async (file: File) => {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    tearDownSource();

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.src = URL.createObjectURL(file);
    elementRef.current = audio;
    const node = ctx.createMediaElementSource(audio);
    node.connect(gainRef.current!);
    sourceNodeRef.current = node;
    await audio.play();
    startLoop();
    setSource('file');
    setIsActive(true);
  };

  const enableMic = async () => {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    tearDownSource();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const node = ctx.createMediaStreamSource(stream);
    // Don't pipe mic to destination — analyser only
    node.connect(analyserRef.current!);
    sourceNodeRef.current = node;
    startLoop();
    setSource('mic');
    setIsActive(true);
  };

  const captureTab = async () => {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const md = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>;
    };
    if (!md.getDisplayMedia) {
      throw new Error('getDisplayMedia is not supported in this browser');
    }
    // Video must be requested for Chrome/Edge to offer a tab picker; we drop the video track immediately.
    const stream = await md.getDisplayMedia({ audio: true, video: true });
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      for (const t of stream.getTracks()) t.stop();
      throw new Error('No audio track was shared. In the picker, choose a tab and tick "Share tab audio".');
    }
    // Stop video immediately — we only need audio.
    for (const t of stream.getVideoTracks()) {
      t.stop();
      stream.removeTrack(t);
    }
    tearDownSource();
    streamRef.current = stream;
    const audioOnly = new MediaStream(audioTracks);
    const node = ctx.createMediaStreamSource(audioOnly);
    // Route to gain so the user still hears the captured tab through the page.
    node.connect(gainRef.current!);
    sourceNodeRef.current = node;
    // If the user revokes sharing from the browser bar, fall back to idle.
    audioTracks[0].addEventListener('ended', () => {
      stop();
    });
    startLoop();
    setSource('tab');
    setIsActive(true);
  };

  const loadDemo = async () => {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    tearDownSource();

    // Soundbath: multiple singing bowl voices with inharmonic partials,
    // periodic strike envelopes, gentle vibrato, and a long reverb tail.
    const target = gainRef.current!;

    // Master bus — kept quiet; the gain node (gainRef) adds its own level on top
    const master = ctx.createGain();
    master.gain.value = 0.2;

    // Warmth filter: roll off harsh highs
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 4000;
    warmth.Q.value = 0.5;

    // Long reverb tail via a feedback delay loop with an inner LPF to darken it
    const delay = ctx.createDelay(4.0);
    delay.delayTime.value = 2.8;
    const fbGain = ctx.createGain();
    fbGain.gain.value = 0.42;
    const fbLpf = ctx.createBiquadFilter();
    fbLpf.type = 'lowpass';
    fbLpf.frequency.value = 1800;

    // Routing: master → warmth → [direct out] + [delay tail loop → out]
    master.connect(warmth);
    warmth.connect(target);          // dry
    warmth.connect(delay);
    delay.connect(fbLpf);
    fbLpf.connect(fbGain);
    fbGain.connect(delay);           // feedback
    fbLpf.connect(target);           // wet tail

    // Bowl fundamentals (loosely pentatonic over two octaves: C / G / C / E / G / C)
    const bowlFreqs = [128, 192, 256, 320, 384, 512];

    // Authentic singing-bowl inharmonic partial ratios (circular plate physics)
    const partialRatios = [1, 2.756, 5.404];
    const partialAmps   = [0.55, 0.28, 0.12];

    for (let b = 0; b < bowlFreqs.length; b += 1) {
      const f0 = bowlFreqs[b];

      // Per-bowl gain node; its gain is modulated by the strike LFO
      const bowlGain = ctx.createGain();
      bowlGain.gain.value = 0.5;       // base; LFO adds swing around this
      bowlGain.connect(master);

      // Strike LFO: slow sine offset to [0 … 1], random phase & rate per bowl
      // Gives the feel of periodic gong strikes with long ringing decays
      const strikeRate = 0.045 + Math.random() * 0.055; // ~9–22 s between strikes
      const strikeLFO  = ctx.createOscillator();
      const strikeMod  = ctx.createGain();
      strikeLFO.type = 'sine';
      strikeLFO.frequency.value = strikeRate;
      strikeMod.gain.value = 0.5;   // swings ±0.5 around the base 0.5 → [0, 1]
      strikeLFO.connect(strikeMod);
      strikeMod.connect(bowlGain.gain);
      // Stagger start phase by offsetting frequency temporarily — simpler: just delay start
      const phaseDelay = Math.random() * (1 / strikeRate);
      strikeLFO.start(ctx.currentTime + phaseDelay);
      oscNodesRef.current.push(strikeLFO, strikeMod);

      // Inharmonic partials for each bowl
      for (let p = 0; p < partialRatios.length; p += 1) {
        const freq = f0 * partialRatios[p];

        const osc = ctx.createOscillator();
        const og  = ctx.createGain();
        osc.type = 'sine';
        // Tiny random detune (±0.2 %) per partial → natural beating between bowls
        osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.004);
        og.gain.value = partialAmps[p] / bowlFreqs.length;

        // Very gentle vibrato (simulates the sustained ring of a real bowl)
        const vib     = ctx.createOscillator();
        const vibGain = ctx.createGain();
        vib.type = 'sine';
        vib.frequency.value = 0.6 + Math.random() * 0.8; // 0.6 – 1.4 Hz
        vibGain.gain.value = freq * 0.0018;               // ~0.18 % depth
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);

        osc.connect(og);
        og.connect(bowlGain);
        osc.start();
        vib.start();
        oscNodesRef.current.push(osc, vib, og);
      }
    }

    // Push utility nodes so tearDownSource disconnects them all cleanly
    oscNodesRef.current.push(delay, fbGain, fbLpf, warmth);

    sourceNodeRef.current = master;
    startLoop();
    setSource('demo');
    setIsActive(true);
  };

  const setGain = (value: number) => {
    if (gainRef.current) gainRef.current.gain.value = value;
  };

  const setSmoothing = (value: number) => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = Math.min(0.98, Math.max(0, value));
    }
  };

  useEffect(() => {
    return () => {
      stopLoop();
      tearDownSource();
      if (ctxRef.current) {
        try {
          ctxRef.current.close();
        } catch {
          // ignore
        }
        ctxRef.current = null;
      }
    };
  }, []);

  return {
    bands: bandsRef,
    isActive,
    source,
    loadFile,
    enableMic,
    captureTab,
    loadDemo,
    stop,
    setGain,
    setSmoothing,
  };
}
