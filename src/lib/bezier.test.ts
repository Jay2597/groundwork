import { describe, expect, test } from "vitest";
import { catmullRomToBezier, smoothPathToSvgD, sampleSmooth } from "./bezier";

const SQUARE = [0, 0, 10, 0, 10, 10, 0, 10];

describe("catmullRomToBezier", () => {
  test("open path yields one fewer segment than anchors", () => {
    const segs = catmullRomToBezier([0, 0, 10, 0, 20, 0], false);
    expect(segs).toHaveLength(2);
  });

  test("closed path wraps back to the first anchor", () => {
    const segs = catmullRomToBezier(SQUARE, true);
    expect(segs).toHaveLength(4);
    // last segment ends where the first began (closed loop)
    const last = segs[segs.length - 1];
    expect(last.x1).toBe(0);
    expect(last.y1).toBe(0);
  });

  test("segment endpoints pass through their anchors", () => {
    const segs = catmullRomToBezier([0, 0, 10, 0, 20, 0], false);
    expect(segs[0].x0).toBe(0);
    expect(segs[0].x1).toBe(10);
    expect(segs[1].x1).toBe(20);
  });

  test("fewer than two anchors yields no segments", () => {
    expect(catmullRomToBezier([5, 5], false)).toEqual([]);
  });
});

describe("smoothPathToSvgD", () => {
  test("emits a moveto and cubic curves", () => {
    const d = smoothPathToSvgD([0, 0, 10, 0, 20, 0], false);
    expect(d.startsWith("M0,0")).toBe(true);
    expect(d).toContain("C");
    expect(d.endsWith("Z")).toBe(false);
  });

  test("closed curve ends with Z", () => {
    const d = smoothPathToSvgD(SQUARE, true);
    expect(d.endsWith("Z")).toBe(true);
  });

  test("returns empty for too-few points", () => {
    expect(smoothPathToSvgD([0, 0], false)).toBe("");
  });
});

describe("sampleSmooth", () => {
  test("produces a denser polyline than the anchors", () => {
    const pts = sampleSmooth([0, 0, 10, 0, 20, 0], false, 8);
    expect(pts.length).toBeGreaterThan(6);
    // ends at the final anchor for an open curve
    expect(pts[pts.length - 2]).toBe(20);
    expect(pts[pts.length - 1]).toBe(0);
  });
});
