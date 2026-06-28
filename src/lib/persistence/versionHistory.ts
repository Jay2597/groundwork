import { get, set } from "idb-keyval";
import { nanoid } from "nanoid";
import { isGroundworkDocument, migrateDocument, type GroundworkDocument } from "@/types/document";

// On-device version history. Periodic auto-snapshots plus named manual versions
// are kept per file in IndexedDB — a local "time machine" that never touches the
// network. The pure helpers (pruning, snapshot scheduling) are unit-tested; the
// IndexedDB calls are thin wrappers around them.

const versionsKey = (fileId: string) => `gw:versions:${fileId}`;

export type VersionKind = "auto" | "manual";

export interface Version {
  id: string;
  fileId: string;
  name: string;
  kind: VersionKind;
  createdAt: number;
  doc: GroundworkDocument;
}

/** Lightweight listing shape (no document payload). */
export interface VersionMeta {
  id: string;
  name: string;
  kind: VersionKind;
  createdAt: number;
}

export const DEFAULT_MAX_AUTO = 20;
export const AUTO_INTERVAL_MS = 5 * 60 * 1000;

/** Whether a new auto-snapshot is due (no auto snapshot, or the last is stale). */
export function shouldAutoSnapshot(versions: VersionMeta[], now: number, intervalMs = AUTO_INTERVAL_MS): boolean {
  const lastAuto = versions.filter((v) => v.kind === "auto").reduce((max, v) => Math.max(max, v.createdAt), 0);
  return now - lastAuto >= intervalMs;
}

/**
 * Keep every manual version, but cap auto-snapshots at `maxAuto` (most recent).
 * Returns the retained list, newest first.
 */
export function pruneVersions<T extends VersionMeta>(versions: T[], maxAuto = DEFAULT_MAX_AUTO): T[] {
  const sorted = [...versions].sort((a, b) => b.createdAt - a.createdAt);
  const manual = sorted.filter((v) => v.kind === "manual");
  const auto = sorted.filter((v) => v.kind === "auto").slice(0, maxAuto);
  return [...manual, ...auto].sort((a, b) => b.createdAt - a.createdAt);
}

function toMeta(v: Version): VersionMeta {
  return { id: v.id, name: v.name, kind: v.kind, createdAt: v.createdAt };
}

/** List a file's versions, newest first (metadata only). */
export async function listVersions(fileId: string): Promise<VersionMeta[]> {
  const all = (await get<Version[]>(versionsKey(fileId))) ?? [];
  return [...all].sort((a, b) => b.createdAt - a.createdAt).map(toMeta);
}

/** Save a snapshot of the document; prunes old auto-snapshots. Returns its id. */
export async function saveVersion(
  fileId: string,
  doc: GroundworkDocument,
  kind: VersionKind,
  name?: string,
  maxAuto = DEFAULT_MAX_AUTO,
): Promise<string> {
  const all = (await get<Version[]>(versionsKey(fileId))) ?? [];
  const version: Version = {
    id: nanoid(8),
    fileId,
    kind,
    name: name ?? defaultName(kind),
    createdAt: Date.now(),
    doc,
  };
  const pruned = pruneVersions([...all, version], maxAuto);
  const keepIds = new Set(pruned.map((v) => v.id));
  await set(versionsKey(fileId), [...all, version].filter((v) => keepIds.has(v.id)));
  return version.id;
}

/** Load a single version's document (migrated forward), or null. */
export async function getVersionDoc(fileId: string, versionId: string): Promise<GroundworkDocument | null> {
  const all = (await get<Version[]>(versionsKey(fileId))) ?? [];
  const found = all.find((v) => v.id === versionId);
  if (!found || !isGroundworkDocument(found.doc)) return null;
  return migrateDocument(found.doc);
}

export async function deleteVersion(fileId: string, versionId: string): Promise<void> {
  const all = (await get<Version[]>(versionsKey(fileId))) ?? [];
  await set(versionsKey(fileId), all.filter((v) => v.id !== versionId));
}

function defaultName(kind: VersionKind): string {
  const d = new Date();
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return kind === "auto" ? `Autosave ${time}` : `Version ${time}`;
}
