import { describe, expect, test } from "vitest";
import { clipPolygons, ringArea } from "./polybool";

// Two unit-ish squares overlapping in a 5×5 corner.
const A = [0, 0, 10, 0, 10, 10, 0, 10];
const B = [5, 5, 15, 5, 15, 15, 5, 15];

function totalArea(rings: number[][] | null): number {
  if (!rings) return -1;
  return rings.reduce((sum, r) => sum + ringArea(r), 0);
}

describe("clipPolygons (Greiner–Hormann)", () => {
  test("intersection of two overlapping squares is the 5×5 corner", () => {
    const rings = clipPolygons(A, B, "intersect");
    expect(totalArea(rings)).toBeCloseTo(25, 4);
  });

  test("union of two overlapping squares is 175", () => {
    const rings = clipPolygons(A, B, "union");
    expect(totalArea(rings)).toBeCloseTo(175, 4);
  });

  test("subtract removes the overlap (100 - 25 = 75)", () => {
    const rings = clipPolygons(A, B, "subtract");
    expect(totalArea(rings)).toBeCloseTo(75, 4);
  });

  test("returns null when polygons do not intersect", () => {
    const far = [100, 100, 110, 100, 110, 110, 100, 110];
    expect(clipPolygons(A, far, "intersect")).toBeNull();
  });
});

describe("ringArea", () => {
  test("computes the area of a square", () => {
    expect(ringArea([0, 0, 4, 0, 4, 4, 0, 4])).toBe(16);
  });
});
