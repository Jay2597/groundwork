import { describe, expect, test } from "vitest";
import { cropToPixels, isTile, FULL_CROP } from "./imageCrop";
import type { ImageFill } from "@/types/document";

describe("cropToPixels", () => {
  test("converts a normalized rect to pixels", () => {
    expect(cropToPixels([0.25, 0.5, 0.5, 0.25], 400, 200)).toEqual({ x: 100, y: 100, width: 200, height: 50 });
  });
  test("full crop covers the whole image", () => {
    expect(cropToPixels(FULL_CROP, 400, 200)).toEqual({ x: 0, y: 0, width: 400, height: 200 });
  });
  test("clamps out-of-range values", () => {
    const r = cropToPixels([-0.5, 2, 5, 0.1], 100, 100);
    expect(r.x).toBe(0);
    expect(r.y).toBe(100);
    expect(r.width).toBe(100);
  });
});

describe("isTile", () => {
  test("detects tile fit", () => {
    expect(isTile({ src: "x", fit: "tile" } as ImageFill)).toBe(true);
    expect(isTile({ src: "x", fit: "cover" } as ImageFill)).toBe(false);
  });
});
