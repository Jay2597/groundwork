import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { activePage } from "@/types/document";
import { saveFile } from "@/lib/persistence/fileLibrary";
import { saveVersion, AUTO_INTERVAL_MS } from "@/lib/persistence/versionHistory";
import { captureThumbnail } from "@/lib/export/exportImage";
import { getStage } from "@/lib/stageRegistry";

const DEBOUNCE_MS = 600;

/**
 * Debounced autosave of the open document to its library file in IndexedDB.
 * On-device only — survives refreshes and crashes without contacting a server.
 * No-ops until a file is open (currentFileId set by the editor route).
 */
export function useAutosave(): void {
  const document = useEditorStore((s) => s.document);
  const currentFileId = useEditorStore((s) => s.currentFileId);
  const timer = useRef<number>();
  // In-memory throttle for periodic version snapshots (separate from autosave).
  const lastSnapshot = useRef<number>(0);

  useEffect(() => {
    if (!currentFileId) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const stage = getStage();
      const viewport = useEditorStore.getState().viewport;
      const thumbnail = stage
        ? captureThumbnail(stage, activePage(document).nodes, viewport)
        : undefined;
      void saveFile(currentFileId, document, thumbnail);

      // Periodic auto-snapshot into version history.
      const now = Date.now();
      if (lastSnapshot.current === 0) {
        lastSnapshot.current = now; // don't snapshot the very first load
      } else if (now - lastSnapshot.current >= AUTO_INTERVAL_MS) {
        lastSnapshot.current = now;
        void saveVersion(currentFileId, document, "auto");
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer.current);
  }, [document, currentFileId]);
}
