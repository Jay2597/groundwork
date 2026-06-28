import { describe, expect, test } from "vitest";
import {
  effectsOf,
  dropShadowKonva,
  layerBlurRadius,
  blendModeKonva,
  effectsToBoxShadow,
  effectsToCssFilter,
} from "./effects";
import type { Effect, RectNode } from "@/types/document";

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

describe("effectsOf", () => {
  test("lifts a legacy shadow into a drop-shadow effect", () => {
    const e = effectsOf(rect({ shadow: { color: "#111", blur: 4, offsetX: 1, offsetY: 2 } }));
    expect(e).toEqual([{ type: "drop-shadow", color: "#111", blur: 4, offsetX: 1, offsetY: 2 }]);
  });
  test("prefers explicit effects over legacy shadow", () => {
    const effects: Effect[] = [{ type: "layer-blur", radius: 5 }];
    expect(effectsOf(rect({ effects, shadow: { color: "#000", blur: 1, offsetX: 0, offsetY: 0 } }))).toBe(effects);
  });
  test("empty when no effects", () => {
    expect(effectsOf(rect({}))).toEqual([]);
  });
});

describe("dropShadowKonva", () => {
  test("returns konva props for the first drop shadow", () => {
    const effects: Effect[] = [{ type: "drop-shadow", color: "#abc", blur: 6, offsetX: 2, offsetY: 3 }];
    expect(dropShadowKonva(rect({ effects }))).toMatchObject({
      shadowColor: "#abc",
      shadowBlur: 6,
      shadowEnabled: true,
    });
  });
  test("disabled when no drop shadow present", () => {
    expect(dropShadowKonva(rect({ effects: [{ type: "layer-blur", radius: 2 }] }))).toEqual({ shadowEnabled: false });
  });
});

describe("layerBlurRadius", () => {
  test("sums all blur effects", () => {
    const effects: Effect[] = [{ type: "layer-blur", radius: 3 }, { type: "layer-blur", radius: 2 }];
    expect(layerBlurRadius(rect({ effects }))).toBe(5);
  });
});

describe("blendModeKonva", () => {
  test("maps non-normal modes through and skips normal", () => {
    expect(blendModeKonva(rect({ blendMode: "multiply" }))).toBe("multiply");
    expect(blendModeKonva(rect({ blendMode: "normal" }))).toBeUndefined();
    expect(blendModeKonva(rect({}))).toBeUndefined();
  });
});

describe("css effect serialization", () => {
  test("box-shadow combines drop + inner (inset)", () => {
    const effects: Effect[] = [
      { type: "drop-shadow", color: "#000", blur: 4, offsetX: 0, offsetY: 2 },
      { type: "inner-shadow", color: "#fff", blur: 3, offsetX: 1, offsetY: 1 },
    ];
    expect(effectsToBoxShadow(rect({ effects }))).toBe("0px 2px 4px #000, inset 1px 1px 3px #fff");
  });
  test("filter blur reflects total radius", () => {
    expect(effectsToCssFilter(rect({ effects: [{ type: "layer-blur", radius: 7 }] }))).toBe("blur(7px)");
    expect(effectsToCssFilter(rect({}))).toBeUndefined();
  });
});
