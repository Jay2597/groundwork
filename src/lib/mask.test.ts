import { describe, expect, test } from "vitest";
import { firstMaskIndex, maskOutline } from "./mask";
import type { EllipseNode, RectNode, SceneNode } from "@/types/document";

function rect(over: Partial<RectNode>): RectNode {
  return {
    id: "r",
    type: "rect",
    name: "r",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    fill: "#000",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
    ...over,
  };
}

describe("firstMaskIndex", () => {
  test("finds the first visible mask", () => {
    const children: SceneNode[] = [rect({ id: "a" }), rect({ id: "b", isMask: true }), rect({ id: "c", isMask: true })];
    expect(firstMaskIndex(children)).toBe(1);
  });
  test("ignores hidden masks", () => {
    expect(firstMaskIndex([rect({ isMask: true, visible: false })])).toBe(-1);
  });
  test("-1 when no mask", () => {
    expect(firstMaskIndex([rect({})])).toBe(-1);
  });
});

describe("maskOutline", () => {
  test("rect outline is its four corners offset by position", () => {
    expect(maskOutline(rect({ x: 5, y: 5, width: 10, height: 20 }))).toEqual([5, 5, 15, 5, 15, 25, 5, 25]);
  });
  test("ellipse outline samples a polygon of the right extent", () => {
    const ell: EllipseNode = { ...rect({ width: 20, height: 20 }), type: "ellipse" } as EllipseNode;
    const pts = maskOutline(ell, 4);
    expect(pts.length).toBe(8); // 4 segments × 2 coords
    // first sampled point at angle 0 → (cx + rx, cy) = (20, 10)
    expect(pts[0]).toBeCloseTo(20);
    expect(pts[1]).toBeCloseTo(10);
  });
});
