import {
  isGroundworkDocument,
  migrateDocument,
  type GroundworkDocument,
} from "@/types/document";

// Local-first file persistence using the File System Access API where
// available, with a download/upload fallback for browsers that lack it
// (e.g. Firefox). Nothing here touches a network — files live on disk.

const FILE_EXT = ".gwork";

interface FilePickerAcceptType {
  description: string;
  accept: Record<string, string[]>;
}

const GROUNDWORK_TYPES: FilePickerAcceptType[] = [
  { description: "Groundwork document", accept: { "application/json": [FILE_EXT] } },
];

function hasFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    "showSaveFilePicker" in window &&
    "showOpenFilePicker" in window
  );
}

function serialize(doc: GroundworkDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Save to a previously-opened handle if given, otherwise prompt for a location.
 * Returns the handle so callers can keep saving silently to the same file.
 */
export async function saveDocument(
  doc: GroundworkDocument,
  handle?: FileSystemFileHandle,
): Promise<FileSystemFileHandle | undefined> {
  const data = serialize(doc);

  if (hasFileSystemAccess()) {
    const target =
      handle ??
      (await window.showSaveFilePicker({
        suggestedName: `${doc.name}${FILE_EXT}`,
        types: GROUNDWORK_TYPES,
      }));
    const writable = await target.createWritable();
    await writable.write(data);
    await writable.close();
    return target;
  }

  downloadFallback(`${doc.name}${FILE_EXT}`, data);
  return undefined;
}

export interface OpenResult {
  document: GroundworkDocument;
  handle?: FileSystemFileHandle;
}

export async function openDocument(): Promise<OpenResult | null> {
  if (hasFileSystemAccess()) {
    const [handle] = await window.showOpenFilePicker({ types: GROUNDWORK_TYPES });
    const file = await handle.getFile();
    const document = await parseFile(file);
    return { document, handle };
  }

  const file = await uploadFallback();
  if (!file) return null;
  return { document: await parseFile(file) };
}

async function parseFile(file: File): Promise<GroundworkDocument> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isGroundworkDocument(parsed)) {
    throw new Error("That file isn't a recognizable Groundwork document.");
  }
  return migrateDocument(parsed);
}

function downloadFallback(filename: string, data: string): void {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function uploadFallback(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = FILE_EXT;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
