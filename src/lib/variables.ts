import type { GroundworkDocument, SceneNode, Variable, VariableCollection } from "@/types/document";
import { nanoid } from "nanoid";

// Resolve design variables against the active mode. Color variables can be bound
// to a node's fill; resolution happens at render and export time so switching
// modes re-themes the whole document with no per-node edits.

/** Create an empty variable collection with one default mode. */
export function createVariableCollection(): VariableCollection {
  const modeId = `mode-${nanoid(6)}`;
  return { modes: [{ id: modeId, name: "Mode 1" }], activeModeId: modeId, variables: [] };
}

/** Raw stored value (no alias following) of a variable in a given/active mode. */
function rawValue(coll: VariableCollection, id: string, modeId?: string): string | number | undefined {
  const v = coll.variables.find((x) => x.id === id);
  if (!v) return undefined;
  const mode = modeId ?? coll.activeModeId;
  if (v.valuesByMode[mode] !== undefined) return v.valuesByMode[mode];
  // Fall back to the first mode that has a value defined.
  for (const m of coll.modes) {
    if (v.valuesByMode[m.id] !== undefined) return v.valuesByMode[m.id];
  }
  return undefined;
}

/**
 * The value of a variable in a given mode (or the active mode), following
 * **aliases** — a string value equal to another variable's id resolves through
 * to that variable, with a cycle guard.
 */
export function variableValue(
  coll: VariableCollection,
  id: string,
  modeId?: string,
  seen: Set<string> = new Set(),
): string | number | undefined {
  if (seen.has(id)) return undefined; // alias cycle
  seen.add(id);
  const value = rawValue(coll, id, modeId);
  if (typeof value === "string" && coll.variables.some((v) => v.id === value)) {
    return variableValue(coll, value, modeId, seen);
  }
  return value;
}

/** Resolve a color variable to a hex/CSS string for the active mode. */
export function resolveColor(coll: VariableCollection, id: string): string | undefined {
  const v = coll.variables.find((x) => x.id === id);
  if (!v || v.type !== "color") return undefined;
  const value = variableValue(coll, id);
  return typeof value === "string" ? value : undefined;
}

/** Resolve a number variable to a number for the active mode. */
export function resolveNumber(coll: VariableCollection, id: string): number | undefined {
  const v = coll.variables.find((x) => x.id === id);
  if (!v || v.type !== "number") return undefined;
  const value = variableValue(coll, id);
  return typeof value === "number" ? value : undefined;
}

/** Numeric node properties that can be bound to a number variable. */
export const BINDABLE_NUMBER_PROPS = ["cornerRadius", "opacity", "rotation"] as const;

/** Replace a node's fill with its bound variable's value (recursively). */
export function applyVariables(nodes: SceneNode[], coll: VariableCollection | undefined): SceneNode[] {
  if (!coll || coll.variables.length === 0) return nodes;
  let changed = false;
  const out = nodes.map((node) => {
    const resolved = resolveNode(node, coll);
    if (resolved !== node) changed = true;
    return resolved;
  });
  return changed ? out : nodes;
}

function resolveNode(node: SceneNode, coll: VariableCollection): SceneNode {
  let result = node;
  if (node.fillVarId) {
    const color = resolveColor(coll, node.fillVarId);
    if (color && color !== node.fill) result = { ...result, fill: color, fills: undefined };
  }
  if (node.varBindings) {
    const patch: Record<string, number> = {};
    for (const prop in node.varBindings) {
      const value = resolveNumber(coll, node.varBindings[prop]);
      if (value !== undefined && (result as unknown as Record<string, unknown>)[prop] !== value) {
        patch[prop] = value;
      }
    }
    if (Object.keys(patch).length) result = { ...result, ...patch } as SceneNode;
  }
  if ("children" in result && result.children.length) {
    const kids = applyVariables(result.children, coll);
    if (kids !== result.children) result = { ...result, children: kids } as SceneNode;
  }
  return result;
}

/** A page's nodes with variable bindings resolved for the active mode. */
export function resolvedNodes(doc: GroundworkDocument, nodes: SceneNode[]): SceneNode[] {
  return applyVariables(nodes, doc.variables);
}

export function newVariable(type: Variable["type"], name: string, modeIds: string[], value: string | number): Variable {
  const valuesByMode: Record<string, string | number> = {};
  for (const id of modeIds) valuesByMode[id] = value;
  return { id: `var-${nanoid(6)}`, name, type, valuesByMode };
}
