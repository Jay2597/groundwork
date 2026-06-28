import { describe, expect, test } from "vitest";
import { TEMPLATES } from "./templates";
import { isGroundworkDocument, isFrame } from "@/types/document";

describe("TEMPLATES", () => {
  test("every template builds a valid document", () => {
    for (const t of TEMPLATES) {
      const doc = t.build();
      expect(isGroundworkDocument(doc)).toBe(true);
      expect(doc.pages.length).toBeGreaterThanOrEqual(1);
      expect(doc.pages[0].nodes.length).toBeGreaterThan(0);
    }
  });

  test("each builder returns a fresh document (no shared node ids)", () => {
    const a = TEMPLATES[0].build();
    const b = TEMPLATES[0].build();
    expect(a.pages[0].nodes[0].id).not.toBe(b.pages[0].nodes[0].id);
  });

  test("social template has the three expected frame sizes", () => {
    const social = TEMPLATES.find((t) => t.id === "social")!.build();
    const frames = social.pages[0].nodes.filter(isFrame);
    const sizes = frames.map((f) => `${f.width}x${f.height}`);
    expect(sizes).toContain("1080x1080");
    expect(sizes).toContain("1080x1920");
    expect(sizes).toContain("1200x675");
  });

  test("templates expose id/name/description metadata", () => {
    for (const t of TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });
});
