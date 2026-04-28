import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  showSpecs: boolean;
  fps: number;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setFps: (v: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false, // default closed — mobile-first
  showSpecs: true,
  fps: 0,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setFps: (v) => set({ fps: v }),
}));
