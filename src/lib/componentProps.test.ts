import { describe, expect, test } from "vitest";
import { resolveInstance, applyInstanceProps, textDescendants, toggleableChildren } from "./componentProps";
import type { FrameNode, RectNode, TextNode } from "@/types/document";

function text(id: string, name: string, value: string): TextNode {
  return {
    id,
    type: "text",
    name,
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    rotation: 0,
    fill: "#000",
    opacity: 1,
    visible: true,
    locked: false,
    text: value,
    fontSize: 16,
    fontFamily: "sans",
    fontStyle: "normal",
  };
}

function rect(id: string, name: string): RectNode {
  return {
    id,
    type: "rect",
    name,
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
  };
}

function instance(props?: Record<string, string | boolean>): FrameNode {
  return {
    id: "inst",
    type: "frame",
    name: "Button",
    x: 0,
    y: 0,
    width: 120,
    height: 40,
    rotation: 0,
    fill: "#fff",
    opacity: 1,
    visible: true,
    locked: false,
    clipContent: false,
    mainComponentId: "cmp1",
    props,
    children: [text("t", "Label", "Default"), rect("i", "Icon")],
  };
}

describe("resolveInstance", () => {
  test("overrides a text descendant by name", () => {
    const out = resolveInstance(instance({ Label: "Submit" })) as FrameNode;
    expect((out.children[0] as TextNode).text).toBe("Submit");
  });

  test("overrides visibility by name", () => {
    const out = resolveInstance(instance({ Icon: false })) as FrameNode;
    expect(out.children[1].visible).toBe(false);
  });

  test("no props → returns the same node reference", () => {
    const node = instance();
    expect(resolveInstance(node)).toBe(node);
  });
});

describe("applyInstanceProps", () => {
  test("resolves instances inside a node list", () => {
    const [out] = applyInstanceProps([instance({ Label: "Go" })]) as FrameNode[];
    expect((out.children[0] as TextNode).text).toBe("Go");
  });
});

describe("introspection helpers", () => {
  test("textDescendants lists text nodes", () => {
    expect(textDescendants(instance())).toEqual([{ name: "Label", value: "Default" }]);
  });
  test("toggleableChildren lists direct children", () => {
    expect(toggleableChildren(instance()).map((c) => c.name)).toEqual(["Label", "Icon"]);
  });
});
