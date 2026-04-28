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

    // Synthesise a moody pad-like demo signal — three detuned oscillators with LFO
    const target = gainRef.current!;
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(target);

    const freqs = [110, 220, 440, 660];
    const types: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'sine'];
    for (let i = 0; i < freqs.length; i += 1) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = types[i];
      osc.frequency.value = freqs[i];
      og.gain.value = 0.25 / (i + 1);
      lfo.type = 'sine';
      lfo.frequency.value = 0.15 + i * 0.1;
      lfoGain.gain.value = 0.18;
      lfo.connect(lfoGain);
      lfoGain.connect(og.gain);
      osc.connect(og);
      og.connect(master);
      osc.start();
      lfo.start();
      oscNodesRef.current.push(osc, lfo);
    }

    // Slow noise pulse for "kick"
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) noiseData[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 110;
    const ng = ctx.createGain();
    ng.gain.value = 0.0;
    const ngLFO = ctx.createOscillator();
    const ngLFOGain = ctx.createGain();
    ngLFO.frequency.value = 0.6;
    ngLFOGain.gain.value = 0.35;
    ngLFO.connect(ngLFOGain);
    ngLFOGain.connect(ng.gain);
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(master);
    noise.start();
    ngLFO.start();
    oscNodesRef.current.push(noise, ngLFO);

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
