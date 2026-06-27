import { describe, expect, test } from "vitest";
import { layoutPositions } from "./autolayout";
import type { AutoLayout, FrameNode, RectNode } from "@/types/document";

function rect(id: string, w: number, h: number): RectNode {
  return {
    id,
    type: "rect",
    name: id,
    x: 0,
    y: 0,
    width: w,
    height: h,
    rotation: 0,
    fill: "#fff",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
  };
}

function frame(autoLayout: AutoLayout): FrameNode {
  return {
    id: "f",
    type: "frame",
    name: "f",
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    rotation: 0,
    fill: "#fff",
    opacity: 1,
    visible: true,
    locked: false,
    clipContent: true,
    children: [rect("a", 30, 30), rect("b", 40, 20)],
    autoLayout,
  };
}

describe("layoutPositions", () => {
  test("row layout advances by width + gap", () => {
    const pos = layoutPositions(frame({ direction: "row", gap: 10, padding: 8, align: "start" }));
    expect(pos.a).toEqual({ x: 8, y: 8 });
    expect(pos.b).toEqual({ x: 8 + 30 + 10, y: 8 });
  });

  test("column layout advances by height + gap", () => {
    const pos = layoutPositions(frame({ direction: "column", gap: 6, padding: 4, align: "start" }));
    expect(pos.a).toEqual({ x: 4, y: 4 });
    expect(pos.b).toEqual({ x: 4, y: 4 + 30 + 6 });
  });

  test("row center aligns on the cross axis", () => {
    const pos = layoutPositions(frame({ direction: "row", gap: 0, padding: 0, align: "center" }));
    // frame height 100, child a height 30 → y = 35
    expect(pos.a.y).toBe(35);
  });

  test("empty when no auto layout", () => {
    const f = frame({ direction: "row", gap: 0, padding: 0, align: "start" });
    expect(layoutPositions({ ...f, autoLayout: undefined })).toEqual({});
  });
});
