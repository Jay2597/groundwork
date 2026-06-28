import { isContainer, type SceneNode } from "@/types/document";

// Component instance properties. An instance carries `props` keyed by descendant
// node name; a string overrides that descendant's text, a boolean overrides its
// visibility. Resolution happens at render/export time so overrides survive a
// reset-from-master (they live on the instance, not in its cloned subtree).

/** Apply an instance's `props` overrides onto a copy of its subtree. */
export function resolveInstance(node: SceneNode): SceneNode {
  if (!node.mainComponentId || !node.props || Object.keys(node.props).length === 0) {
    return node;
  }
  return applyProps(node, node.props);
}

function applyProps(node: SceneNode, props: Record<string, string | boolean>): SceneNode {
  let result = node;
  const override = props[node.name];
  if (override !== undefined) {
    if (typeof override === "boolean") {
      if (override !== node.visible) result = { ...result, visible: override };
    } else if (node.type === "text" && override !== node.text) {
      result = { ...result, text: override } as SceneNode;
    }
  }
  if (isContainer(result)) {
    const children = result.children;
    const kids = children.map((c) => applyProps(c, props));
    if (kids.some((c, i) => c !== children[i])) {
      result = { ...result, children: kids } as SceneNode;
    }
  }
  return result;
}

/** Recursively resolve instance props across a whole node list. */
export function applyInstanceProps(nodes: SceneNode[]): SceneNode[] {
  let changed = false;
  const out = nodes.map((node) => {
    const resolved = resolveInstance(node);
    // Recurse into containers that aren't themselves resolved instances.
    let next = resolved;
    if (isContainer(next) && !next.props) {
      const children = next.children;
      const kids = applyInstanceProps(children);
      if (kids !== children) next = { ...next, children: kids } as SceneNode;
    }
    if (next !== node) changed = true;
    return next;
  });
  return changed ? out : nodes;
}

export interface InstanceTextProp {
  name: string;
  value: string;
}

/** Collect text descendants of an instance (for the override panel). */
export function textDescendants(node: SceneNode): InstanceTextProp[] {
  const out: InstanceTextProp[] = [];
  walk(node, (n) => {
    if (n.type === "text") out.push({ name: n.name, value: n.text });
  });
  return out;
}

/** Collect direct + nested children for visibility toggles. */
export function toggleableChildren(node: SceneNode): { name: string; visible: boolean }[] {
  const out: { name: string; visible: boolean }[] = [];
  if (isContainer(node)) {
    for (const c of node.children) out.push({ name: c.name, visible: c.visible });
  }
  return out;
}

function walk(node: SceneNode, fn: (n: SceneNode) => void): void {
  fn(node);
  if (isContainer(node)) for (const c of node.children) walk(c, fn);
}
