import { describe, expect, test } from "vitest";
import { applyConstraints } from "./constraints";
import type { Constraint, RectNode, SceneNode } from "@/types/document";

function child(over: Partial<RectNode> & { constraintH?: Constraint; constraintV?: Constraint }): SceneNode {
  return {
    id: "c",
    type: "rect",
    name: "c",
    x: 10,
    y: 10,
    width: 20,
    height: 20,
    rotation: 0,
    fill: "#fff",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
    ...over,
  };
}

describe("applyConstraints", () => {
  test("min keeps position and size", () => {
    const [c] = applyConstraints([child({})], 100, 100, 200, 200);
    expect(c.x).toBe(10);
    expect(c.width).toBe(20);
  });

  test("max pins to the right edge", () => {
    // right margin = 100 - (10 + 20) = 70 → new x = 200 - 70 - 20 = 110
    const [c] = applyConstraints([child({ constraintH: "max" })], 100, 100, 200, 200);
    expect(c.x).toBe(110);
    expect(c.width).toBe(20);
  });

  test("stretch grows width keeping both margins", () => {
    // left=10, right=70 → new width = 200 - 10 - 70 = 120
    const [c] = applyConstraints([child({ constraintH: "stretch" })], 100, 100, 200, 200);
    expect(c.x).toBe(10);
    expect(c.width).toBe(120);
  });

  test("scale scales position and size proportionally", () => {
    const [c] = applyConstraints([child({ constraintH: "scale", constraintV: "scale" })], 100, 100, 200, 100);
    expect(c.x).toBe(20);
    expect(c.width).toBe(40);
    expect(c.y).toBe(10);
    expect(c.height).toBe(20);
  });

  test("center keeps the child centered", () => {
    // center x = 20, ratio 2 → 40 → x = 40 - 10 = 30
    const [c] = applyConstraints([child({ constraintH: "center" })], 100, 100, 200, 100);
    expect(c.x).toBe(30);
  });
});
