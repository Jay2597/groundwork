import { nanoid } from "nanoid";
import { isContainer, type Component, type SceneNode } from "@/types/document";

// Instance helpers: rebuilding an instance from its master, swapping it to a
// different component, detaching it, and grouping components into variant sets.
// All pure — the store and renderers call these without side effects.

/** Deep clone a node with fresh ids throughout. */
export function cloneSubtree(node: SceneNode): SceneNode {
  if (isContainer(node)) {
    return { ...node, id: nanoid(8), children: node.children.map(cloneSubtree) };
  }
  return { ...node, id: nanoid(8) };
}

/**
 * Rebuild an instance from its master, keeping the instance's identity and
 * placement (id, name, x, y, rotation). Used by reset and swap.
 */
export function rebuildInstance(instance: SceneNode, master: SceneNode, componentId: string): SceneNode {
  const fresh = cloneSubtree(master);
  return {
    ...fresh,
    id: instance.id,
    name: instance.name,
    x: instance.x,
    y: instance.y,
    rotation: instance.rotation,
    mainComponentId: componentId,
  } as SceneNode;
}

/** Detach an instance: keep the geometry, drop the master link. */
export function detachInstance(node: SceneNode): SceneNode {
  if (!node.mainComponentId) return node;
  const next = { ...node };
  delete (next as { mainComponentId?: string }).mainComponentId;
  return next;
}

export interface VariantGroup {
  setName: string;
  members: Component[];
}

/** Group components that belong to the same variant set. */
export function variantGroups(components: Component[]): VariantGroup[] {
  const map = new Map<string, Component[]>();
  for (const c of components) {
    if (!c.setName) continue;
    const list = map.get(c.setName) ?? [];
    list.push(c);
    map.set(c.setName, list);
  }
  return [...map.entries()].map(([setName, members]) => ({ setName, members }));
}

/** Find the variant set a component belongs to (its sibling members). */
export function siblingsInSet(components: Component[], componentId: string): Component[] {
  const target = components.find((c) => c.id === componentId);
  if (!target?.setName) return [];
  return components.filter((c) => c.setName === target.setName);
}

/** A short human label for a component variant (its prop values, or its name). */
export function variantLabel(component: Component): string {
  if (component.variantProps) {
    const parts = Object.entries(component.variantProps).map(([k, v]) => `${k}=${v}`);
    if (parts.length) return parts.join(", ");
  }
  return component.name;
}
