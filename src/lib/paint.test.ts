import { describe, expect, test } from "vitest";
import { fillsFor, fillsToCss, paintToCss, strokeToKonva } from "./paint";
import type { RectNode } from "@/types/document";

function rect(over: Partial<RectNode> = {}): RectNode {
  return {
    id: "r", type: "rect", name: "r", x: 0, y: 0, width: 10, height: 10,
    rotation: 0, fill: "#abcdef", opacity: 1, visible: true, locked: false, cornerRadius: 0,
    ...over,
  };
}

describe("paint", () => {
  test("fillsFor falls back to solid fill", () => {
    const fills = fillsFor(rect());
    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({ type: "solid", color: "#abcdef" });
  });

  test("fillsFor returns only visible paints", () => {
    const node = rect({
      fills: [
        { type: "solid", color: "#111", opacity: 1, visible: true },
        { type: "solid", color: "#222", opacity: 1, visible: false },
      ],
    });
    expect(fillsFor(node)).toHaveLength(1);
  });

  test("paintToCss renders gradients", () => {
    expect(paintToCss({ type: "solid", color: "#f00", opacity: 1, visible: true })).toBe("#f00");
    const lin = paintToCss({ type: "linear", angle: 0, opacity: 1, visible: true, stops: [{ color: "#000", position: 0 }, { color: "#fff", position: 1 }] });
    expect(lin).toContain("linear-gradient(90deg");
    const rad = paintToCss({ type: "radial", opacity: 1, visible: true, stops: [{ color: "#000", position: 0 }, { color: "#fff", position: 1 }] });
    expect(rad).toContain("radial-gradient(circle");
  });

  test("fillsToCss stacks top fill first", () => {
    const node = rect({
      fills: [
        { type: "solid", color: "#bottom", opacity: 1, visible: true },
        { type: "solid", color: "#top", opacity: 1, visible: true },
      ],
    });
    expect(fillsToCss(node)).toBe("#top, #bottom");
  });

  test("strokeToKonva emits dash for dashed/dotted", () => {
    expect(strokeToKonva(undefined)).toEqual({ strokeEnabled: false });
    const dashed = strokeToKonva({ color: "#000", width: 2, style: "dashed" });
    expect(dashed.dash).toEqual([6, 4]);
    const dotted = strokeToKonva({ color: "#000", width: 2, style: "dotted" });
    expect(dotted.lineCap).toBe("round");
  });
});
