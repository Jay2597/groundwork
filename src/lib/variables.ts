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

/** The raw value of a variable in a given mode (or the active mode). */
export function variableValue(
  coll: VariableCollection,
  id: string,
  modeId?: string,
): string | number | undefined {
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

/** Resolve a color variable to a hex/CSS string for the active mode. */
export function resolveColor(coll: VariableCollection, id: string): string | undefined {
  const v = coll.variables.find((x) => x.id === id);
  if (!v || v.type !== "color") return undefined;
  const value = variableValue(coll, id);
  return typeof value === "string" ? value : undefined;
}

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
