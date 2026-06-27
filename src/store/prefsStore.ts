import { create } from "zustand";

// On-device editor preferences, persisted to localStorage. No network, no account.

const KEY = "gw:prefs";

export interface Prefs {
  snapping: boolean;
  showGrid: boolean;
  gridSize: number;
  leftWidth: number;
  rightWidth: number;
}

const DEFAULTS: Prefs = {
  snapping: true,
  showGrid: true,
  gridSize: 24,
  leftWidth: 244,
  rightWidth: 268,
};

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

interface PrefsState extends Prefs {
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  ...read(),
  setPref: (key, value) => {
    set({ [key]: value } as Pick<Prefs, typeof key>);
    const { snapping, showGrid, gridSize, leftWidth, rightWidth } = get();
    localStorage.setItem(
      KEY,
      JSON.stringify({ snapping, showGrid, gridSize, leftWidth, rightWidth }),
    );
  },
}));
