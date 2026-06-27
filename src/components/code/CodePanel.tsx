import { useMemo, useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { activePage } from "@/types/document";
import { findNode } from "@/lib/tree";
import { downloadHtmlDocument, selectionToCode } from "@/lib/export/exportCode";
import "./code.css";

/** Live HTML/CSS "dev mode" for the current selection (or whole page). */
export function CodePanel() {
  const open = useUiStore((s) => s.codeOpen);
  const setOpen = useUiStore((s) => s.setCodeOpen);
  const document = useEditorStore((s) => s.document);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const [tab, setTab] = useState<"html" | "css">("html");
  const [copied, setCopied] = useState(false);

  const selected = selectedIds.length === 1 ? findNode(activePage(document).nodes, selectedIds[0]) : undefined;

  const code = useMemo(() => selectionToCode(document, selected), [document, selected]);

  if (!open) return null;

  const text = tab === "html" ? code.html : code.css;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked; ignore
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="dialog code-dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Code">
        <header className="dialog-head">
          <h2>Code <span className="code-target">{selected ? selected.name : "Whole page"}</span></h2>
          <button className="dialog-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="code-bar">
          <div className="code-tabs">
            <button className={`code-tab${tab === "html" ? " active" : ""}`} onClick={() => setTab("html")}>HTML</button>
            <button className={`code-tab${tab === "css" ? " active" : ""}`} onClick={() => setTab("css")}>CSS</button>
          </div>
          <div className="code-actions">
            <button className="btn sm" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
            <button className="btn sm amber" onClick={() => downloadHtmlDocument(document)} title="Download the whole page as a standalone .html file">
              Download .html
            </button>
          </div>
        </div>

        <pre className="code-block scroll"><code>{text}</code></pre>

        <p className="set-foot">Updates live as you edit. Select a layer for its code, or deselect for the full page.</p>
      </div>
    </div>
  );
}
