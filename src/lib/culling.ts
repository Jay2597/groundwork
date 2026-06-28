import type { SceneNode } from "@/types/document";
import type { Viewport } from "@/types/editor";

// Viewport culling: on large pages, only render top-level nodes whose bounds
// intersect the visible area (plus a margin), so Konva isn't drawing thousands
// of off-screen shapes. Pure geometry — wired into the canvas render map.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The document-space rectangle currently visible in the stage, padded by `margin`. */
export function visibleDocRect(viewport: Viewport, stageWidth: number, stageHeight: number, margin = 0): Rect {
  const { scale, x, y } = viewport;
  // `+ 0` normalizes negative zero (so callers/tests see a clean 0).
  const left = -x / scale - margin + 0;
  const top = -y / scale - margin + 0;
  const width = stageWidth / scale + margin * 2;
  const height = stageHeight / scale + margin * 2;
  return { x: left, y: top, width, height };
}

/** Axis-aligned overlap test between a node box and a rect. */
export function intersects(box: Rect, rect: Rect): boolean {
  return !(
    box.x + box.width < rect.x ||
    rect.x + rect.width < box.x ||
    box.y + box.height < rect.y ||
    rect.y + rect.height < box.y
  );
}

/** A rotation-safe bounding box for a node (expands to cover the rotated shape). */
export function nodeBounds(node: SceneNode): Rect {
  if (!node.rotation) return { x: node.x, y: node.y, width: node.width, height: node.height };
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const rad = (node.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = node.width * cos + node.height * sin;
  const h = node.width * sin + node.height * cos;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

/**
 * Keep nodes that intersect the visible rect, plus any whose id is in `keep`
 * (e.g. the current selection, so selected-but-off-screen nodes still render).
 * Culling only kicks in past `threshold` nodes to avoid overhead on small pages.
 */
export function cullNodes(nodes: SceneNode[], rect: Rect, keep: Set<string>, threshold = 80): SceneNode[] {
  if (nodes.length <= threshold) return nodes;
  return nodes.filter((n) => keep.has(n.id) || intersects(nodeBounds(n), rect));
}
