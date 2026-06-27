import { get, set, del } from "idb-keyval";
import { nanoid } from "nanoid";
import {
  activePage,
  createEmptyDocument,
  isGroundworkDocument,
  migrateDocument,
  type GroundworkDocument,
} from "@/types/document";

// A lean, on-device multi-file library backed by IndexedDB. Each document is
// stored under its own key; a single index holds lightweight metadata for the
// Home browser. Nothing here touches the network — it's the browser's own DB.

const INDEX_KEY = "gw:index";
const fileKey = (id: string) => `gw:file:${id}`;

export interface FileMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  layerCount: number;
  /** A small PNG data URL preview, rendered on save. */
  thumbnail?: string;
}

export async function listFiles(): Promise<FileMeta[]> {
  const index = (await get<FileMeta[]>(INDEX_KEY)) ?? [];
  return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadFile(id: string): Promise<GroundworkDocument | null> {
  const doc = await get(fileKey(id));
  if (!isGroundworkDocument(doc)) return null;
  return migrateDocument(doc);
}

export async function saveFile(
  id: string,
  doc: GroundworkDocument,
  thumbnail?: string,
): Promise<void> {
  await set(fileKey(id), doc);
  const existing = (await get<FileMeta[]>(INDEX_KEY)) ?? [];
  const prev = existing.find((m) => m.id === id);
  await upsertMeta({
    id,
    name: doc.name,
    createdAt: prev?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    layerCount: doc.pages.reduce((sum, p) => sum + p.nodes.length, 0),
    thumbnail: thumbnail ?? prev?.thumbnail,
  });
}

export async function createFile(name = "Untitled"): Promise<string> {
  const id = nanoid(8);
  await saveFile(id, createEmptyDocument(name));
  return id;
}

/** Import an externally-opened document as a new library file. */
export async function importFile(doc: GroundworkDocument): Promise<string> {
  const id = nanoid(8);
  await saveFile(id, doc);
  return id;
}

export async function deleteFile(id: string): Promise<void> {
  await del(fileKey(id));
  const index = (await get<FileMeta[]>(INDEX_KEY)) ?? [];
  await set(INDEX_KEY, index.filter((m) => m.id !== id));
}

export async function renameFile(id: string, name: string): Promise<void> {
  const doc = await loadFile(id);
  if (!doc) return;
  await saveFile(id, { ...doc, name });
}

export async function duplicateFile(id: string): Promise<string | null> {
  const doc = await loadFile(id);
  if (!doc) return null;
  const index = (await get<FileMeta[]>(INDEX_KEY)) ?? [];
  const meta = index.find((m) => m.id === id);
  const newId = nanoid(8);
  await saveFile(newId, { ...doc, name: `${doc.name} copy` }, meta?.thumbnail);
  return newId;
}

async function upsertMeta(meta: FileMeta): Promise<void> {
  const index = (await get<FileMeta[]>(INDEX_KEY)) ?? [];
  const next = [meta, ...index.filter((m) => m.id !== meta.id)];
  await set(INDEX_KEY, next);
}

// activePage re-exported for callers that compute previews from a loaded doc.
export { activePage };
