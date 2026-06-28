import type { AutoLayout, FrameNode, SceneNode } from "@/types/document";

export interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Resolve the four padding sides, falling back to the uniform `padding`. */
export function resolvePadding(layout: AutoLayout): ResolvedPadding {
  return {
    top: layout.paddingTop ?? layout.padding,
    right: layout.paddingRight ?? layout.padding,
    bottom: layout.paddingBottom ?? layout.padding,
    left: layout.paddingLeft ?? layout.padding,
  };
}

export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute auto-layout boxes (position + size) for a frame's direct children.
 * Pure — callers apply the result at render time, so child model coordinates
 * stay untouched. Honours per-side padding, primary-axis `justify`, cross-axis
 * `align`, and "fill" sizing on either axis.
 */
export function computeAutoLayout(frame: FrameNode): Record<string, LayoutBox> {
  const out: Record<string, LayoutBox> = {};
  const layout = frame.autoLayout;
  if (!layout) return out;

  const pad = resolvePadding(layout);
  const visible = frame.children.filter((c) => c.visible);
  if (visible.length === 0) return out;

  const isRow = layout.direction === "row";
  const innerPrimary = isRow ? frame.width - pad.left - pad.right : frame.height - pad.top - pad.bottom;
  const innerCross = isRow ? frame.height - pad.top - pad.bottom : frame.width - pad.left - pad.right;
  const gap = layout.gap;

  // Base primary/cross sizes (model size, unless that axis is set to "fill").
  const primaryOf = (n: SceneNode) => (isRow ? n.width : n.height);
  const crossOf = (n: SceneNode) => (isRow ? n.height : n.width);
  const fillsPrimary = (n: SceneNode) => (isRow ? n.sizingH : n.sizingV) === "fill";
  const fillsCross = (n: SceneNode) => (isRow ? n.sizingV : n.sizingH) === "fill";

  const flexCount = visible.filter(fillsPrimary).length;
  const fixedPrimary = visible.reduce((sum, n) => (fillsPrimary(n) ? sum : sum + primaryOf(n)), 0);
  const totalGap = gap * (visible.length - 1);
  const leftover = Math.max(0, innerPrimary - fixedPrimary - totalGap);
  const flexShare = flexCount > 0 ? leftover / flexCount : 0;

  // Resolve the primary size each child will actually occupy.
  const primarySize = (n: SceneNode) => (fillsPrimary(n) ? flexShare : primaryOf(n));
  const contentPrimary = visible.reduce((sum, n) => sum + primarySize(n), 0) + totalGap;

  // Primary-axis start + inter-item gap, accounting for justify.
  let cursor = isRow ? pad.left : pad.top;
  let stride = gap;
  const justify = layout.justify ?? "start";
  if (flexCount === 0) {
    if (justify === "center") cursor += (innerPrimary - contentPrimary) / 2;
    else if (justify === "end") cursor += innerPrimary - contentPrimary;
    else if (justify === "space-between" && visible.length > 1) {
      stride = gap + (innerPrimary - contentPrimary) / (visible.length - 1);
    }
  }

  for (const child of visible) {
    const cSize = fillsCross(child) ? innerCross : crossOf(child);
    const pSize = primarySize(child);

    // Cross-axis offset from the frame origin.
    let crossPos: number;
    if (fillsCross(child)) {
      crossPos = isRow ? pad.top : pad.left;
    } else if (layout.align === "center") {
      crossPos = (isRow ? pad.top : pad.left) + (innerCross - cSize) / 2;
    } else if (layout.align === "end") {
      crossPos = isRow ? frame.height - pad.bottom - cSize : frame.width - pad.right - cSize;
    } else {
      crossPos = isRow ? pad.top : pad.left;
    }

    out[child.id] = isRow
      ? { x: cursor, y: crossPos, width: pSize, height: cSize }
      : { x: crossPos, y: cursor, width: cSize, height: pSize };
    cursor += pSize + stride;
  }
  return out;
}

/**
 * Back-compat helper: positions only. Kept so existing callers/tests that only
 * need {x, y} keep working.
 */
export function layoutPositions(frame: FrameNode): Record<string, { x: number; y: number }> {
  const boxes = computeAutoLayout(frame);
  const out: Record<string, { x: number; y: number }> = {};
  for (const id in boxes) out[id] = { x: boxes[id].x, y: boxes[id].y };
  return out;
}

/**
 * Content size an auto-layout frame would have if it hugged its children, on the
 * given axis. Returns the full frame extent (content + padding).
 */
export function hugContentSize(frame: FrameNode): { width: number; height: number } {
  const layout = frame.autoLayout;
  const pad = layout ? resolvePadding(layout) : { top: 0, right: 0, bottom: 0, left: 0 };
  const visible = frame.children.filter((c) => c.visible);
  if (!layout || visible.length === 0) {
    return { width: pad.left + pad.right, height: pad.top + pad.bottom };
  }
  const isRow = layout.direction === "row";
  const sumPrimary = visible.reduce((s, n) => s + (isRow ? n.width : n.height), 0);
  const maxCross = visible.reduce((m, n) => Math.max(m, isRow ? n.height : n.width), 0);
  const primary = sumPrimary + layout.gap * (visible.length - 1);
  if (isRow) {
    return { width: primary + pad.left + pad.right, height: maxCross + pad.top + pad.bottom };
  }
  return { width: maxCross + pad.left + pad.right, height: primary + pad.top + pad.bottom };
}

/**
 * Bottom-up normalization: resize any auto-layout frame whose `sizingH`/`sizingV`
 * is "hug" to fit its children. Runs over a whole node tree and returns a new
 * tree (immutable). Called from the store's commit path so hug stays consistent.
 */
export function reflowHug(nodes: SceneNode[]): SceneNode[] {
  let changed = false;
  const next = nodes.map((node) => {
    const reflowed = reflowNode(node);
    if (reflowed !== node) changed = true;
    return reflowed;
  });
  return changed ? next : nodes;
}

function reflowNode(node: SceneNode): SceneNode {
  if (node.type !== "frame" && node.type !== "group" && node.type !== "boolean") return node;
  const children = "children" in node ? node.children : [];
  const newChildren = reflowHug(children);
  let result: SceneNode = newChildren === children ? node : ({ ...node, children: newChildren } as SceneNode);

  if (result.type === "frame" && result.autoLayout) {
    const hug = hugContentSize(result as FrameNode);
    const width = result.sizingH === "hug" ? hug.width : result.width;
    const height = result.sizingV === "hug" ? hug.height : result.height;
    if (width !== result.width || height !== result.height) {
      result = { ...result, width, height };
    }
  }
  return result;
}
