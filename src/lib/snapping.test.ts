import { describe, expect, test } from "vitest";
import { candidateLines, computeSnap, type SnapBox } from "./snapping";

describe("snapping", () => {
  test("computeSnap aligns left edges within threshold", () => {
    const box: SnapBox = { x: 102, y: 0, w: 50, h: 50 };
    const candidates: SnapBox[] = [{ x: 100, y: 200, w: 50, h: 50 }];
    const result = computeSnap(box, candidates, 6);
    // left edge 102 → snaps to 100, dx = -2
    expect(result.dx).toBe(-2);
    expect(result.guides.length).toBeGreaterThan(0);
  });

  test("computeSnap ignores candidates outside threshold", () => {
    const box: SnapBox = { x: 200, y: 0, w: 50, h: 50 };
    const candidates: SnapBox[] = [{ x: 100, y: 0, w: 50, h: 50 }];
    const result = computeSnap(box, candidates, 6);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
  });

  test("candidateLines emits edges and centers", () => {
    const { v, h } = candidateLines([{ x: 0, y: 0, w: 100, h: 40 }]);
    expect(v).toEqual([0, 50, 100]);
    expect(h).toEqual([0, 20, 40]);
  });
});
