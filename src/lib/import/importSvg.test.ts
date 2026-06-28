import { describe, expect, test } from "vitest";
import { parseSvg, parsePathD, groupImported } from "./importSvg";
import type { EllipseNode, PathNode, RectNode } from "@/types/document";

describe("parsePathD", () => {
  test("parses absolute M/L and close", () => {
    const { points, closed } = parsePathD("M10 10 L20 10 L20 20 Z");
    expect(points).toEqual([10, 10, 20, 10, 20, 20]);
    expect(closed).toBe(true);
  });
  test("handles H and V commands", () => {
    const { points } = parsePathD("M0 0 H10 V5");
    expect(points).toEqual([0, 0, 10, 0, 10, 5]);
  });
  test("uses curve endpoints for C", () => {
    const { points } = parsePathD("M0 0 C1 1 2 2 3 3");
    expect(points).toEqual([0, 0, 3, 3]);
  });
});

describe("parseSvg", () => {
  test("parses a rect", () => {
    const [node] = parseSvg('<svg><rect x="5" y="6" width="30" height="20" fill="#f00" /></svg>') as RectNode[];
    expect(node.type).toBe("rect");
    expect(node).toMatchObject({ x: 5, y: 6, width: 30, height: 20, fill: "#f00" });
  });

  test("parses a circle into an ellipse", () => {
    const [node] = parseSvg('<svg><circle cx="50" cy="50" r="10" /></svg>') as EllipseNode[];
    expect(node.type).toBe("ellipse");
    expect(node).toMatchObject({ x: 40, y: 40, width: 20, height: 20 });
  });

  test("parses a polygon into a closed path", () => {
    const [node] = parseSvg('<svg><polygon points="0,0 10,0 5,10" /></svg>') as PathNode[];
    expect(node.type).toBe("path");
    expect(node.closed).toBe(true);
    expect(node.width).toBe(10);
  });

  test("skips unsupported elements", () => {
    expect(parseSvg('<svg><text>hi</text></svg>')).toEqual([]);
  });

  test("parses multiple shapes", () => {
    const nodes = parseSvg('<svg><rect x="0" y="0" width="5" height="5"/><circle cx="20" cy="20" r="5"/></svg>');
    expect(nodes).toHaveLength(2);
  });
});

describe("groupImported", () => {
  test("wraps nodes in a group placed at the drop point", () => {
    const nodes = parseSvg('<svg><rect x="10" y="10" width="20" height="20"/><rect x="40" y="10" width="20" height="20"/></svg>');
    const group = groupImported(nodes, 100, 200, 1);
    expect(group.type).toBe("group");
    expect(group.x).toBe(100);
    expect(group.y).toBe(200);
    // bounding box from x=10..60, y=10..30 → 50 x 20
    expect(group.width).toBe(50);
    expect(group.height).toBe(20);
    // children are relative to the group origin
    expect(group.children[0].x).toBe(0);
    expect(group.children[1].x).toBe(30);
  });
});
