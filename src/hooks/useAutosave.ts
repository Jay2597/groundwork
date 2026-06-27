import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { activePage } from "@/types/document";
import { saveFile } from "@/lib/persistence/fileLibrary";
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
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer.current);
  }, [document, currentFileId]);
}
