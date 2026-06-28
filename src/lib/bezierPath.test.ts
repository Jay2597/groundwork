import { describe, expect, test } from "vitest";
import {
  inHandle,
  outHandle,
  setHandle,
  zeroHandles,
  insertHandleSlot,
  deleteHandleSlot,
  handleSegments,
  deriveSmoothHandles,
  handlePathToSvgD,
} from "./bezierPath";
import { catmullRomToBezier } from "./bezier";

const SQUARE = [0, 0, 10, 0, 10, 10, 0, 10];

describe("handle accessors", () => {
  const h = [1, 2, 3, 4, 5, 6, 7, 8];
  test("read in/out handles per anchor", () => {
    expect(inHandle(h, 0)).toEqual({ dx: 1, dy: 2 });
    expect(outHandle(h, 0)).toEqual({ dx: 3, dy: 4 });
    expect(inHandle(h, 1)).toEqual({ dx: 5, dy: 6 });
  });

  test("setHandle without mirror only changes one side", () => {
    const next = setHandle(zeroHandles([0, 0, 1, 1]), 0, "out", 5, 6);
    expect(outHandle(next, 0)).toEqual({ dx: 5, dy: 6 });
    expect(inHandle(next, 0)).toEqual({ dx: 0, dy: 0 });
  });

  test("setHandle with mirror sets the opposite side to the negation", () => {
    const next = setHandle(zeroHandles([0, 0, 1, 1]), 0, "out", 5, 6, true);
    expect(inHandle(next, 0)).toEqual({ dx: -5, dy: -6 });
  });
});

describe("insert/delete handle slots", () => {
  test("insert adds a zero quad after the index", () => {
    const next = insertHandleSlot([1, 1, 1, 1, 2, 2, 2, 2], 0);
    expect(next).toEqual([1, 1, 1, 1, 0, 0, 0, 0, 2, 2, 2, 2]);
  });
  test("delete removes the quad at the index", () => {
    expect(deleteHandleSlot([1, 1, 1, 1, 2, 2, 2, 2], 0)).toEqual([2, 2, 2, 2]);
  });
});

describe("handleSegments", () => {
  test("zero handles give control points at the anchors (straight)", () => {
    const segs = handleSegments([0, 0, 10, 0], zeroHandles([0, 0, 10, 0]), false);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ x0: 0, y0: 0, cx1: 0, cy1: 0, cx2: 10, cy2: 0, x1: 10, y1: 0 });
  });

  test("closed path wraps the last segment to the first anchor", () => {
    const segs = handleSegments(SQUARE, zeroHandles(SQUARE), true);
    expect(segs).toHaveLength(4);
    expect(segs[3].x1).toBe(0);
    expect(segs[3].y1).toBe(0);
  });
});

describe("deriveSmoothHandles", () => {
  test("reproduces the Catmull-Rom curve", () => {
    const handles = deriveSmoothHandles(SQUARE, true);
    const viaHandles = handleSegments(SQUARE, handles, true);
    const viaCatmull = catmullRomToBezier(SQUARE, true);
    expect(viaHandles).toHaveLength(viaCatmull.length);
    for (let i = 0; i < viaHandles.length; i++) {
      expect(viaHandles[i].cx1).toBeCloseTo(viaCatmull[i].cx1, 6);
      expect(viaHandles[i].cy1).toBeCloseTo(viaCatmull[i].cy1, 6);
      expect(viaHandles[i].cx2).toBeCloseTo(viaCatmull[i].cx2, 6);
      expect(viaHandles[i].cy2).toBeCloseTo(viaCatmull[i].cy2, 6);
    }
  });
});

describe("handlePathToSvgD", () => {
  test("emits cubic commands and closes when requested", () => {
    const d = handlePathToSvgD(SQUARE, deriveSmoothHandles(SQUARE, true), true);
    expect(d.startsWith("M0,0")).toBe(true);
    expect(d).toContain("C");
    expect(d.endsWith("Z")).toBe(true);
  });
});
