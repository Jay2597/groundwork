import { useEffect, useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { activePage, isFrame, type Interaction } from "@/types/document";
import { nodeToSvgDocument } from "@/lib/export/exportSvg";
import { clickInteraction, delayInteraction, cssEasing, transitionAnimation } from "@/lib/prototype";
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
  // Bumped on every navigation to retrigger the CSS transition animation.
  const [anim, setAnim] = useState<{ key: number; interaction?: Interaction }>({ key: 0 });
  // Frame id currently shown as a floating overlay (null = none).
  const [overlayId, setOverlayId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setAnim({ key: 0 });
      setOverlayId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") setPresentMode(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, frames.length]);

  // Auto-advance frames that carry an "after-delay" interaction.
  useEffect(() => {
    if (!open) return;
    const current = frames[index];
    const delayed = current && delayInteraction(current);
    if (!delayed) return;
    const id = window.setTimeout(() => navigate(delayed), delayed.delay ?? 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  function step(dir: number) {
    setIndex((i) => Math.max(0, Math.min(i + dir, frames.length - 1)));
    setAnim((a) => ({ key: a.key + 1, interaction: undefined }));
  }

  function navigate(interaction: Interaction) {
    const action = interaction.action ?? "navigate";
    if (action === "close-overlay") {
      setOverlayId(null);
      return;
    }
    if (action === "open-overlay") {
      if (frames.some((f) => f.id === interaction.target)) setOverlayId(interaction.target);
      return;
    }
    const target = frames.findIndex((f) => f.id === interaction.target);
    if (target < 0) return;
    setOverlayId(null);
    setIndex(target);
    setAnim((a) => ({ key: a.key + 1, interaction }));
  }

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

  const overlay = overlayId ? frames.find((f) => f.id === overlayId) : undefined;
  const anchorAnim = anim.interaction ? transitionAnimation(anim.interaction.transition) : null;
  const animStyle = anchorAnim
    ? {
        animation: `${anchorAnim} ${anim.interaction?.duration ?? 300}ms ${cssEasing(anim.interaction?.easing ?? "ease-out")} both`,
      }
    : undefined;

  return (
    <div className="present">
      <div
        className="present-stage"
        style={{ width: frame.width * scale, height: frame.height * scale }}
      >
        <div
          key={anim.key}
          className="present-svg"
          style={{ width: frame.width, height: frame.height, transform: `scale(${scale})`, ["--present-scale" as string]: scale, ...animStyle }}
          dangerouslySetInnerHTML={{ __html: nodeToSvgDocument(frame) }}
        />
        {frame.children.map((c) => {
          const click = clickInteraction(c);
          if (!click) return null;
          return (
            <button
              key={c.id}
              className="present-hotspot"
              style={{
                left: c.x * scale,
                top: c.y * scale,
                width: c.width * scale,
                height: c.height * scale,
              }}
              onClick={() => navigate(click)}
              aria-label={`Go to frame`}
            />
          );
        })}
      </div>

      {overlay && (
        <div className="present-overlay-backdrop" onClick={() => setOverlayId(null)}>
          <div
            className="present-overlay"
            style={{ width: overlay.width * scale, height: overlay.height * scale }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="present-svg"
              style={{ width: overlay.width, height: overlay.height, transform: `scale(${scale})` }}
              dangerouslySetInnerHTML={{ __html: nodeToSvgDocument(overlay) }}
            />
            {overlay.children.map((c) => {
              const click = clickInteraction(c);
              if (!click) return null;
              return (
                <button
                  key={c.id}
                  className="present-hotspot"
                  style={{ left: c.x * scale, top: c.y * scale, width: c.width * scale, height: c.height * scale }}
                  onClick={() => navigate(click)}
                  aria-label="Overlay hotspot"
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="present-bar">
        <button className="present-nav" disabled={index === 0} onClick={() => step(-1)}>‹</button>
        <span className="present-count">{index + 1} / {frames.length} · {frame.name}</span>
        <button className="present-nav" disabled={index >= frames.length - 1} onClick={() => step(1)}>›</button>
      </div>
      <button className="present-exit" onClick={() => setPresentMode(false)}>Exit ✕</button>
    </div>
  );
}
