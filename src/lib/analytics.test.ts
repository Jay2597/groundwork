import { describe, expect, test } from "vitest";
import { shouldTrack, doNotTrack, normalizePath, sanitizeEvent } from "./analytics";

describe("shouldTrack", () => {
  test("requires endpoint configured, opt-in, and no DNT", () => {
    expect(shouldTrack(true, true, false)).toBe(true);
    expect(shouldTrack(false, true, false)).toBe(false); // not configured
    expect(shouldTrack(true, false, false)).toBe(false); // opted out
    expect(shouldTrack(true, true, true)).toBe(false); // do not track
  });
});

describe("doNotTrack", () => {
  test("detects the DNT signal", () => {
    expect(doNotTrack({ doNotTrack: "1" })).toBe(true);
    expect(doNotTrack({ doNotTrack: "yes" })).toBe(true);
    expect(doNotTrack({ doNotTrack: "0" })).toBe(false);
    expect(doNotTrack({ doNotTrack: null })).toBe(false);
  });
});

describe("normalizePath", () => {
  test("collapses editor file ids to a coarse path", () => {
    expect(normalizePath("#/editor/abc123")).toBe("/editor");
  });
  test("keeps home and welcome", () => {
    expect(normalizePath("#/")).toBe("/");
    expect(normalizePath("#/welcome")).toBe("/welcome");
  });
  test("strips query strings", () => {
    expect(normalizePath("#/editor/x?foo=bar")).toBe("/editor");
  });
});

describe("sanitizeEvent", () => {
  test("slugs and truncates event names", () => {
    expect(sanitizeEvent("Export PNG!")).toBe("export-png");
    expect(sanitizeEvent("  file created  ")).toBe("file-created");
  });
  test("caps length at 40 chars", () => {
    expect(sanitizeEvent("a".repeat(60)).length).toBe(40);
  });
});
