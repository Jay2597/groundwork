import { describe, expect, test } from "vitest";
import { edgePoint, connectorPoints, resolveConnectors } from "./connectors";
import type { PathNode, RectNode, SceneNode } from "@/types/document";

describe("edgePoint", () => {
  const box = { x: 0, y: 0, width: 100, height: 100 }; // center (50,50)
  test("exits the right edge toward a point to the right", () => {
    expect(edgePoint(box, 1000, 50)).toEqual({ x: 100, y: 50 });
  });
  test("exits the bottom edge toward a point below", () => {
    expect(edgePoint(box, 50, 1000)).toEqual({ x: 50, y: 100 });
  });
});

describe("connectorPoints", () => {
  const a = { x: 0, y: 0, width: 100, height: 100 };
  const b = { x: 300, y: 0, width: 100, height: 100 };

  test("straight: edge of A to edge of B", () => {
    // A center (50,50), B center (350,50): exits A right (100,50), enters B left (300,50)
    expect(connectorPoints(a, b, "straight")).toEqual([100, 50, 300, 50]);
  });

  test("elbow: orthogonal with a mid bend", () => {
    const pts = connectorPoints(a, b, "elbow");
    expect(pts).toHaveLength(8);
    expect(pts.slice(0, 2)).toEqual([100, 50]);
    expect(pts.slice(6)).toEqual([300, 50]);
  });
});

function rect(id: string, x: number, y: number): RectNode {
  return {
    id, type: "rect", name: id, x, y, width: 100, height: 100, rotation: 0,
    fill: "#000", opacity: 1, visible: true, locked: false, cornerRadius: 0,
  };
}

describe("resolveConnectors", () => {
  test("recomputes a connector's points from its linked nodes", () => {
    const conn: PathNode = {
      id: "c", type: "path", name: "Connector", x: 0, y: 0, width: 1, height: 1, rotation: 0,
      fill: "#000", opacity: 1, visible: true, locked: false, points: [0, 0, 1, 1], closed: false,
      connector: { from: "a", to: "b", kind: "straight" },
    };
    const nodes: SceneNode[] = [rect("a", 0, 0), rect("b", 300, 0), conn];
    const out = resolveConnectors(nodes);
    const resolved = out[2] as PathNode;
    expect(resolved.points).toEqual([100, 50, 300, 50]);
  });

  test("leaves connectors with missing endpoints unchanged", () => {
    const conn: PathNode = {
      id: "c", type: "path", name: "Connector", x: 0, y: 0, width: 1, height: 1, rotation: 0,
      fill: "#000", opacity: 1, visible: true, locked: false, points: [9, 9, 9, 9], closed: false,
      connector: { from: "missing", to: "also-missing" },
    };
    const out = resolveConnectors([conn]);
    expect((out[0] as PathNode).points).toEqual([9, 9, 9, 9]);
  });
});
