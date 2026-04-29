import { create } from 'zustand';

const PROJECTS_NAV_KEY = 'bismuth.projectsNavExpanded';
const PROJECTS_NAV_USER_TOGGLED_KEY = 'bismuth.projectsNavUserToggled';

function readSession(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeSession(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore quota / privacy mode errors
  }
}

interface UIState {
  sidebarOpen: boolean;
  showSpecs: boolean;
  fps: number;
  /** Whether the "Projects" disclosure in the sidebar is expanded. */
  projectsNavExpanded: boolean;
  /** Whether the user has explicitly toggled the projects nav this session. */
  projectsNavUserToggled: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setFps: (v: number) => void;
  toggleProjectsNav: () => void;
  setProjectsNavExpanded: (v: boolean) => void;
  /**
   * Auto-expand the projects nav, but only if the user has not toggled it
   * explicitly this session. Used when navigating to a /projects/* route.
   */
  autoExpandProjectsNav: () => void;
  /**
   * Optional randomize callback registered by the active project. When set,
   * the shell renders a stage-level FAB. Cleared on project unmount.
   */
  randomizeAction: (() => void) | null;
  setRandomizeAction: (fn: (() => void) | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false, // default closed — mobile-first
  showSpecs: true,
  fps: 0,
  projectsNavExpanded: readSession(PROJECTS_NAV_KEY),
  projectsNavUserToggled: readSession(PROJECTS_NAV_USER_TOGGLED_KEY),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setFps: (v) => set({ fps: v }),
  toggleProjectsNav: () => {
    const next = !get().projectsNavExpanded;
    writeSession(PROJECTS_NAV_KEY, next);
    writeSession(PROJECTS_NAV_USER_TOGGLED_KEY, true);
    set({ projectsNavExpanded: next, projectsNavUserToggled: true });
  },
  setProjectsNavExpanded: (v) => {
    writeSession(PROJECTS_NAV_KEY, v);
    writeSession(PROJECTS_NAV_USER_TOGGLED_KEY, true);
    set({ projectsNavExpanded: v, projectsNavUserToggled: true });
  },
  autoExpandProjectsNav: () => {
    if (get().projectsNavUserToggled) return;
    if (get().projectsNavExpanded) return;
    writeSession(PROJECTS_NAV_KEY, true);
    set({ projectsNavExpanded: true });
  },
  randomizeAction: null,
  setRandomizeAction: (fn) => set({ randomizeAction: fn }),
}));
