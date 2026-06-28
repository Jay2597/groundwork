import { describe, expect, test } from "vitest";
import { displayText, decorationCss } from "./text";
import type { TextNode } from "@/types/document";

function textNode(over: Partial<TextNode>): TextNode {
  return {
    id: "t",
    type: "text",
    name: "t",
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    rotation: 0,
    fill: "#000",
    opacity: 1,
    visible: true,
    locked: false,
    text: "Hello World",
    fontSize: 16,
    fontFamily: "sans",
    fontStyle: "normal",
    ...over,
  };
}

describe("displayText", () => {
  test("uppercases when textCase is upper", () => {
    expect(displayText(textNode({ textCase: "upper" }))).toBe("HELLO WORLD");
  });
  test("lowercases when textCase is lower", () => {
    expect(displayText(textNode({ textCase: "lower" }))).toBe("hello world");
  });
  test("leaves text unchanged by default", () => {
    expect(displayText(textNode({}))).toBe("Hello World");
  });
});

describe("decorationCss", () => {
  test("returns the decoration when set", () => {
    expect(decorationCss(textNode({ textDecoration: "underline" }))).toBe("underline");
  });
  test("returns undefined for none/absent", () => {
    expect(decorationCss(textNode({ textDecoration: "none" }))).toBeUndefined();
    expect(decorationCss(textNode({}))).toBeUndefined();
  });
});
