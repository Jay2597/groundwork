import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { usePrefsStore } from "@/store/prefsStore";

const MIN = 200;
const MAX = 480;

interface PanelResizerProps {
  side: "left" | "right";
}

/** A draggable divider that resizes the left or right panel width (persisted). */
export function PanelResizer({ side }: PanelResizerProps) {
  const leftWidth = usePrefsStore((s) => s.leftWidth);
  const rightWidth = usePrefsStore((s) => s.rightWidth);
  const startRef = useRef<{ x: number; w: number } | null>(null);
  const style = side === "left" ? { left: leftWidth - 3 } : { right: rightWidth - 3 };

  function onPointerDown(e: ReactPointerEvent) {
    e.preventDefault();
    const prefs = usePrefsStore.getState();
    const w = side === "left" ? prefs.leftWidth : prefs.rightWidth;
    startRef.current = { x: e.clientX, w };
    document.body.style.cursor = "col-resize";

    const move = (ev: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const delta = ev.clientX - start.x;
      // dragging right grows the left panel, shrinks the right panel
      const raw = side === "left" ? start.w + delta : start.w - delta;
      const next = Math.max(MIN, Math.min(MAX, raw));
      usePrefsStore.getState().setPref(side === "left" ? "leftWidth" : "rightWidth", next);
    };
    const up = () => {
      startRef.current = null;
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      className={`panel-resizer ${side}`}
      style={style}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      onPointerDown={onPointerDown}
    />
  );
}
