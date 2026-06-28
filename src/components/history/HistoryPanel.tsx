import { useEffect, useState, useCallback } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import {
  listVersions,
  saveVersion,
  getVersionDoc,
  deleteVersion,
  type VersionMeta,
} from "@/lib/persistence/versionHistory";
import "./history.css";

/** Local version-history time machine: list, save, restore, and delete snapshots. */
export function HistoryPanel() {
  const open = useUiStore((s) => s.historyOpen);
  const setOpen = useUiStore((s) => s.setHistoryOpen);
  const fileId = useEditorStore((s) => s.currentFileId);
  const document = useEditorStore((s) => s.document);
  const loadDocument = useEditorStore((s) => s.loadDocument);

  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!fileId) return;
    setVersions(await listVersions(fileId));
  }, [fileId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  async function saveNow() {
    if (!fileId || busy) return;
    setBusy(true);
    await saveVersion(fileId, document, "manual");
    await refresh();
    setBusy(false);
  }

  async function restore(versionId: string) {
    if (!fileId) return;
    const doc = await getVersionDoc(fileId, versionId);
    if (doc) {
      loadDocument(doc);
      setOpen(false);
    }
  }

  async function remove(versionId: string) {
    if (!fileId) return;
    await deleteVersion(fileId, versionId);
    await refresh();
  }

  return (
    <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="dialog history-dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Version history">
        <header className="dialog-head">
          <h2>Version history</h2>
          <button className="btn sm" onClick={saveNow} disabled={busy || !fileId}>Save version</button>
          <button className="dialog-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="dialog-body history-body">
          {!fileId ? (
            <p className="set-foot">Open a file to use version history.</p>
          ) : versions.length === 0 ? (
            <p className="set-foot">No versions yet. Snapshots are saved automatically, or click “Save version”.</p>
          ) : (
            <ul className="hist-list">
              {versions.map((v) => (
                <li key={v.id} className="hist-row">
                  <span className={`hist-kind ${v.kind}`}>{v.kind === "manual" ? "★" : "•"}</span>
                  <span className="hist-name">{v.name}</span>
                  <span className="hist-time">{new Date(v.createdAt).toLocaleString()}</span>
                  <button className="btn sm" onClick={() => restore(v.id)}>Restore</button>
                  <button className="btn sm ghost" onClick={() => remove(v.id)} aria-label="Delete version">×</button>
                </li>
              ))}
            </ul>
          )}
          <p className="set-foot">Versions are stored on your device (IndexedDB). Auto-snapshots are kept periodically; named versions are kept indefinitely.</p>
        </div>
      </div>
    </div>
  );
}
