import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { activePage, isFrame, type FrameNode } from "@/types/document";
import { exportRegionAsImage, exportStageAsImage } from "@/lib/export/exportImage";
import { downloadNodeSvg, downloadSvg } from "@/lib/export/exportSvg";
import { getStage } from "@/lib/stageRegistry";
import "./export.css";

/** Export panel: whole page, or per-frame PNG / SVG, plus batch export. */
export function ExportPanel() {
  const open = useUiStore((s) => s.exportOpen);
  const setOpen = useUiStore((s) => s.setExportOpen);
  const document = useEditorStore((s) => s.document);
  const viewport = useEditorStore((s) => s.viewport);

  if (!open) return null;

  const page = activePage(document);
  const frames = page.nodes.filter(isFrame);

  function framePng(frame: FrameNode) {
    const stage = getStage();
    if (stage) exportRegionAsImage(stage, frame, viewport, frame.name);
  }

  function pagePng() {
    const stage = getStage();
    if (!stage) return;
    if (page.nodes.length === 0) {
      exportStageAsImage(stage, { fileName: document.name });
      return;
    }
    const minX = Math.min(...page.nodes.map((n) => n.x));
    const minY = Math.min(...page.nodes.map((n) => n.y));
    const maxX = Math.max(...page.nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...page.nodes.map((n) => n.y + n.height));
    exportRegionAsImage(stage, { x: minX, y: minY, width: maxX - minX, height: maxY - minY }, viewport, document.name);
  }

  function exportAllFrames() {
    const stage = getStage();
    if (!stage) return;
    frames.forEach((frame, i) => {
      // Stagger downloads slightly so browsers don't drop concurrent saves.
      window.setTimeout(() => exportRegionAsImage(stage, frame, viewport, frame.name), i * 250);
    });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="dialog export-dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Export">
        <header className="dialog-head">
          <h2>Export</h2>
          <button className="dialog-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="dialog-body">
          <section className="exp-section">
            <div className="exp-title">This page</div>
            <div className="exp-actions">
              <button className="btn" onClick={pagePng}>PNG (2×)</button>
              <button className="btn" onClick={() => downloadSvg(document)}>SVG</button>
            </div>
          </section>

          <section className="exp-section">
            <div className="exp-title">
              Frames <span className="exp-count">{frames.length}</span>
              {frames.length > 1 && (
                <button className="btn sm" onClick={exportAllFrames}>Export all PNG</button>
              )}
            </div>
            {frames.length === 0 ? (
              <p className="exp-empty">No frames on this page yet. Press F to draw one.</p>
            ) : (
              <ul className="exp-list">
                {frames.map((frame) => (
                  <li key={frame.id} className="exp-row">
                    <span className="exp-name">{frame.name}</span>
                    <span className="exp-dim">{Math.round(frame.width)}×{Math.round(frame.height)}</span>
                    <button className="btn sm" onClick={() => framePng(frame)}>PNG</button>
                    <button className="btn sm" onClick={() => downloadNodeSvg(frame, frame.name)}>SVG</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="set-foot">Exports are generated on your device and downloaded directly.</p>
        </div>
      </div>
    </div>
  );
}
