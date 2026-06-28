import { describe, expect, test } from "vitest";
import { measureGap, readout } from "./inspect";

describe("measureGap", () => {
  test("horizontal gap between side-by-side boxes", () => {
    const g = measureGap({ x: 0, y: 0, width: 10, height: 10 }, { x: 30, y: 0, width: 10, height: 10 });
    expect(g.horizontal).toBe(20);
    expect(g.vertical).toBe(0);
  });

  test("vertical gap between stacked boxes", () => {
    const g = measureGap({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 25, width: 10, height: 10 });
    expect(g.vertical).toBe(15);
    expect(g.horizontal).toBe(0);
  });

  test("overlapping boxes report zero gaps", () => {
    const g = measureGap({ x: 0, y: 0, width: 20, height: 20 }, { x: 5, y: 5, width: 20, height: 20 });
    expect(g.horizontal).toBe(0);
    expect(g.vertical).toBe(0);
  });

  test("center distance is symmetric", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 30, y: 40, width: 10, height: 10 };
    expect(measureGap(a, b).distance).toBe(measureGap(b, a).distance);
    // centers at (5,5) and (35,45) → dist 50
    expect(measureGap(a, b).distance).toBe(50);
  });
});

describe("readout", () => {
  test("rounds to two decimals", () => {
    expect(readout({ x: 1.23456, y: 2, width: 3, height: 4 })).toEqual({ x: 1.23, y: 2, w: 3, h: 4 });
  });
});
