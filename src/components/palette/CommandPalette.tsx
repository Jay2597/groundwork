import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { insertImageFromPicker } from "@/lib/placeImage";
import { exportStageAsImage } from "@/lib/export/exportImage";
import { downloadSvg } from "@/lib/export/exportSvg";
import { downloadTokens } from "@/lib/export/exportTokens";
import { getStage } from "@/lib/stageRegistry";
import "./palette.css";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

/** Searchable command palette (Cmd/Ctrl+K). */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const setCodeOpen = useUiStore((s) => s.setCodeOpen);
  const setLintOpen = useUiStore((s) => s.setLintOpen);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);
  const setPresentMode = useUiStore((s) => s.setPresentMode);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const s = useEditorStore.getState();
    const close = () => setOpen(false);
    const wrap = (fn: () => void) => () => {
      fn();
      close();
    };
    return [
      { id: "tool-select", group: "Tools", label: "Move / Select", hint: "V", run: wrap(() => s.setTool("select")) },
      { id: "tool-frame", group: "Tools", label: "Frame", hint: "F", run: wrap(() => s.setTool("frame")) },
      { id: "tool-rect", group: "Tools", label: "Rectangle", hint: "R", run: wrap(() => s.setTool("rect")) },
      { id: "tool-ellipse", group: "Tools", label: "Ellipse", hint: "O", run: wrap(() => s.setTool("ellipse")) },
      { id: "tool-text", group: "Tools", label: "Text", hint: "T", run: wrap(() => s.setTool("text")) },
      { id: "tool-pen", group: "Tools", label: "Pen", hint: "P", run: wrap(() => s.setTool("pen")) },
      { id: "insert-image", group: "Insert", label: "Insert image…", run: wrap(() => void insertImageFromPicker()) },
      { id: "edit-dup", group: "Edit", label: "Duplicate", hint: "Ctrl+D", run: wrap(s.duplicateSelected) },
      { id: "edit-del", group: "Edit", label: "Delete", hint: "Del", run: wrap(s.deleteSelected) },
      { id: "edit-group", group: "Edit", label: "Group", hint: "Ctrl+G", run: wrap(s.groupSelected) },
      { id: "edit-frame", group: "Edit", label: "Frame selection", hint: "Ctrl+Alt+G", run: wrap(s.frameSelection) },
      { id: "edit-ungroup", group: "Edit", label: "Ungroup", hint: "Ctrl+Shift+G", run: wrap(s.ungroupSelected) },
      { id: "edit-component", group: "Edit", label: "Make component", run: wrap(s.createComponentFromSelection) },
      { id: "bool-union", group: "Boolean", label: "Union", run: wrap(() => s.booleanSelected("union")) },
      { id: "bool-subtract", group: "Boolean", label: "Subtract", run: wrap(() => s.booleanSelected("subtract")) },
      { id: "bool-intersect", group: "Boolean", label: "Intersect", run: wrap(() => s.booleanSelected("intersect")) },
      { id: "bool-exclude", group: "Boolean", label: "Exclude", run: wrap(() => s.booleanSelected("exclude")) },
      { id: "bool-flatten", group: "Boolean", label: "Flatten", hint: "Ctrl+E", run: wrap(s.flattenSelected) },
      { id: "arr-front", group: "Arrange", label: "Bring to front", hint: "]", run: wrap(() => s.reorderSelected("front")) },
      { id: "arr-back", group: "Arrange", label: "Send to back", hint: "[", run: wrap(() => s.reorderSelected("back")) },
      { id: "hist-undo", group: "Edit", label: "Undo", hint: "Ctrl+Z", run: wrap(s.undo) },
      { id: "hist-redo", group: "Edit", label: "Redo", hint: "Ctrl+Shift+Z", run: wrap(s.redo) },
      { id: "page-add", group: "Pages", label: "New page", run: wrap(s.addPage) },
      { id: "export-png", group: "Export", label: "Export PNG", run: wrap(() => { const st = getStage(); if (st) exportStageAsImage(st, { fileName: s.document.name }); }) },
      { id: "export-svg", group: "Export", label: "Export SVG", run: wrap(() => downloadSvg(s.document)) },
      { id: "export-tokens", group: "Export", label: "Export design tokens (JSON)", run: wrap(() => downloadTokens(s.document)) },
      { id: "export-panel", group: "Export", label: "Open export panel…", run: wrap(() => setExportOpen(true)) },
      { id: "export-code", group: "Export", label: "View code (HTML/CSS)…", run: wrap(() => setCodeOpen(true)) },
      { id: "review", group: "View", label: "Review (accessibility & lint)…", run: wrap(() => setLintOpen(true)) },
      { id: "present", group: "View", label: "Present", run: wrap(() => setPresentMode(true)) },
      { id: "settings", group: "View", label: "Settings…", run: wrap(() => setSettingsOpen(true)) },
      { id: "help", group: "View", label: "Keyboard shortcuts", run: wrap(() => setHelpOpen(true)) },
      { id: "home", group: "View", label: "Back to files", run: wrap(() => navigate("/")) },
    ];
  }, [navigate, setCodeOpen, setExportOpen, setLintOpen, setHelpOpen, setOpen, setPresentMode, setSettingsOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.group} ${c.label}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="palette-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          className="palette-input"
          autoFocus
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="palette-list">
          {filtered.length === 0 && <div className="palette-empty">No commands</div>}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              className={`palette-item${i === active ? " active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => c.run()}
            >
              <span className="palette-group">{c.group}</span>
              <span className="palette-label">{c.label}</span>
              {c.hint && <span className="palette-hint">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
