import { describe, expect, test } from "vitest";
import { layoutPositions, computeAutoLayout, hugContentSize, reflowHug, resolvePadding } from "./autolayout";
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

describe("resolvePadding", () => {
  test("falls back to uniform padding", () => {
    expect(resolvePadding({ direction: "row", gap: 0, padding: 10, align: "start" })).toEqual({
      top: 10, right: 10, bottom: 10, left: 10,
    });
  });
  test("per-side overrides uniform", () => {
    expect(resolvePadding({ direction: "row", gap: 0, padding: 10, align: "start", paddingTop: 4, paddingLeft: 2 })).toEqual({
      top: 4, right: 10, bottom: 10, left: 2,
    });
  });
});

describe("computeAutoLayout sizing + justify", () => {
  test("space-between spreads children across the primary axis", () => {
    // frame width 200, pad 0, two children widths 30 + 40 → free 130 over 1 gap
    const boxes = computeAutoLayout(frame({ direction: "row", gap: 0, padding: 0, align: "start", justify: "space-between" }));
    expect(boxes.a.x).toBe(0);
    expect(boxes.b.x).toBe(200 - 40);
  });

  test("end justify pushes content to the far edge", () => {
    const boxes = computeAutoLayout(frame({ direction: "row", gap: 10, padding: 0, align: "start", justify: "end" }));
    // content = 30 + 10 + 40 = 80; start at 200 - 80 = 120
    expect(boxes.a.x).toBe(120);
    expect(boxes.b.x).toBe(120 + 30 + 10);
  });

  test("fill on the cross axis stretches the child to the inner cross size", () => {
    const f = frame({ direction: "row", gap: 0, padding: 8, align: "start" });
    f.children = [{ ...(f.children[0] as RectNode), sizingV: "fill" }];
    const boxes = computeAutoLayout(f);
    // frame height 100, pad 8 → inner cross 84
    expect(boxes.a.height).toBe(84);
    expect(boxes.a.y).toBe(8);
  });

  test("fill on the primary axis shares leftover space", () => {
    const f = frame({ direction: "row", gap: 0, padding: 0, align: "start" });
    const base = f.children[0] as RectNode;
    f.children = [
      { ...base, id: "a", sizingH: "fill" },
      { ...base, id: "b", sizingH: "fill" },
    ];
    const boxes = computeAutoLayout(f);
    // 200 split over 2 fills → 100 each
    expect(boxes.a.width).toBe(100);
    expect(boxes.b.width).toBe(100);
    expect(boxes.b.x).toBe(100);
  });
});

describe("hugContentSize + reflowHug", () => {
  test("hug content size sums primary axis + padding", () => {
    const f = frame({ direction: "row", gap: 10, padding: 8, align: "start" });
    // widths 30 + 40 + gap 10 + pad 16 = 96; height = max(30,20) + 16 = 46
    expect(hugContentSize(f)).toEqual({ width: 96, height: 46 });
  });

  test("reflowHug resizes a hug frame to fit its children", () => {
    const f = frame({ direction: "row", gap: 10, padding: 8, align: "start" });
    const hugFrame: FrameNode = { ...f, sizingH: "hug", sizingV: "hug" };
    const [out] = reflowHug([hugFrame]) as FrameNode[];
    expect(out.width).toBe(96);
    expect(out.height).toBe(46);
  });

  test("reflowHug leaves fixed frames untouched", () => {
    const f = frame({ direction: "row", gap: 10, padding: 8, align: "start" });
    const [out] = reflowHug([f]) as FrameNode[];
    expect(out.width).toBe(200);
    expect(out.height).toBe(100);
  });
});
