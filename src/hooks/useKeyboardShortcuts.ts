import { useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { resetZoom, zoomBy, zoomToFit, zoomToSelection } from "@/lib/zoom";
import type { Tool } from "@/types/editor";

const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  h: "hand",
  f: "frame",
  r: "rect",
  o: "ellipse",
  t: "text",
  p: "pen",
};

const NUDGE = 1;
const NUDGE_LARGE = 10;

/** Global editor shortcuts. Ignored while typing in inputs. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const store = useEditorStore.getState();
      const ui = useUiStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Command palette
      if (mod && key === "k") {
        e.preventDefault();
        ui.togglePalette();
        return;
      }

      // Shortcuts help (?)
      if (!mod && (e.key === "?" || (e.shiftKey && key === "/"))) {
        e.preventDefault();
        ui.setHelpOpen(!ui.helpOpen);
        return;
      }

      // Zoom
      if (mod && (key === "=" || key === "+")) {
        e.preventDefault();
        zoomBy(1.2);
        return;
      }
      if (mod && key === "-") {
        e.preventDefault();
        zoomBy(1 / 1.2);
        return;
      }
      if (mod && key === "0") {
        e.preventDefault();
        resetZoom();
        return;
      }
      if (mod && key === "1") {
        e.preventDefault();
        zoomToFit();
        return;
      }
      if (mod && key === "2") {
        e.preventDefault();
        zoomToSelection();
        return;
      }

      // History
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        store.redo();
        return;
      }

      // Clipboard
      if (mod && key === "c") {
        e.preventDefault();
        store.copySelected();
        return;
      }
      if (mod && key === "x") {
        e.preventDefault();
        store.cutSelected();
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        store.paste();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        store.duplicateSelected();
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        store.selectAll();
        return;
      }
      if (mod && key === "g") {
        e.preventDefault();
        if (e.altKey) store.frameSelection();
        else if (e.shiftKey) store.ungroupSelected();
        else store.groupSelected();
        return;
      }
      if (mod && key === "e") {
        e.preventDefault();
        store.flattenSelected();
        return;
      }

      // Z-order
      if (!mod && key === "]") {
        store.reorderSelected(e.shiftKey ? "front" : "forward");
        return;
      }
      if (!mod && key === "[") {
        store.reorderSelected(e.shiftKey ? "back" : "backward");
        return;
      }

      // Nudge
      if (e.key.startsWith("Arrow") && store.selectedIds.length > 0) {
        e.preventDefault();
        const d = e.shiftKey ? NUDGE_LARGE : NUDGE;
        if (e.key === "ArrowLeft") store.nudgeSelected(-d, 0);
        else if (e.key === "ArrowRight") store.nudgeSelected(d, 0);
        else if (e.key === "ArrowUp") store.nudgeSelected(0, -d);
        else if (e.key === "ArrowDown") store.nudgeSelected(0, d);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        store.deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        if (ui.helpOpen) ui.setHelpOpen(false);
        if (ui.presentMode) ui.setPresentMode(false);
        store.clearSelection();
        return;
      }
      if (!mod && TOOL_KEYS[key]) {
        store.setTool(TOOL_KEYS[key]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
