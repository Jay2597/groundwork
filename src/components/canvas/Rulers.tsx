import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useEditorStore } from "@/store/editorStore";
import { activePage } from "@/types/document";
import { useStageSize } from "./useStageSize";
import "./rulers.css";

export const RULER = 20;

/** Pick a "nice" tick step (1/2/5 × 10ⁿ) so labels sit ~80px apart on screen. */
function niceStep(scale: number): number {
  const raw = 80 / scale;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const mult = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return mult * pow;
}

/** Rulers (top + left) with drag-out guides. Overlays the canvas edges. */
export function Rulers() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useStageSize(wrapRef);

  const viewport = useEditorStore((s) => s.viewport);
  const guides = useEditorStore((s) => activePage(s.document).guides);
  const addGuide = useEditorStore((s) => s.addGuide);
  const updateGuide = useEditorStore((s) => s.updateGuide);
  const removeGuide = useEditorStore((s) => s.removeGuide);

  const [draft, setDraft] = useState<{ axis: "x" | "y"; pos: number } | null>(null);

  // Redraw tick marks whenever size or viewport changes.
  useEffect(() => {
    drawRuler(topRef.current, "x", width, height, viewport);
    drawRuler(leftRef.current, "y", width, height, viewport);
  }, [width, height, viewport]);

  function docFromPointer(e: { clientX: number; clientY: number }, axis: "x" | "y") {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return axis === "x"
      ? (e.clientX - rect.left - viewport.x) / viewport.scale
      : (e.clientY - rect.top - viewport.y) / viewport.scale;
  }

  function inRuler(e: { clientX: number; clientY: number }, axis: "x" | "y") {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return axis === "x" ? e.clientX - rect.left < RULER : e.clientY - rect.top < RULER;
  }

  // Drag a new guide out of a ruler.
  function startCreate(axis: "x" | "y") {
    return (e: ReactPointerEvent) => {
      e.preventDefault();
      const move = (ev: PointerEvent) => setDraft({ axis, pos: docFromPointer(ev, axis) });
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setDraft(null);
        addGuide(axis, docFromPointer(ev, axis));
      };
      setDraft({ axis, pos: docFromPointer(e, axis) });
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  // Drag an existing guide; drop it back over the ruler to delete it.
  function startDragGuide(id: string, axis: "x" | "y") {
    return (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const move = (ev: PointerEvent) => updateGuide(id, docFromPointer(ev, axis));
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (inRuler(ev, axis)) removeGuide(id);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  const all = draft ? [...guides, { id: "__draft", ...draft }] : guides;

  return (
    <div className="rulers" ref={wrapRef}>
      <canvas className="ruler-top" ref={topRef} />
      <canvas className="ruler-left" ref={leftRef} />
      <div className="ruler-corner" />
      <div className="ruler-hit-top" onPointerDown={startCreate("y")} />
      <div className="ruler-hit-left" onPointerDown={startCreate("x")} />

      {all.map((g) => {
        const isDraft = g.id === "__draft";
        if (g.axis === "x") {
          const left = g.pos * viewport.scale + viewport.x;
          if (left < RULER || left > width) return null;
          return (
            <div
              key={g.id}
              className={`guide guide-v${isDraft ? " draft" : ""}`}
              style={{ left }}
              onPointerDown={isDraft ? undefined : startDragGuide(g.id, "x")}
            >
              <span className="guide-tip">{Math.round(g.pos)}</span>
            </div>
          );
        }
        const top = g.pos * viewport.scale + viewport.y;
        if (top < RULER || top > height) return null;
        return (
          <div
            key={g.id}
            className={`guide guide-h${isDraft ? " draft" : ""}`}
            style={{ top }}
            onPointerDown={isDraft ? undefined : startDragGuide(g.id, "y")}
          >
            <span className="guide-tip">{Math.round(g.pos)}</span>
          </div>
        );
      })}
    </div>
  );
}

function drawRuler(
  canvas: HTMLCanvasElement | null,
  axis: "x" | "y",
  width: number,
  height: number,
  viewport: { scale: number; x: number; y: number },
) {
  if (!canvas || width === 0 || height === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const horizontal = axis === "x";
  const cssW = horizontal ? width : RULER;
  const cssH = horizontal ? RULER : height;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const style = getComputedStyle(document.documentElement);
  const ink = style.getPropertyValue("--muted").trim() || "#9a9aa2";
  const faint = style.getPropertyValue("--faint").trim() || "#5a5a5e";

  ctx.font = "9px 'IBM Plex Mono', monospace";
  ctx.fillStyle = faint;
  ctx.strokeStyle = faint;
  ctx.lineWidth = 1;

  const scale = viewport.scale;
  const offset = horizontal ? viewport.x : viewport.y;
  const lenPx = horizontal ? width : height;
  const step = niceStep(scale);
  const minor = step / 5;

  const docStart = (RULER - offset) / scale;
  const docEnd = (lenPx - offset) / scale;
  const first = Math.floor(docStart / minor) * minor;

  for (let v = first; v <= docEnd; v += minor) {
    const screen = v * scale + offset;
    if (screen < RULER) continue;
    const isMajor = Math.abs(v % step) < minor / 2 || Math.abs((v % step) - step) < minor / 2;
    const tick = isMajor ? RULER : RULER - 6;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(screen, tick);
      ctx.lineTo(screen, RULER);
    } else {
      ctx.moveTo(tick, screen);
      ctx.lineTo(RULER, screen);
    }
    ctx.stroke();

    if (isMajor) {
      ctx.fillStyle = ink;
      const label = `${Math.round(v)}`;
      if (horizontal) {
        ctx.fillText(label, screen + 3, 9);
      } else {
        ctx.save();
        ctx.translate(9, screen + 3);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
      ctx.fillStyle = faint;
    }
  }
}
