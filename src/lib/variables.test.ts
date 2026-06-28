import { describe, expect, test } from "vitest";
import {
  createVariableCollection,
  variableValue,
  resolveColor,
  resolveNumber,
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

describe("number variables + aliasing + bindings", () => {
  function collWithNumber(): VariableCollection {
    const coll = createVariableCollection();
    const mode = coll.modes[0].id;
    coll.variables.push(newVariable("number", "radius", [mode], 12));
    return coll;
  }

  test("resolveNumber returns the numeric value", () => {
    const coll = collWithNumber();
    expect(resolveNumber(coll, coll.variables[0].id)).toBe(12);
  });

  test("applyVariables binds a numeric property", () => {
    const coll = collWithNumber();
    const id = coll.variables[0].id;
    const [out] = applyVariables([rect({ cornerRadius: 0, varBindings: { cornerRadius: id } })], coll) as RectNode[];
    expect(out.cornerRadius).toBe(12);
  });

  test("variableValue follows an alias", () => {
    const coll = collWithNumber();
    const mode = coll.modes[0].id;
    const base = coll.variables[0];
    const alias = newVariable("number", "radius-alias", [mode], base.id); // value = another var's id
    coll.variables.push(alias);
    expect(variableValue(coll, alias.id)).toBe(12);
  });

  test("alias cycle is guarded (returns undefined, no infinite loop)", () => {
    const coll = createVariableCollection();
    const mode = coll.modes[0].id;
    const a = newVariable("number", "a", [mode], "");
    const b = newVariable("number", "b", [mode], "");
    a.valuesByMode[mode] = b.id;
    b.valuesByMode[mode] = a.id;
    coll.variables.push(a, b);
    expect(variableValue(coll, a.id)).toBeUndefined();
  });
});
