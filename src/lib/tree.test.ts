import { describe, expect, test } from "vitest";
import {
  appendChild,
  countNodes,
  findNode,
  findSiblings,
  frameAtPoint,
  insertNode,
  offsetOf,
  removeNodesById,
  setContainerChildren,
  updateNodeById,
} from "./tree";
import type { FrameNode, RectNode, SceneNode } from "@/types/document";

function rect(id: string, x = 0, y = 0, w = 10, h = 10): RectNode {
  return {
    id,
    type: "rect",
    name: id,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: "#fff",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
  };
}

function frame(id: string, children: SceneNode[], x = 0, y = 0, w = 100, h = 100): FrameNode {
  return {
    id,
    type: "frame",
    name: id,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: "#fff",
    opacity: 1,
    visible: true,
    locked: false,
    clipContent: true,
    children,
  };
}

describe("tree", () => {
  test("findNode locates nested children", () => {
    const tree = [frame("f1", [rect("r1")])];
    expect(findNode(tree, "r1")?.id).toBe("r1");
    expect(findNode(tree, "missing")).toBeUndefined();
  });

  test("updateNodeById updates nested immutably", () => {
    const tree = [frame("f1", [rect("r1")])];
    const next = updateNodeById(tree, "r1", { x: 99 });
    expect(findNode(next, "r1")?.x).toBe(99);
    // original is untouched
    expect(findNode(tree, "r1")?.x).toBe(0);
  });

  test("findSiblings returns parent for nested node", () => {
    const tree = [frame("f1", [rect("r1"), rect("r2")])];
    const loc = findSiblings(tree, "r1");
    expect(loc?.parent?.id).toBe("f1");
    expect(loc?.siblings).toHaveLength(2);
  });

  test("findSiblings returns null parent at top level", () => {
    const tree = [rect("r1"), rect("r2")];
    const loc = findSiblings(tree, "r1");
    expect(loc?.parent).toBeNull();
  });

  test("appendChild and setContainerChildren mutate the right container", () => {
    let tree: SceneNode[] = [frame("f1", [])];
    tree = appendChild(tree, "f1", rect("r1"));
    expect((findNode(tree, "f1") as FrameNode).children).toHaveLength(1);
    tree = setContainerChildren(tree, "f1", [rect("a"), rect("b")]);
    expect((findNode(tree, "f1") as FrameNode).children).toHaveLength(2);
  });

  test("removeNodesById removes nested nodes", () => {
    const tree = [frame("f1", [rect("r1"), rect("r2")])];
    const next = removeNodesById(tree, new Set(["r1"]));
    expect((findNode(next, "f1") as FrameNode).children).toHaveLength(1);
  });

  test("countNodes counts containers and children", () => {
    const tree = [frame("f1", [rect("r1"), rect("r2")]), rect("r3")];
    expect(countNodes(tree)).toBe(4);
  });

  test("insertNode inserts before a sibling and into containers", () => {
    let tree: SceneNode[] = [rect("a"), rect("b")];
    tree = insertNode(tree, null, rect("x"), "b");
    expect(tree.map((n) => n.id)).toEqual(["a", "x", "b"]);
    tree = insertNode(tree, null, rect("z"), null); // append
    expect(tree[tree.length - 1].id).toBe("z");

    let nested: SceneNode[] = [frame("f1", [rect("c1")])];
    nested = insertNode(nested, "f1", rect("c0"), "c1");
    expect((findNode(nested, "f1") as FrameNode).children.map((n) => n.id)).toEqual(["c0", "c1"]);
  });

  test("offsetOf accumulates ancestor offsets", () => {
    const tree = [frame("f1", [frame("f2", [rect("r1")], 10, 20)], 100, 200)];
    expect(offsetOf(tree, "f1")).toEqual({ x: 100, y: 200 });
    expect(offsetOf(tree, "f2")).toEqual({ x: 110, y: 220 });
    expect(offsetOf(tree, "nope")).toBeNull();
  });

  test("frameAtPoint returns topmost containing frame", () => {
    const tree = [frame("f1", [], 0, 0, 50, 50), frame("f2", [], 0, 0, 100, 100)];
    // f2 is later in z-order → topmost
    expect(frameAtPoint(tree, 10, 10)?.id).toBe("f2");
    expect(frameAtPoint(tree, 200, 200)).toBeUndefined();
  });
});
