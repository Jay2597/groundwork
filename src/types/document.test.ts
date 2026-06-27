import { describe, expect, test } from "vitest";
import {
  activePage,
  createEmptyDocument,
  isGroundworkDocument,
  migrateDocument,
  type LegacyDocument,
} from "./document";

describe("document", () => {
  test("createEmptyDocument has one page that is active", () => {
    const doc = createEmptyDocument("Test");
    expect(doc.name).toBe("Test");
    expect(doc.pages).toHaveLength(1);
    expect(activePage(doc)).toBe(doc.pages[0]);
    expect(doc.pages[0].comments).toEqual([]);
  });

  test("recognizes v1 and v2 documents", () => {
    const v1 = { version: 1, name: "Old", canvas: { width: 1, height: 1, background: "#fff" }, nodes: [] };
    const v2 = createEmptyDocument();
    expect(isGroundworkDocument(v1)).toBe(true);
    expect(isGroundworkDocument(v2)).toBe(true);
    expect(isGroundworkDocument({})).toBe(false);
    expect(isGroundworkDocument(null)).toBe(false);
  });

  test("migrates a v1 document into a single page", () => {
    const v1: LegacyDocument = {
      version: 1,
      name: "Legacy",
      canvas: { width: 800, height: 600, background: "#eee" },
      nodes: [],
    };
    const migrated = migrateDocument(v1);
    expect(migrated.version).toBe(2);
    expect(migrated.pages).toHaveLength(1);
    expect(migrated.pages[0].canvas.width).toBe(800);
    expect(migrated.activePageId).toBe(migrated.pages[0].id);
    expect(migrated.styles).toEqual({ colors: [], texts: [] });
  });

  test("migration backfills comments on existing v2 pages", () => {
    const doc = createEmptyDocument();
    // simulate an older v2 page without comments
    const stripped = {
      ...doc,
      pages: doc.pages.map((p) => ({ ...p, comments: undefined as unknown as [] })),
    };
    const migrated = migrateDocument(stripped);
    expect(migrated.pages[0].comments).toEqual([]);
  });
});
