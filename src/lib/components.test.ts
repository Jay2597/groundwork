import { describe, expect, test } from "vitest";
import { rebuildInstance, detachInstance, variantGroups, siblingsInSet, variantLabel } from "./components";
import type { Component, FrameNode, RectNode } from "@/types/document";

function rect(over: Partial<RectNode>): RectNode {
  return {
    id: "r",
    type: "rect",
    name: "r",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    fill: "#000",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
    ...over,
  };
}

function frameMaster(): FrameNode {
  return {
    id: "m",
    type: "frame",
    name: "master",
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    rotation: 0,
    fill: "#fff",
    opacity: 1,
    visible: true,
    locked: false,
    clipContent: true,
    children: [rect({ id: "child", fill: "#abc" })],
  };
}

describe("rebuildInstance", () => {
  test("keeps the instance id and placement but takes the master's content", () => {
    const master = frameMaster();
    const instance = rect({ id: "inst", x: 100, y: 200, name: "Button 3", mainComponentId: "cmp1" });
    const out = rebuildInstance(instance, master, "cmp1") as FrameNode;
    expect(out.id).toBe("inst");
    expect(out.x).toBe(100);
    expect(out.y).toBe(200);
    expect(out.name).toBe("Button 3");
    expect(out.type).toBe("frame");
    expect(out.mainComponentId).toBe("cmp1");
    // children come from the master, with fresh ids
    expect(out.children).toHaveLength(1);
    expect(out.children[0].id).not.toBe("child");
  });
});

describe("detachInstance", () => {
  test("removes the master link", () => {
    const out = detachInstance(rect({ mainComponentId: "cmp1" }));
    expect(out.mainComponentId).toBeUndefined();
  });
  test("returns same node when not an instance", () => {
    const n = rect({});
    expect(detachInstance(n)).toBe(n);
  });
});

describe("variant grouping", () => {
  const components: Component[] = [
    { id: "a", name: "Btn/Default", node: rect({}), setName: "Btn", variantProps: { State: "Default" } },
    { id: "b", name: "Btn/Hover", node: rect({}), setName: "Btn", variantProps: { State: "Hover" } },
    { id: "c", name: "Card", node: rect({}) },
  ];

  test("variantGroups groups only set members", () => {
    const groups = variantGroups(components);
    expect(groups).toHaveLength(1);
    expect(groups[0].setName).toBe("Btn");
    expect(groups[0].members).toHaveLength(2);
  });

  test("siblingsInSet returns members of the same set", () => {
    expect(siblingsInSet(components, "a").map((c) => c.id)).toEqual(["a", "b"]);
    expect(siblingsInSet(components, "c")).toEqual([]);
  });

  test("variantLabel prefers variant props", () => {
    expect(variantLabel(components[0])).toBe("State=Default");
    expect(variantLabel(components[2])).toBe("Card");
  });
});
