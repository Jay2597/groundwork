import { describe, expect, test } from "vitest";
import {
  booleanNodes,
  createPath,
  createRect,
  duplicateNode,
  frameFromNodes,
  groupNodes,
} from "./nodeFactory";
import type { RectNode } from "@/types/document";

function rect(id: string, x: number, y: number, w = 10, h = 10): RectNode {
  return {
    id,
    type: "rect",
    name: id,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: "#abc",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
  };
}

describe("nodeFactory", () => {
  test("createRect normalizes negative drags to top-left", () => {
    const r = createRect({ x: 50, y: 50, width: -30, height: -20 }, 1);
    expect(r.x).toBe(20);
    expect(r.y).toBe(30);
    expect(r.width).toBe(30);
    expect(r.height).toBe(20);
  });

  test("groupNodes computes bounds and relative children", () => {
    const g = groupNodes([rect("a", 10, 10), rect("b", 40, 30)], 1);
    expect(g.x).toBe(10);
    expect(g.y).toBe(10);
    expect(g.width).toBe(40); // (40+10) - 10
    expect(g.height).toBe(30); // (30+10) - 10
    expect(g.children[0].x).toBe(0);
    expect(g.children[1].x).toBe(30);
  });

  test("frameFromNodes wraps selection into a frame with relative children", () => {
    const f = frameFromNodes([rect("a", 30, 40), rect("b", 60, 80)], 1);
    expect(f.type).toBe("frame");
    expect(f.clipContent).toBe(true);
    expect(f.x).toBe(30);
    expect(f.y).toBe(40);
    expect(f.width).toBe(40); // (60+10) - 30
    expect(f.children[0]).toMatchObject({ id: "a", x: 0, y: 0 });
    expect(f.children[1]).toMatchObject({ id: "b", x: 30, y: 40 });
  });

  test("booleanNodes carries op and first fill", () => {
    const b = booleanNodes([rect("a", 0, 0), rect("b", 5, 5)], "subtract", 1);
    expect(b.type).toBe("boolean");
    expect(b.op).toBe("subtract");
    expect(b.fill).toBe("#abc");
    expect(b.children).toHaveLength(2);
  });

  test("createPath flattens points relative to origin", () => {
    const p = createPath([{ x: 10, y: 20 }, { x: 30, y: 60 }], true, 1);
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
    expect(p.points).toEqual([0, 0, 20, 40]);
    expect(p.closed).toBe(true);
  });

  test("duplicateNode assigns a fresh id and offsets position", () => {
    const original = rect("a", 0, 0);
    const clone = duplicateNode(original, 2);
    expect(clone.id).not.toBe(original.id);
    expect(clone.x).toBe(16);
    expect(clone.y).toBe(16);
  });
});
