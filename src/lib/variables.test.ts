import { describe, expect, test } from "vitest";
import {
  createVariableCollection,
  variableValue,
  resolveColor,
  applyVariables,
  newVariable,
} from "./variables";
import type { RectNode, VariableCollection } from "@/types/document";

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
    fill: "#000000",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
    ...over,
  };
}

function collWithTwoModes(): VariableCollection {
  const coll = createVariableCollection();
  const light = coll.modes[0].id;
  const dark = "mode-dark";
  coll.modes.push({ id: dark, name: "Dark" });
  const bg = newVariable("color", "bg", [light], "#ffffff");
  bg.valuesByMode[dark] = "#0d0d0f";
  coll.variables.push(bg);
  return coll;
}

describe("variableValue + resolveColor", () => {
  test("resolves the active mode's value", () => {
    const coll = collWithTwoModes();
    const id = coll.variables[0].id;
    expect(resolveColor(coll, id)).toBe("#ffffff");
    coll.activeModeId = coll.modes[1].id;
    expect(resolveColor(coll, id)).toBe("#0d0d0f");
  });

  test("falls back to a defined mode when active is missing", () => {
    const coll = collWithTwoModes();
    coll.activeModeId = "nonexistent";
    expect(variableValue(coll, coll.variables[0].id)).toBe("#ffffff");
  });

  test("returns undefined for unknown variable", () => {
    expect(resolveColor(collWithTwoModes(), "nope")).toBeUndefined();
  });
});

describe("applyVariables", () => {
  test("resolves a bound fill to the active mode value", () => {
    const coll = collWithTwoModes();
    const id = coll.variables[0].id;
    const [out] = applyVariables([rect({ fillVarId: id })], coll) as RectNode[];
    expect(out.fill).toBe("#ffffff");
  });

  test("re-themes when the active mode changes", () => {
    const coll = collWithTwoModes();
    coll.activeModeId = coll.modes[1].id;
    const id = coll.variables[0].id;
    const [out] = applyVariables([rect({ fillVarId: id })], coll) as RectNode[];
    expect(out.fill).toBe("#0d0d0f");
  });

  test("leaves unbound nodes untouched (same reference)", () => {
    const nodes = [rect({})];
    expect(applyVariables(nodes, collWithTwoModes())).toBe(nodes);
  });

  test("resolves bindings inside container children", () => {
    const coll = collWithTwoModes();
    const id = coll.variables[0].id;
    const frame = {
      ...rect({ id: "f" }),
      type: "frame" as const,
      clipContent: false,
      children: [rect({ id: "c", fillVarId: id })],
    };
    const [out] = applyVariables([frame as never], coll) as never[];
    const child = (out as unknown as { children: RectNode[] }).children[0];
    expect(child.fill).toBe("#ffffff");
  });
});
