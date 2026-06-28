import { describe, expect, test } from "vitest";
import { shouldAutoSnapshot, pruneVersions, AUTO_INTERVAL_MS, type VersionMeta } from "./versionHistory";

function v(id: string, kind: "auto" | "manual", createdAt: number): VersionMeta {
  return { id, kind, createdAt, name: id };
}

describe("shouldAutoSnapshot", () => {
  test("true when there are no auto snapshots", () => {
    expect(shouldAutoSnapshot([], 1_000_000)).toBe(true);
    expect(shouldAutoSnapshot([v("m", "manual", 0)], 1_000_000)).toBe(true);
  });
  test("false when the last auto snapshot is recent", () => {
    const now = 1_000_000;
    expect(shouldAutoSnapshot([v("a", "auto", now - 1000)], now)).toBe(false);
  });
  test("true again once the interval has elapsed", () => {
    const now = 10_000_000;
    expect(shouldAutoSnapshot([v("a", "auto", now - AUTO_INTERVAL_MS - 1)], now)).toBe(true);
  });
});

describe("pruneVersions", () => {
  test("keeps all manual versions and caps auto versions", () => {
    const versions = [
      v("m1", "manual", 1),
      v("a1", "auto", 2),
      v("a2", "auto", 3),
      v("a3", "auto", 4),
      v("m2", "manual", 5),
    ];
    const pruned = pruneVersions(versions, 2);
    const ids = pruned.map((p) => p.id);
    expect(ids).toContain("m1");
    expect(ids).toContain("m2");
    // only the 2 most recent autos survive
    expect(ids).toContain("a3");
    expect(ids).toContain("a2");
    expect(ids).not.toContain("a1");
  });

  test("returns newest-first", () => {
    const pruned = pruneVersions([v("a", "auto", 1), v("b", "auto", 3), v("c", "auto", 2)], 10);
    expect(pruned.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
});
