import { describe, expect, test } from "vitest";
import { tailwindClasses, pageToReact, nodeToReact } from "./exportReact";
import { createEmptyDocument, type FrameNode, type RectNode, type TextNode } from "@/types/document";

function rect(over: Partial<RectNode>): RectNode {
  return {
    id: "r", type: "rect", name: "Card", x: 10, y: 20, width: 120, height: 48,
    rotation: 0, fill: "#f2a33c", opacity: 1, visible: true, locked: false, cornerRadius: 8,
    ...over,
  };
}

describe("tailwindClasses", () => {
  test("box: absolute placement, size, bg, radius (arbitrary values)", () => {
    const c = tailwindClasses(rect({}), true);
    expect(c).toContain("absolute");
    expect(c).toContain("left-[10px]");
    expect(c).toContain("top-[20px]");
    expect(c).toContain("w-[120px]");
    expect(c).toContain("h-[48px]");
    expect(c).toContain("bg-[#f2a33c]");
    expect(c).toContain("rounded-[8px]");
  });

  test("ellipse becomes rounded-full", () => {
    expect(tailwindClasses(rect({ type: "ellipse" } as never), false)).toContain("rounded-full");
  });

  test("text maps size, weight and color", () => {
    const t: TextNode = {
      ...rect({}), type: "text", text: "Hi", fontSize: 24, fontFamily: "sans", fontStyle: "bold", align: "center",
    } as unknown as TextNode;
    const c = tailwindClasses(t, false);
    expect(c).toContain("text-[24px]");
    expect(c).toContain("font-bold");
    expect(c).toContain("text-center");
    expect(c).toContain("text-[#f2a33c]");
  });

  test("auto-layout frame maps to flex utilities", () => {
    const f: FrameNode = {
      ...rect({}), type: "frame", clipContent: true, children: [],
      autoLayout: { direction: "row", gap: 12, padding: 16, align: "center", justify: "space-between" },
    } as unknown as FrameNode;
    const c = tailwindClasses(f, true);
    expect(c).toContain("flex");
    expect(c).toContain("flex-row");
    expect(c).toContain("gap-[12px]");
    expect(c).toContain("items-center");
    expect(c).toContain("justify-between");
  });
});

describe("pageToReact / nodeToReact", () => {
  test("emits a named component wrapping a canvas div", () => {
    const doc = createEmptyDocument("My Design");
    doc.pages[0].nodes = [rect({})];
    const out = pageToReact(doc);
    expect(out).toContain("export function MyDesign()");
    expect(out).toContain("<div");
    expect(out).toContain("bg-[#f2a33c]");
  });

  test("nodeToReact places the node at its own origin", () => {
    const out = nodeToReact(rect({ name: "Button" }));
    expect(out).toContain("export function Button()");
    expect(out).toContain("w-[120px]");
  });
});
