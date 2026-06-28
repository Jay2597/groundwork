import { describe, expect, test } from "vitest";
import { selectionBounds, commonValue, translateSelection, resizeSelection, selectionHasRadius } from "./multiSelect";
import type { RectNode, SceneNode } from "@/types/document";

function rect(id: string, x: number, y: number, w: number, h: number, over: Partial<RectNode> = {}): RectNode {
  return {
    id,
    type: "rect",
    name: id,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: "#000",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
    ...over,
  };
}

describe("selectionBounds", () => {
  test("encloses all nodes", () => {
    const b = selectionBounds([rect("a", 0, 0, 10, 10), rect("b", 20, 30, 10, 10)]);
    expect(b).toEqual({ x: 0, y: 0, width: 30, height: 40 });
  });
});

describe("commonValue", () => {
  test("returns the shared value", () => {
    expect(commonValue([rect("a", 0, 0, 10, 10, { opacity: 0.5 }), rect("b", 0, 0, 10, 10, { opacity: 0.5 })], "opacity")).toBe(0.5);
  });
  test("returns undefined when values differ (mixed)", () => {
    expect(commonValue([rect("a", 0, 0, 10, 10, { opacity: 0.5 }), rect("b", 0, 0, 10, 10, { opacity: 1 })], "opacity")).toBeUndefined();
  });
});

describe("translateSelection", () => {
  test("moves every node by the delta", () => {
    const out = translateSelection([rect("a", 0, 0, 10, 10), rect("b", 20, 20, 10, 10)], 5, -3);
    expect(out.map((n) => [n.x, n.y])).toEqual([
      [5, -3],
      [25, 17],
    ]);
  });
});

describe("resizeSelection", () => {
  test("scales positions and sizes about the box origin", () => {
    const nodes: SceneNode[] = [rect("a", 0, 0, 10, 10), rect("b", 10, 0, 10, 10)];
    const bounds = selectionBounds(nodes); // x0 w20
    const out = resizeSelection(nodes, bounds, 40, 10); // sx = 2
    expect(out[0].width).toBe(20);
    expect(out[1].x).toBe(20);
    expect(out[1].width).toBe(20);
  });

  test("guards against zero-size bounds", () => {
    const nodes = [rect("a", 5, 5, 0, 0)];
    expect(resizeSelection(nodes, { x: 5, y: 5, width: 0, height: 0 }, 10, 10)).toBe(nodes);
  });
});

describe("selectionHasRadius", () => {
  test("true when a rect or frame is present", () => {
    expect(selectionHasRadius([rect("a", 0, 0, 10, 10)])).toBe(true);
  });
});
