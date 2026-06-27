import { nanoid } from "nanoid";
import {
  isContainer,
  type BooleanNode,
  type BooleanOp,
  type Component,
  type EllipseNode,
  type FrameNode,
  type GroupNode,
  type ImageFill,
  type ImageNode,
  type PathNode,
  type RectNode,
  type SceneNode,
  type TextNode,
} from "@/types/document";

// Factory helpers keep node creation in one place so defaults stay consistent.

// A neutral light-gray default shape fill.
const DEFAULT_FILL = "#d9d9d9";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function nextName(type: string, count: number): string {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return `${label} ${count}`;
}

export function createRect(rect: Rect, count: number): RectNode {
  return {
    id: nanoid(8),
    type: "rect",
    name: nextName("rect", count),
    ...normalize(rect),
    rotation: 0,
    fill: DEFAULT_FILL,
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
  };
}

export function createEllipse(rect: Rect, count: number): EllipseNode {
  return {
    id: nanoid(8),
    type: "ellipse",
    name: nextName("ellipse", count),
    ...normalize(rect),
    rotation: 0,
    fill: DEFAULT_FILL,
    opacity: 1,
    visible: true,
    locked: false,
  };
}

export function createText(x: number, y: number, count: number): TextNode {
  return {
    id: nanoid(8),
    type: "text",
    name: nextName("text", count),
    x,
    y,
    width: 220,
    height: 32,
    rotation: 0,
    fill: "#1a1a1a",
    opacity: 1,
    visible: true,
    locked: false,
    text: "Text",
    fontSize: 24,
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    fontStyle: "normal",
  };
}

export function createFrame(rect: Rect, count: number): FrameNode {
  return {
    id: nanoid(8),
    type: "frame",
    name: nextName("frame", count),
    ...normalize(rect),
    rotation: 0,
    fill: "#ffffff",
    opacity: 1,
    visible: true,
    locked: false,
    clipContent: true,
    children: [],
  };
}

export function createImage(rect: Rect, image: ImageFill, count: number): ImageNode {
  return {
    id: nanoid(8),
    type: "image",
    name: nextName("image", count),
    ...normalize(rect),
    rotation: 0,
    fill: "#00000000",
    opacity: 1,
    visible: true,
    locked: false,
    image,
  };
}

/** Create a path node from absolute document points (offset becomes node origin). */
export function createPath(points: { x: number; y: number }[], closed: boolean, count: number): PathNode {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const flat: number[] = [];
  for (const p of points) flat.push(p.x - minX, p.y - minY);
  return {
    id: nanoid(8),
    type: "path",
    name: nextName("path", count),
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    rotation: 0,
    fill: closed ? DEFAULT_FILL : "#00000000",
    opacity: 1,
    visible: true,
    locked: false,
    stroke: closed ? undefined : { color: "#1a1a1a", width: 2 },
    points: flat,
    closed,
  };
}

/** Bounding box of a set of nodes. */
function bounds(nodes: SceneNode[]) {
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return { minX, minY, maxX, maxY };
}

/**
 * Wrap top-level nodes into a group: bounding box becomes the group, each
 * child's coordinates are made relative to the group origin.
 */
export function groupNodes(nodes: SceneNode[], count: number): GroupNode {
  const { minX, minY, maxX, maxY } = bounds(nodes);
  return {
    id: nanoid(8),
    type: "group",
    name: nextName("group", count),
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
    fill: "#ffffff",
    opacity: 1,
    visible: true,
    locked: false,
    children: nodes.map((n) => ({ ...n, x: n.x - minX, y: n.y - minY })),
  };
}

/** Wrap nodes into a new frame sized to their bounding box (children made relative). */
export function frameFromNodes(nodes: SceneNode[], count: number): FrameNode {
  const { minX, minY, maxX, maxY } = bounds(nodes);
  return {
    id: nanoid(8),
    type: "frame",
    name: nextName("frame", count),
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
    fill: "#ffffff",
    opacity: 1,
    visible: true,
    locked: false,
    clipContent: true,
    children: nodes.map((n) => ({ ...n, x: n.x - minX, y: n.y - minY })),
  };
}

/** Combine nodes into a boolean node (shares the first node's fill). */
export function booleanNodes(nodes: SceneNode[], op: BooleanOp, count: number): BooleanNode {
  const { minX, minY, maxX, maxY } = bounds(nodes);
  return {
    id: nanoid(8),
    type: "boolean",
    name: nextName(op, count),
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
    fill: nodes[0].fill,
    opacity: 1,
    visible: true,
    locked: false,
    op,
    children: nodes.map((n) => ({ ...n, x: n.x - minX, y: n.y - minY })),
  };
}

/** Build a reusable component master from a node (cloned to its own origin). */
export function componentFromNode(node: SceneNode, count: number): Component {
  const master = cloneWithNewIds({ ...node, x: 0, y: 0 });
  return {
    id: `cmp-${nanoid(6)}`,
    name: node.name || nextName("component", count),
    node: master,
  };
}

/** Instantiate a component master at an offset position. */
export function instanceFromComponent(component: Component, count: number): SceneNode {
  const clone = cloneWithNewIds(component.node);
  return { ...clone, name: `${component.name} ${count}`, x: 40, y: 40 };
}

/** A drag can produce negative width/height; flip so x,y is always top-left. */
function normalize(rect: Rect): Rect {
  return {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.max(1, Math.abs(rect.width)),
    height: Math.max(1, Math.abs(rect.height)),
  };
}

export function duplicateNode(node: SceneNode, count: number): SceneNode {
  const clone = cloneWithNewIds(node);
  return {
    ...clone,
    name: nextName(node.type, count),
    x: node.x + 16,
    y: node.y + 16,
  };
}

/** Deep clone, assigning fresh ids throughout (containers + their children). */
function cloneWithNewIds(node: SceneNode): SceneNode {
  if (isContainer(node)) {
    return { ...node, id: nanoid(8), children: node.children.map(cloneWithNewIds) };
  }
  return { ...node, id: nanoid(8) };
}
