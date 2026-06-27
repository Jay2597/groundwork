import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { usePrefsStore } from "@/store/prefsStore";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { openDocument, saveDocument } from "@/lib/persistence/fileSystem";
import { createFile, importFile } from "@/lib/persistence/fileLibrary";
import { exportStageAsImage } from "@/lib/export/exportImage";
import { downloadSvg } from "@/lib/export/exportSvg";
import { getStage } from "@/lib/stageRegistry";
import "./topbar.css";

interface MenuItem {
  label: string;
  shortcut?: string;
  run: () => void;
  sep?: boolean;
}

export function TopBar() {
  const navigate = useNavigate();
  const document = useEditorStore((s) => s.document);
  const fileHandle = useEditorStore((s) => s.fileHandle);
  const renameDocument = useEditorStore((s) => s.renameDocument);
  const setFileHandle = useEditorStore((s) => s.setFileHandle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const setViewport = useEditorStore((s) => s.setViewport);

  const setExportPanelOpen = useUiStore((s) => s.setExportOpen);
  const setCodeOpen = useUiStore((s) => s.setCodeOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setPresentMode = useUiStore((s) => s.setPresentMode);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const commentMode = useUiStore((s) => s.commentMode);
  const toggleCommentMode = useUiStore((s) => s.toggleCommentMode);
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  const toggleLeft = useUiStore((s) => s.toggleLeft);
  const toggleRight = useUiStore((s) => s.toggleRight);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenu]);

  async function handleSave() {
    try {
      const handle = await saveDocument(document, fileHandle);
      if (handle) setFileHandle(handle);
    } catch (err) {
      reportError(err, "Couldn't save the file.");
    }
  }

  async function handleNew() {
    const id = await createFile("Untitled");
    navigate(`/editor/${id}`);
  }

  async function handleOpen() {
    try {
      const result = await openDocument();
      if (!result) return;
      const id = await importFile(result.document);
      navigate(`/editor/${id}`);
    } catch (err) {
      reportError(err, "Couldn't open that file.");
    }
  }

  function exportImage() {
    const stage = getStage();
    if (stage) exportStageAsImage(stage, { fileName: document.name, mimeType: "image/png" });
  }

  function reportError(err: unknown, fallback: string) {
    if (err instanceof DOMException && err.name === "AbortError") return; // user cancelled
    setError(err instanceof Error ? err.message : fallback);
    window.setTimeout(() => setError(null), 4000);
  }

  // Menus are built fresh each render so they capture live store actions.
  const ed = useEditorStore.getState;
  const prefs = usePrefsStore.getState;

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: "New file", shortcut: "Ctrl+N", run: () => void handleNew() },
      { label: "Open from disk…", shortcut: "Ctrl+O", run: () => void handleOpen() },
      { label: "Save to disk…", shortcut: "Ctrl+S", run: () => void handleSave() },
      { label: "Export…", run: () => setExportPanelOpen(true), sep: true },
      { label: "Back to files", run: () => navigate("/") },
    ],
    Edit: [
      { label: "Undo", shortcut: "Ctrl+Z", run: () => ed().undo() },
      { label: "Redo", shortcut: "Ctrl+Shift+Z", run: () => ed().redo() },
      { label: "Duplicate", shortcut: "Ctrl+D", run: () => ed().duplicateSelected(), sep: true },
      { label: "Copy", shortcut: "Ctrl+C", run: () => ed().copySelected() },
      { label: "Paste", shortcut: "Ctrl+V", run: () => ed().paste() },
      { label: "Delete", shortcut: "Del", run: () => ed().deleteSelected() },
      { label: "Select all", shortcut: "Ctrl+A", run: () => ed().selectAll(), sep: true },
      { label: "Command palette…", shortcut: "Ctrl+K", run: () => togglePalette() },
    ],
    View: [
      { label: "Zoom to 100%", run: () => setViewport({ scale: 1, x: 0, y: 0 }) },
      { label: `${prefs().showGrid ? "Hide" : "Show"} grid`, run: () => prefs().setPref("showGrid", !prefs().showGrid) },
      { label: `${prefs().snapping ? "Disable" : "Enable"} snapping`, run: () => prefs().setPref("snapping", !prefs().snapping) },
      { label: `${commentMode ? "Exit" : "Enter"} comment mode`, run: () => toggleCommentMode(), sep: true },
      { label: `${leftOpen ? "Hide" : "Show"} layers panel`, run: () => toggleLeft() },
      { label: `${rightOpen ? "Hide" : "Show"} properties panel`, run: () => toggleRight() },
      { label: "Present", run: () => setPresentMode(true), sep: true },
      { label: "Settings…", run: () => setSettingsOpen(true) },
    ],
    Object: [
      { label: "Group", shortcut: "Ctrl+G", run: () => ed().groupSelected() },
      { label: "Ungroup", shortcut: "Ctrl+Shift+G", run: () => ed().ungroupSelected() },
      { label: "Bring to front", shortcut: "]", run: () => ed().reorderSelected("front"), sep: true },
      { label: "Send to back", shortcut: "[", run: () => ed().reorderSelected("back") },
      { label: "Boolean union", run: () => ed().booleanSelected("union"), sep: true },
      { label: "Boolean subtract", run: () => ed().booleanSelected("subtract") },
      { label: "Boolean intersect", run: () => ed().booleanSelected("intersect") },
      { label: "Boolean exclude", run: () => ed().booleanSelected("exclude") },
      { label: "Make component", run: () => ed().createComponentFromSelection(), sep: true },
    ],
    Export: [
      { label: "Export PNG (2×)", run: exportImage },
      { label: "Export SVG", run: () => downloadSvg(document) },
      { label: "Export panel…", run: () => setExportPanelOpen(true), sep: true },
      { label: "View code (HTML/CSS)…", run: () => setCodeOpen(true) },
    ],
  };

  return (
    <header className="menubar">
      <button className="gw-logo brand-btn" onClick={() => navigate("/")} title="Back to files" aria-label="Back to files">
        <Logo size={24} />
      </button>
      <div className="gw-word menubar-word">Groundwork</div>

      <nav className="menus" aria-label="Application menus">
        {Object.keys(menus).map((name) => (
          <div key={name} className="menu-wrap">
            <button
              className={`menu${openMenu === name ? " open" : ""}`}
              aria-haspopup="menu"
              aria-expanded={openMenu === name}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu((m) => (m === name ? null : name));
              }}
              onMouseEnter={() => openMenu && setOpenMenu(name)}
            >
              {name}
            </button>
            {openMenu === name && (
              <div className="menu-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                {menus[name].map((item) => (
                  <button
                    key={item.label}
                    role="menuitem"
                    className={`menu-item${item.sep ? " sep" : ""}`}
                    onClick={() => {
                      item.run();
                      setOpenMenu(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <input
        className="doc-name"
        value={document.name}
        aria-label="Document name"
        onChange={(e) => renameDocument(e.target.value)}
      />

      <div className="menubar-center">
        <Toolbar />
      </div>

      <div className="menubar-right">
        <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-1" /></svg>
        </button>
        <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h1" /></svg>
        </button>
        <span className="chip green" title="No server — everything stays on this device">Offline-ready</span>
        <ThemeToggle />
        <button
          className="icon-btn"
          aria-pressed={commentMode}
          onClick={toggleCommentMode}
          title="Comment"
          aria-label="Comment mode"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </button>
        <button className="icon-btn" onClick={() => setCodeOpen(true)} title="View code (HTML/CSS)" aria-label="View code">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" /></svg>
        </button>
        <button className="icon-btn" onClick={() => setPresentMode(true)} title="Present" aria-label="Present">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="6 4 20 12 6 20 6 4" /></svg>
        </button>
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7.4 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 13.8 1.65 1.65 0 0 0 3 12.6V12a2 2 0 0 1 4 0" /></svg>
        </button>
        <button className="btn" onClick={() => void handleSave()}>Save</button>
        <button className="btn amber" onClick={() => setExportPanelOpen(true)}>Export</button>
      </div>

      {error && <div className="topbar-error" role="alert">{error}</div>}
    </header>
  );
}
