import { describe, expect, test } from "vitest";
import { interactionsOf, clickInteraction, delayInteraction, cssEasing, transitionAnimation } from "./prototype";
import type { Interaction, RectNode } from "@/types/document";

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

describe("interactionsOf", () => {
  test("converts a legacy link to a click interaction", () => {
    expect(interactionsOf(rect({ link: "frame-2" }))).toEqual([
      { trigger: "click", target: "frame-2", transition: "instant", duration: 0, easing: "linear" },
    ]);
  });
  test("prefers explicit interactions", () => {
    const interactions: Interaction[] = [
      { trigger: "after-delay", target: "f", transition: "dissolve", duration: 200, easing: "ease-out", delay: 1000 },
    ];
    expect(interactionsOf(rect({ interactions, link: "old" }))).toBe(interactions);
  });
  test("empty when no prototype set", () => {
    expect(interactionsOf(rect({}))).toEqual([]);
  });
});

describe("trigger lookups", () => {
  test("clickInteraction finds the click trigger", () => {
    const node = rect({
      interactions: [
        { trigger: "after-delay", target: "a", transition: "instant", duration: 0, easing: "linear" },
        { trigger: "click", target: "b", transition: "dissolve", duration: 100, easing: "ease-out" },
      ],
    });
    expect(clickInteraction(node)?.target).toBe("b");
    expect(delayInteraction(node)?.target).toBe("a");
  });
});

describe("cssEasing + transitionAnimation", () => {
  test("maps easing tokens to timing functions", () => {
    expect(cssEasing("linear")).toBe("linear");
    expect(cssEasing("ease-in-out")).toContain("cubic-bezier");
  });
  test("smart-animate falls back to a dissolve animation", () => {
    expect(transitionAnimation("smart-animate")).toBe("present-dissolve");
    expect(transitionAnimation("slide-left")).toBe("present-slide-left");
    expect(transitionAnimation("instant")).toBeNull();
  });
});
