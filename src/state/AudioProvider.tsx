import { createContext, useContext, type ReactNode } from 'react';
import { useAudioAnalyser, type AudioController } from '../lib/useAudioAnalyser';

const AudioContext = createContext<AudioController | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const controller = useAudioAnalyser();
  return <AudioContext.Provider value={controller}>{children}</AudioContext.Provider>;
}

/**
 * Returns the shared, session-level audio controller.
 * The controller is instantiated once in AppShell so it survives project switches.
 */
export function useAudioController(): AudioController {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudioController must be used inside <AudioProvider>');
  return ctx;
}
