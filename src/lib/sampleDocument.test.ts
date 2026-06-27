import { describe, expect, test } from "vitest";
import { createSampleDocument } from "./sampleDocument";
import { activePage, isGroundworkDocument } from "@/types/document";
import { pageToCode } from "./export/exportCode";

describe("sampleDocument", () => {
  test("is a valid document with content", () => {
    const doc = createSampleDocument();
    expect(isGroundworkDocument(doc)).toBe(true);
    const page = activePage(doc);
    expect(page.nodes.length).toBeGreaterThan(0);
    expect(page.nodes[0].type).toBe("frame");
  });

  test("renders to code without throwing", () => {
    const { html, css } = pageToCode(createSampleDocument());
    expect(html).toContain('<div class="canvas">');
    expect(css).toContain("linear-gradient");
  });
});
