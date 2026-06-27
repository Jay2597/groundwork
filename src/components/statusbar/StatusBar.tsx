import { useEffect, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { activePage } from "@/types/document";
import { countNodes } from "@/lib/tree";
import { resetZoom, setZoom, zoomBy, zoomToFit, zoomToSelection } from "@/lib/zoom";
import "./statusbar.css";

export function StatusBar() {
  const name = useEditorStore((s) => s.document.name);
  const layerCount = useEditorStore((s) => countNodes(activePage(s.document).nodes));
  const hasHandle = useEditorStore((s) => Boolean(s.fileHandle));

  const fileLabel = `${name}.gwork`;

  return (
    <footer className="statusbar">
      <span className="amber-tx">● {hasHandle ? "Saved locally" : "Autosaving"}</span>
      <span>{fileLabel}</span>
      <span className="spacer" />
      <span>no upload</span>
      <span>{layerCount} {layerCount === 1 ? "layer" : "layers"}</span>
      <ZoomControl />
    </footer>
  );
}

const PRESETS = [0.5, 1, 2, 4];

function ZoomControl() {
  const scale = useEditorStore((s) => s.viewport.scale);
  const [open, setOpen] = useState(false);
  const pct = Math.round(scale * 100);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="zoom-control">
      <button className="zoom-btn" title="Zoom out (Ctrl -)" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>−</button>
      <button
        className="zoom-val"
        title="Zoom"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {pct}%
      </button>
      <button className="zoom-btn" title="Zoom in (Ctrl +)" aria-label="Zoom in" onClick={() => zoomBy(1.2)}>+</button>

      {open && (
        <div className="zoom-menu" role="menu" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { zoomToFit(); setOpen(false); }}>Zoom to fit <span>Ctrl 1</span></button>
          <button onClick={() => { zoomToSelection(); setOpen(false); }}>Zoom to selection <span>Ctrl 2</span></button>
          <button onClick={() => { resetZoom(); setOpen(false); }}>Zoom to 100% <span>Ctrl 0</span></button>
          <div className="zoom-sep" />
          {PRESETS.map((p) => (
            <button key={p} onClick={() => { setZoom(p); setOpen(false); }}>{p * 100}%</button>
          ))}
        </div>
      )}
    </div>
  );
}
