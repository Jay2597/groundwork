import { describe, expect, test } from "vitest";
import { parseHex, relativeLuminance, contrastRatio, wcagLevel, isLargeText } from "./contrast";

describe("parseHex", () => {
  test("parses #rrggbb", () => {
    expect(parseHex("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
  });
  test("parses shorthand #rgb", () => {
    expect(parseHex("#f80")).toEqual({ r: 255, g: 136, b: 0 });
  });
  test("ignores alpha in #rrggbbaa", () => {
    expect(parseHex("#ff880080")).toEqual({ r: 255, g: 136, b: 0 });
  });
  test("returns null for garbage", () => {
    expect(parseHex("nope")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  test("white is ~1, black is 0", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 3);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });
});

describe("contrastRatio", () => {
  test("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
  });
  test("identical colors are 1:1", () => {
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });
  test("is symmetric", () => {
    expect(contrastRatio("#123456", "#abcdef")).toBe(contrastRatio("#abcdef", "#123456"));
  });
  test("null for unparseable input", () => {
    expect(contrastRatio("xyz", "#fff")).toBeNull();
  });
});

describe("isLargeText", () => {
  test("24px is large; 18.66px is large only when bold", () => {
    expect(isLargeText(24, false)).toBe(true);
    expect(isLargeText(18.66, true)).toBe(true);
    expect(isLargeText(18.66, false)).toBe(false);
  });
});

describe("wcagLevel", () => {
  test("black on white passes AAA at body size", () => {
    expect(wcagLevel(21, 16, false)).toBe("AAA");
  });
  test("4.5:1 is AA (not AAA) for body text", () => {
    expect(wcagLevel(4.5, 16, false)).toBe("AA");
  });
  test("3:1 fails for body text but passes AA for large text", () => {
    expect(wcagLevel(3, 16, false)).toBe("fail");
    expect(wcagLevel(3, 28, false)).toBe("AA");
  });
});
