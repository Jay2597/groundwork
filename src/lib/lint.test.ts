import { describe, expect, test } from "vitest";
import { lintPage, lintCounts } from "./lint";
import type { FrameNode, Page, TextNode } from "@/types/document";

function text(over: Partial<TextNode>): TextNode {
  return {
    id: "t",
    type: "text",
    name: "Label",
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    rotation: 0,
    fill: "#000000",
    opacity: 1,
    visible: true,
    locked: false,
    text: "Hello",
    fontSize: 16,
    fontFamily: "sans",
    fontStyle: "normal",
    ...over,
  };
}

function page(nodes: Page["nodes"], background = "#ffffff"): Page {
  return { id: "p", name: "Page", canvas: { width: 800, height: 600, background }, nodes, comments: [], guides: [] };
}

describe("lintPage — contrast", () => {
  test("flags low-contrast text against the page background", () => {
    const issues = lintPage(page([text({ fill: "#cccccc" })], "#ffffff"));
    expect(issues.some((i) => i.rule === "contrast" && i.severity === "error")).toBe(true);
  });

  test("passes high-contrast text", () => {
    const issues = lintPage(page([text({ fill: "#000000" })], "#ffffff"));
    expect(issues.some((i) => i.rule === "contrast")).toBe(false);
  });

  test("uses a parent frame's fill as the background", () => {
    const frame: FrameNode = {
      id: "f",
      type: "frame",
      name: "Card",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      rotation: 0,
      fill: "#000000",
      opacity: 1,
      visible: true,
      locked: false,
      clipContent: true,
      children: [text({ id: "t2", fill: "#111111" })], // dark text on dark frame
    };
    const issues = lintPage(page([frame], "#ffffff"));
    expect(issues.some((i) => i.rule === "contrast" && i.nodeId === "t2")).toBe(true);
  });
});

describe("lintPage — other rules", () => {
  test("flags tiny fonts", () => {
    const issues = lintPage(page([text({ fontSize: 8, fill: "#000" })]));
    expect(issues.some((i) => i.rule === "tiny-font")).toBe(true);
  });

  test("flags undersized interactive targets", () => {
    const issues = lintPage(page([text({ width: 10, height: 10, link: "frame-2", fill: "#000" })]));
    expect(issues.some((i) => i.rule === "tap-target")).toBe(true);
  });

  test("flags sub-pixel geometry", () => {
    const issues = lintPage(page([text({ x: 10.5, fill: "#000" })]));
    expect(issues.some((i) => i.rule === "sub-pixel")).toBe(true);
  });

  test("ignores hidden nodes", () => {
    const issues = lintPage(page([text({ visible: false, fill: "#cccccc" })]));
    expect(issues).toHaveLength(0);
  });
});

describe("lintCounts", () => {
  test("tallies by severity", () => {
    const issues = lintPage(page([text({ fontSize: 8, fill: "#cccccc", x: 1.5 })]));
    const counts = lintCounts(issues);
    expect(counts.error).toBeGreaterThanOrEqual(1); // contrast
    expect(counts.warning).toBeGreaterThanOrEqual(1); // tiny font
    expect(counts.info).toBeGreaterThanOrEqual(1); // sub-pixel
  });
});
