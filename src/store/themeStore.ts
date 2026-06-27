import { create } from "zustand";

// App theme (dark / light), persisted on-device. Applies a `data-theme`
// attribute to <html> so CSS token overrides in tokens.css take effect.

export type Theme = "dark" | "light";

const KEY = "gw:theme";

function readInitial(): Theme {
  const saved = localStorage.getItem(KEY);
  return saved === "light" ? "light" : "dark";
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const initial = readInitial();
apply(initial);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  setTheme: (theme) => {
    apply(theme);
    localStorage.setItem(KEY, theme);
    set({ theme });
  },
}));
