import { describe, expect, test } from "vitest";
import { arrowheadPoints, endpointTangents, markerSize, toFlat } from "./markers";

describe("arrowheadPoints", () => {
  test("points toward the tip with the correct length", () => {
    // Arrow pointing right: from (0,0) toward tip (10,0), size 4.
    const pts = arrowheadPoints({ x: 10, y: 0 }, { x: 0, y: 0 }, 4);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ x: 10, y: 0 }); // tip
    // back corners are 4px behind the tip, ±2 on the perpendicular (y axis)
    expect(pts[1].x).toBeCloseTo(6, 5);
    expect(pts[2].x).toBeCloseTo(6, 5);
    expect(Math.abs(pts[1].y - pts[2].y)).toBeCloseTo(4, 5); // base width == size
  });

  test("orients to a diagonal direction", () => {
    const pts = arrowheadPoints({ x: 10, y: 10 }, { x: 0, y: 0 }, 5);
    expect(pts[0]).toEqual({ x: 10, y: 10 });
    // base is back along the 45° direction
    expect(pts[1].x).not.toBe(pts[2].x);
  });
});

describe("markerSize", () => {
  test("scales with stroke width but has a floor", () => {
    expect(markerSize(1)).toBe(8);
    expect(markerSize(4)).toBe(14);
  });
});

describe("endpointTangents", () => {
  test("returns start/end tip + neighbor for a polyline", () => {
    const t = endpointTangents([0, 0, 5, 0, 10, 0]);
    expect(t.start).toEqual({ tip: { x: 0, y: 0 }, from: { x: 5, y: 0 } });
    expect(t.end).toEqual({ tip: { x: 10, y: 0 }, from: { x: 5, y: 0 } });
  });
  test("empty for too-few points", () => {
    expect(endpointTangents([1, 1])).toEqual({});
  });
});

describe("toFlat", () => {
  test("flattens points", () => {
    expect(toFlat([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toEqual([1, 2, 3, 4]);
  });
});
