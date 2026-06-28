import { describe, expect, test } from "vitest";
import { vertices, moveVertex, insertVertex, deleteVertex, segmentMidpoints } from "./pathEdit";

const TRI = [0, 0, 10, 0, 5, 10];

describe("vertices", () => {
  test("splits a flat list into points", () => {
    expect(vertices(TRI)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ]);
  });
});

describe("moveVertex", () => {
  test("moves the addressed anchor", () => {
    expect(moveVertex(TRI, 1, 99, 88)).toEqual([0, 0, 99, 88, 5, 10]);
  });
  test("ignores out-of-range index", () => {
    expect(moveVertex(TRI, 9, 1, 1)).toBe(TRI);
  });
});

describe("insertVertex", () => {
  test("inserts after the given index", () => {
    expect(insertVertex(TRI, 0, 5, 0)).toEqual([0, 0, 5, 0, 10, 0, 5, 10]);
  });
});

describe("deleteVertex", () => {
  test("removes an anchor", () => {
    expect(deleteVertex(TRI, 1)).toEqual([0, 0, 5, 10]);
  });
  test("keeps at least two anchors", () => {
    expect(deleteVertex([0, 0, 1, 1], 0)).toEqual([0, 0, 1, 1]);
  });
});

describe("segmentMidpoints", () => {
  test("open path has n-1 midpoints", () => {
    const mids = segmentMidpoints(TRI, false);
    expect(mids).toHaveLength(2);
    expect(mids[0]).toEqual({ x: 5, y: 0, afterIndex: 0 });
  });
  test("closed path has n midpoints incl. wrap segment", () => {
    const mids = segmentMidpoints(TRI, true);
    expect(mids).toHaveLength(3);
    // wrap segment midpoint between (5,10) and (0,0)
    expect(mids[2]).toEqual({ x: 2.5, y: 5, afterIndex: 2 });
  });
});
