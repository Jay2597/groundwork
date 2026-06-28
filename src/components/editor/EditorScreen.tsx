import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/topbar/TopBar";
import { LayersPanel } from "@/components/layers/LayersPanel";
import { CanvasStage } from "@/components/canvas/CanvasStage";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { StatusBar } from "@/components/statusbar/StatusBar";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ExportPanel } from "@/components/export/ExportPanel";
import { CodePanel } from "@/components/code/CodePanel";
import { LintPanel } from "@/components/lint/LintPanel";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { PresentMode } from "@/components/present/PresentMode";
import { ShortcutsHelp } from "@/components/help/ShortcutsHelp";
import { PanelRail } from "@/components/editor/PanelRail";
import { PanelResizer } from "@/components/editor/PanelResizer";
import { useUiStore } from "@/store/uiStore";
import { usePrefsStore } from "@/store/prefsStore";
import { zoomToFit } from "@/lib/zoom";
import { getStage } from "@/lib/stageRegistry";

const RAIL = 40;
import { useAutosave } from "@/hooks/useAutosave";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEditorStore } from "@/store/editorStore";
import { loadFile } from "@/lib/persistence/fileLibrary";
import "@/components/canvas/canvas.css";

/** The editor route — loads the requested library file, then renders the editor. */
export function EditorScreen() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const setCurrentFile = useEditorStore((s) => s.setCurrentFile);
  const [ready, setReady] = useState(false);

  useAutosave();
  useKeyboardShortcuts();

  useEffect(() => {
    if (!fileId) {
      navigate("/", { replace: true });
      return;
    }
    let active = true;
    setReady(false);
    loadFile(fileId).then((doc) => {
      if (!active) return;
      if (!doc) {
        navigate("/", { replace: true });
        return;
      }
      loadDocument(doc);
      setCurrentFile(fileId);
      setReady(true);
      // Fit content once the canvas has actually been measured (retry until sized).
      let tries = 0;
      const fitWhenSized = () => {
        if (!active) return;
        const stage = getStage();
        if (stage && stage.width() > 1 && stage.height() > 1) {
          zoomToFit();
        } else if (tries++ < 60) {
          requestAnimationFrame(fitWhenSized);
        }
      };
      requestAnimationFrame(fitWhenSized);
    });
    return () => {
      active = false;
      setCurrentFile(undefined);
    };
  }, [fileId, navigate, loadDocument, setCurrentFile]);

  if (!ready) return <div className="boot-screen">Opening file…</div>;

  return <EditorShell />;
}

function EditorShell() {
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  const toggleLeft = useUiStore((s) => s.toggleLeft);
  const toggleRight = useUiStore((s) => s.toggleRight);
  const leftWidth = usePrefsStore((s) => s.leftWidth);
  const rightWidth = usePrefsStore((s) => s.rightWidth);

  const cols = `${leftOpen ? leftWidth : RAIL}px 1fr ${rightOpen ? rightWidth : RAIL}px`;

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body" style={{ gridTemplateColumns: cols }}>
        {leftOpen ? <LayersPanel /> : <PanelRail side="left" onExpand={toggleLeft} />}
        <CanvasStage />
        {rightOpen ? <PropertiesPanel /> : <PanelRail side="right" onExpand={toggleRight} />}
        {leftOpen && <PanelResizer side="left" />}
        {rightOpen && <PanelResizer side="right" />}
      </div>
      <StatusBar />
      <ContextMenu />
      <CommandPalette />
      <SettingsDialog />
      <ExportPanel />
      <CodePanel />
      <LintPanel />
      <HistoryPanel />
      <PresentMode />
      <ShortcutsHelp />
    </div>
  );
}
