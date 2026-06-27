import { useEffect, useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { activePage, isFrame } from "@/types/document";
import { nodeToSvgDocument } from "@/lib/export/exportSvg";
import "./present.css";

/**
 * Full-screen present / preview mode. Steps through the page's frames; nodes
 * carrying a prototype `link` become clickable hotspots that jump to a frame.
 */
export function PresentMode() {
  const open = useUiStore((s) => s.presentMode);
  const setPresentMode = useUiStore((s) => s.setPresentMode);
  const document = useEditorStore((s) => s.document);
  const frames = activePage(document).nodes.filter(isFrame);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") setIndex((i) => Math.min(i + 1, frames.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, frames.length]);

  if (!open) return null;

  const frame = frames[index];
  if (!frame) {
    return (
      <div className="present">
        <div className="present-empty">No frames to present. Draw a frame (F), then present.</div>
        <button className="present-exit" onClick={() => setPresentMode(false)}>Exit ✕</button>
      </div>
    );
  }

  const pad = 80;
  const scale = Math.min(
    (window.innerWidth - pad) / frame.width,
    (window.innerHeight - pad) / frame.height,
    1.5,
  );

  function goToFrame(linkId: string) {
    const target = frames.findIndex((f) => f.id === linkId);
    if (target >= 0) setIndex(target);
  }

  return (
    <div className="present">
      <div
        className="present-stage"
        style={{ width: frame.width * scale, height: frame.height * scale }}
      >
        <div
          className="present-svg"
          style={{ width: frame.width, height: frame.height, transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: nodeToSvgDocument(frame) }}
        />
        {frame.children
          .filter((c) => c.link)
          .map((c) => (
            <button
              key={c.id}
              className="present-hotspot"
              style={{
                left: c.x * scale,
                top: c.y * scale,
                width: c.width * scale,
                height: c.height * scale,
              }}
              onClick={() => c.link && goToFrame(c.link)}
              aria-label={`Go to ${c.name}`}
            />
          ))}
      </div>

      <div className="present-bar">
        <button className="present-nav" disabled={index === 0} onClick={() => setIndex((i) => Math.max(i - 1, 0))}>‹</button>
        <span className="present-count">{index + 1} / {frames.length} · {frame.name}</span>
        <button className="present-nav" disabled={index >= frames.length - 1} onClick={() => setIndex((i) => Math.min(i + 1, frames.length - 1))}>›</button>
      </div>
      <button className="present-exit" onClick={() => setPresentMode(false)}>Exit ✕</button>
    </div>
  );
}
