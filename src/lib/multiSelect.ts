import type { NodePatch, SceneNode } from "@/types/document";
import { scaleNodeTree } from "@/lib/transform";

// Pure helpers for editing several nodes at once: the selection's bounding box,
// shared ("common") property values, and batch translate / resize. All return
// new data; the store applies them in a single history step.

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Axis-aligned bounding box of a selection (uses each node's own coords). */
export function selectionBounds(nodes: SceneNode[]): Bounds {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * The value of `key` shared by every node, or undefined when they differ
 * ("mixed"). Falsy-but-equal values (0, "") are returned as-is.
 */
export function commonValue<K extends keyof SceneNode>(nodes: SceneNode[], key: K): SceneNode[K] | undefined {
  if (nodes.length === 0) return undefined;
  const first = nodes[0][key];
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i][key] !== first) return undefined;
  }
  return first;
}

/** Move every node by (dx, dy). */
export function translateSelection(nodes: SceneNode[], dx: number, dy: number): SceneNode[] {
  if (dx === 0 && dy === 0) return nodes;
  return nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }) as SceneNode);
}

/**
 * Resize the selection's bounding box to (newWidth, newHeight), scaling each
 * node's position, size, and subtree about the box origin.
 */
export function resizeSelection(nodes: SceneNode[], bounds: Bounds, newWidth: number, newHeight: number): SceneNode[] {
  const w = Math.max(1, newWidth);
  const h = Math.max(1, newHeight);
  if (bounds.width <= 0 || bounds.height <= 0) return nodes;
  const sx = w / bounds.width;
  const sy = h / bounds.height;
  if (sx === 1 && sy === 1) return nodes;
  return nodes.map((n) => {
    const scaled = scaleNodeTree(n, sx, sy);
    // scaleNodeTree scales position about (0,0); re-anchor to the box origin.
    return {
      ...scaled,
      x: bounds.x + (n.x - bounds.x) * sx,
      y: bounds.y + (n.y - bounds.y) * sy,
    } as SceneNode;
  });
}

/** Whether any node in the selection supports a corner radius. */
export function selectionHasRadius(nodes: SceneNode[]): boolean {
  return nodes.some((n) => n.type === "rect" || n.type === "frame");
}

/** Build per-node patches that set the same fields on every id. */
export function uniformPatches(ids: string[], patch: NodePatch): { id: string; patch: NodePatch }[] {
  return ids.map((id) => ({ id, patch }));
}
