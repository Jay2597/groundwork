import { describe, expect, test } from "vitest";
import { trueBooleanPath, booleanRings } from "./trueBoolean";
import { ringArea } from "./polybool";
import type { RectNode } from "@/types/document";

function rect(id: string, x: number, y: number, w: number, h: number): RectNode {
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
  };
}

describe("booleanRings", () => {
  const A = [0, 0, 10, 0, 10, 10, 0, 10];
  const B = [5, 5, 15, 5, 15, 15, 5, 15];

  test("union area", () => {
    const r = booleanRings([A, B], "union");
    expect(r!.reduce((s, x) => s + ringArea(x), 0)).toBeCloseTo(175, 3);
  });
  test("exclude (xor) area is symmetric difference", () => {
    const r = booleanRings([A, B], "exclude");
    // 175 union - 25 intersection = 150
    expect(r!.reduce((s, x) => s + ringArea(x), 0)).toBeCloseTo(150, 3);
  });
});

describe("trueBooleanPath", () => {
  test("produces a compound path with correct bounds for subtract", () => {
    const path = trueBooleanPath([rect("a", 0, 0, 10, 10), rect("b", 5, 5, 10, 10)], "subtract", 1);
    expect(path).not.toBeNull();
    expect(path!.type).toBe("path");
    expect(path!.subpaths).toBeDefined();
    // subtract bounds stay within the subject (0,0,10,10)
    expect(path!.x).toBeCloseTo(0, 3);
    expect(path!.y).toBeCloseTo(0, 3);
    expect(path!.width).toBeCloseTo(10, 3);
    expect(path!.height).toBeCloseTo(10, 3);
  });

  test("returns null for a single node", () => {
    expect(trueBooleanPath([rect("a", 0, 0, 10, 10)], "union", 1)).not.toBeNull();
  });
});
