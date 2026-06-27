import { describe, expect, test } from "vitest";
import { fullHtmlDocument, nodeToCode, pageToCode } from "./exportCode";
import { createEmptyDocument, type BooleanNode, type FrameNode, type PathNode, type RectNode } from "@/types/document";

function rect(over: Partial<RectNode> = {}): RectNode {
  return {
    id: "r1", type: "rect", name: "Box", x: 10, y: 20, width: 100, height: 60,
    rotation: 0, fill: "#d9d9d9", opacity: 1, visible: true, locked: false, cornerRadius: 0,
    ...over,
  };
}

describe("exportCode", () => {
  test("rect emits background, size and corner radius", () => {
    const { html, css } = nodeToCode(rect({ cornerRadius: 12 }));
    expect(html).toContain('<div class="box-r1">');
    expect(css).toContain("background: #d9d9d9");
    expect(css).toContain("border-radius: 12px");
    expect(css).toContain("width: 100px");
  });

  test("rect stroke and shadow become border and box-shadow", () => {
    const { css } = nodeToCode(rect({ stroke: { color: "#000", width: 2 }, shadow: { color: "#0008", blur: 8, offsetX: 0, offsetY: 4 } }));
    expect(css).toContain("border: 2px solid #000");
    expect(css).toContain("box-shadow: 0px 4px 8px #0008");
  });

  test("ellipse is a 50% radius div", () => {
    const { css } = nodeToCode({ ...rect(), type: "ellipse" } as never);
    expect(css).toContain("border-radius: 50%");
  });

  test("text emits a <p> with font styles", () => {
    const { html, css } = nodeToCode({
      id: "t1", type: "text", name: "Label", x: 0, y: 0, width: 200, height: 30,
      rotation: 0, fill: "#111", opacity: 1, visible: true, locked: false,
      text: "Hello", fontSize: 24, fontFamily: "Inter", fontStyle: "bold", align: "center",
    });
    expect(html).toContain("<p");
    expect(html).toContain("Hello");
    expect(css).toContain("font-size: 24px");
    expect(css).toContain("font-weight: 700");
    expect(css).toContain("text-align: center");
  });

  test("auto-layout frame becomes flexbox", () => {
    const frame: FrameNode = {
      id: "f1", type: "frame", name: "Row", x: 0, y: 0, width: 300, height: 100,
      rotation: 0, fill: "#fff", opacity: 1, visible: true, locked: false, clipContent: true,
      children: [rect()], autoLayout: { direction: "row", gap: 12, padding: 16, align: "center" },
    };
    const { css } = nodeToCode(frame);
    expect(css).toContain("display: flex");
    expect(css).toContain("flex-direction: row");
    expect(css).toContain("gap: 12px");
    expect(css).toContain("align-items: center");
  });

  test("path becomes an inline svg polygon", () => {
    const path: PathNode = {
      id: "p1", type: "path", name: "Tri", x: 0, y: 0, width: 50, height: 50,
      rotation: 0, fill: "#f00", opacity: 1, visible: true, locked: false,
      points: [0, 0, 50, 0, 25, 50], closed: true,
    };
    const { html } = nodeToCode(path);
    expect(html).toContain("<svg");
    expect(html).toContain("<polygon");
    expect(html).toContain('fill="#f00"');
  });

  test("boolean subtract emits an svg mask", () => {
    const bool: BooleanNode = {
      id: "bo1", type: "boolean", name: "Cut", x: 0, y: 0, width: 100, height: 100,
      rotation: 0, fill: "#222", opacity: 1, visible: true, locked: false, op: "subtract",
      children: [rect({ id: "a", x: 0, y: 0 }), rect({ id: "b", x: 40, y: 40 })],
    };
    const { html } = nodeToCode(bool);
    expect(html).toContain("<mask");
    expect(html).toContain('mask="url(#b-bo1)"');
  });

  test("pageToCode wraps nodes in a sized canvas", () => {
    const doc = createEmptyDocument("Test");
    doc.pages[0].nodes = [rect()];
    const { html, css } = pageToCode(doc);
    expect(html).toContain('<div class="canvas">');
    expect(css).toContain(".canvas {");
    expect(css).toContain("width: 1440px");
  });

  test("fullHtmlDocument is a standalone page", () => {
    const doc = createEmptyDocument("Site");
    doc.pages[0].nodes = [rect()];
    const out = fullHtmlDocument(doc);
    expect(out).toContain("<!doctype html>");
    expect(out).toContain("<style>");
    expect(out).toContain('<div class="canvas">');
  });
});
