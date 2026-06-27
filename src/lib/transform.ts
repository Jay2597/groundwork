import { isContainer, type SceneNode } from "@/types/document";

/** Uniformly scale a node subtree (used when a group / boolean is resized). */
export function scaleNodeTree(node: SceneNode, sx: number, sy: number): SceneNode {
  const box = { x: node.x * sx, y: node.y * sy, width: node.width * sx, height: node.height * sy };
  if (node.type === "text") {
    return { ...node, ...box, fontSize: node.fontSize * ((sx + sy) / 2) };
  }
  if (node.type === "path") {
    const points = node.points.map((p, i) => (i % 2 === 0 ? p * sx : p * sy));
    return { ...node, ...box, points };
  }
  if (isContainer(node)) {
    return { ...node, ...box, children: node.children.map((c) => scaleNodeTree(c, sx, sy)) };
  }
  return { ...node, ...box };
}
