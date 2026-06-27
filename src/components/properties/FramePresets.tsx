import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { activePage } from "@/types/document";
import { getStage } from "@/lib/stageRegistry";
import { createFrame } from "@/lib/nodeFactory";
import { countNodes } from "@/lib/tree";
import { IcChevronRight } from "@/components/ui/Icons";

interface Preset {
  label: string;
  width: number;
  height: number;
  hint: string;
}

// Common artboard sizes. Shown when the Frame tool is active.
const PRESETS: Preset[] = [
  { label: "Desktop", width: 1440, height: 1024, hint: "1440 × 1024" },
  { label: "Desktop HD", width: 1920, height: 1080, hint: "1920 × 1080" },
  { label: "Slide", width: 1920, height: 1080, hint: "16:9 · 1920 × 1080" },
  { label: "Tablet", width: 834, height: 1194, hint: "834 × 1194" },
  { label: "Mobile", width: 393, height: 852, hint: "iPhone · 393 × 852" },
  { label: "Mobile S", width: 360, height: 800, hint: "Android · 360 × 800" },
  { label: "Social", width: 1080, height: 1080, hint: "Square · 1080 × 1080" },
];

export function FramePresets() {
  const nodes = useEditorStore((s) => activePage(s.document).nodes);
  const addNode = useEditorStore((s) => s.addNode);
  const select = useEditorStore((s) => s.select);
  const setTool = useEditorStore((s) => s.setTool);
  const toggleRight = useUiStore((s) => s.toggleRight);

  function place(preset: Preset) {
    const center = viewCenter();
    const box = {
      x: Math.round(center.x - preset.width / 2),
      y: Math.round(center.y - preset.height / 2),
      width: preset.width,
      height: preset.height,
    };
    const frame = { ...createFrame(box, countNodes(nodes) + 1), name: preset.label };
    addNode(frame);
    select([frame.id]);
    setTool("select");
  }

  return (
    <aside className="panel r scroll" aria-label="Frame presets">
      <div className="insp-head">
        <span className="insp-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v18M16 3v18M3 8h18M3 16h18" /></svg>
        </span>
        <span className="insp-name">Frame</span>
        <button className="panel-collapse" onClick={toggleRight} title="Collapse panel" aria-label="Collapse properties panel">
          <IcChevronRight />
        </button>
      </div>

      <section className="group">
        <div className="ghead">PRESETS</div>
        <div className="preset-list">
          {PRESETS.map((preset) => (
            <button key={preset.label} className="preset-row" onClick={() => place(preset)}>
              <span className="preset-icon" aria-hidden>{preset.width >= preset.height ? "▭" : "▯"}</span>
              <span className="preset-label">{preset.label}</span>
              <span className="preset-dim">{preset.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="prop-hint">…or drag on the canvas to draw a custom frame.</p>
    </aside>
  );
}

/** Center of the visible canvas, in document coordinates. */
function viewCenter(): { x: number; y: number } {
  const stage = getStage();
  if (!stage) return { x: 0, y: 0 };
  return stage
    .getAbsoluteTransform()
    .copy()
    .invert()
    .point({ x: stage.width() / 2, y: stage.height() / 2 });
}
