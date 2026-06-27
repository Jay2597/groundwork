import { describe, expect, test } from "vitest";
import { flattenNodes } from "./flatten";
import type { EllipseNode, RectNode } from "@/types/document";

function rect(x: number, y: number, w: number, h: number): RectNode {
  return {
    id: `r-${x}-${y}`, type: "rect", name: "r", x, y, width: w, height: h,
    rotation: 0, fill: "#123456", opacity: 1, visible: true, locked: false, cornerRadius: 0,
  };
}

describe("flatten", () => {
  test("two rects flatten into a compound path with two subpaths", () => {
    const path = flattenNodes([rect(0, 0, 100, 100), rect(40, 40, 20, 20)], 1);
    expect(path).not.toBeNull();
    expect(path!.type).toBe("path");
    expect(path!.subpaths).toHaveLength(2);
    expect(path!.x).toBe(0);
    expect(path!.y).toBe(0);
    expect(path!.width).toBe(100);
    expect(path!.height).toBe(100);
    // first contour is the outer rect: 4 points = 8 numbers
    expect(path!.subpaths![0].points).toHaveLength(8);
    expect(path!.subpaths![0].closed).toBe(true);
  });

  test("inherits the topmost source fill", () => {
    const a = rect(0, 0, 50, 50);
    const b = { ...rect(10, 10, 10, 10), fill: "#abcdef" };
    const path = flattenNodes([a, b], 1);
    expect(path!.fill).toBe("#abcdef");
  });

  test("offsets contours to the bounding-box origin", () => {
    const path = flattenNodes([rect(100, 200, 40, 40)], 1);
    expect(path!.x).toBe(100);
    expect(path!.y).toBe(200);
    expect(path!.subpaths![0].points.slice(0, 2)).toEqual([0, 0]);
  });

  test("ellipses become sampled polygons", () => {
    const e: EllipseNode = {
      id: "e", type: "ellipse", name: "e", x: 0, y: 0, width: 80, height: 80,
      rotation: 0, fill: "#000", opacity: 1, visible: true, locked: false,
    };
    const path = flattenNodes([e], 1);
    expect(path!.subpaths![0].points.length).toBeGreaterThan(20);
  });
});
