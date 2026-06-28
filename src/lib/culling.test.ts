import { describe, expect, test } from "vitest";
import { visibleDocRect, intersects, nodeBounds, cullNodes } from "./culling";
import type { RectNode, SceneNode } from "@/types/document";

function rect(id: string, x: number, y: number, w = 50, h = 50, rotation = 0): RectNode {
  return {
    id, type: "rect", name: id, x, y, width: w, height: h, rotation,
    fill: "#000", opacity: 1, visible: true, locked: false, cornerRadius: 0,
  };
}

describe("visibleDocRect", () => {
  test("maps the stage viewport to document space", () => {
    // viewport at origin, scale 1, 800x600 stage, no margin
    expect(visibleDocRect({ scale: 1, x: 0, y: 0 }, 800, 600)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });
  test("accounts for pan and zoom + margin", () => {
    // panned by (-100,-50) at scale 2 → doc origin 50,25; size halved; margin expands
    const r = visibleDocRect({ scale: 2, x: -100, y: -50 }, 800, 600, 10);
    expect(r.x).toBe(50 - 10);
    expect(r.y).toBe(25 - 10);
    expect(r.width).toBe(400 + 20);
    expect(r.height).toBe(300 + 20);
  });
});

describe("intersects", () => {
  test("detects overlap and separation", () => {
    const view = { x: 0, y: 0, width: 100, height: 100 };
    expect(intersects({ x: 50, y: 50, width: 20, height: 20 }, view)).toBe(true);
    expect(intersects({ x: 200, y: 0, width: 10, height: 10 }, view)).toBe(false);
  });
});

describe("nodeBounds", () => {
  test("unrotated returns the raw box", () => {
    expect(nodeBounds(rect("a", 5, 6, 10, 20))).toEqual({ x: 5, y: 6, width: 10, height: 20 });
  });
  test("rotated 90° swaps width/height around the center", () => {
    const b = nodeBounds(rect("a", 0, 0, 10, 20, 90));
    expect(b.width).toBeCloseTo(20, 5);
    expect(b.height).toBeCloseTo(10, 5);
  });
});

describe("cullNodes", () => {
  const view = { x: 0, y: 0, width: 100, height: 100 };

  test("returns all nodes below the threshold", () => {
    const nodes = [rect("a", 0, 0), rect("b", 9999, 9999)];
    expect(cullNodes(nodes, view, new Set(), 80)).toHaveLength(2);
  });

  test("drops off-screen nodes above the threshold", () => {
    const nodes: SceneNode[] = [];
    for (let i = 0; i < 100; i++) nodes.push(rect(`n${i}`, i === 0 ? 10 : 100000 + i, 10));
    const kept = cullNodes(nodes, view, new Set(), 80);
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe("n0");
  });

  test("always keeps the current selection even off-screen", () => {
    const nodes: SceneNode[] = [];
    for (let i = 0; i < 100; i++) nodes.push(rect(`n${i}`, 100000, 100000));
    const kept = cullNodes(nodes, view, new Set(["n42"]), 80);
    expect(kept.map((n) => n.id)).toEqual(["n42"]);
  });
});
