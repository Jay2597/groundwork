import { create } from "zustand";

// Ephemeral, non-persisted UI state for the editor shell: the right-click
// context menu, the command palette, present mode, and the settings dialog.

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  /** "canvas" when invoked over empty space, "node" when over a selection. */
  target: "canvas" | "node";
}

interface UiState {
  contextMenu: ContextMenuState;
  paletteOpen: boolean;
  settingsOpen: boolean;
  exportOpen: boolean;
  codeOpen: boolean;
  presentMode: boolean;
  commentMode: boolean;
  leftOpen: boolean;
  rightOpen: boolean;

  openContextMenu: (x: number, y: number, target: "canvas" | "node") => void;
  closeContextMenu: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setSettingsOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  setCodeOpen: (open: boolean) => void;
  setPresentMode: (on: boolean) => void;
  toggleCommentMode: () => void;
  toggleLeft: () => void;
  toggleRight: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  contextMenu: { open: false, x: 0, y: 0, target: "canvas" },
  paletteOpen: false,
  settingsOpen: false,
  exportOpen: false,
  codeOpen: false,
  presentMode: false,
  commentMode: false,
  leftOpen: true,
  rightOpen: true,

  openContextMenu: (x, y, target) => set({ contextMenu: { open: true, x, y, target } }),
  closeContextMenu: () =>
    set((s) => ({ contextMenu: { ...s.contextMenu, open: false } })),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setExportOpen: (open) => set({ exportOpen: open }),
  setCodeOpen: (open) => set({ codeOpen: open }),
  setPresentMode: (on) => set({ presentMode: on }),
  toggleCommentMode: () => set({ commentMode: !get().commentMode }),
  toggleLeft: () => set({ leftOpen: !get().leftOpen }),
  toggleRight: () => set({ rightOpen: !get().rightOpen }),
}));
