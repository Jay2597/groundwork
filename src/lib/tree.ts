import {
  isContainer,
  isFrame,
  type ContainerNode,
  type FrameNode,
  type NodePatch,
  type SceneNode,
} from "@/types/document";

// Pure, immutable helpers for walking and editing the node tree. Frames and
// groups hold children; everything else is a leaf. All updates return new
// arrays/objects.

export function updateNodeById(
  nodes: SceneNode[],
  id: string,
  patch: NodePatch,
): SceneNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, ...patch } as SceneNode;
    if (isContainer(node)) {
      return { ...node, children: updateNodeById(node.children, id, patch) };
    }
    return node;
  });
}

export function setContainerChildren(
  nodes: SceneNode[],
  containerId: string,
  children: SceneNode[],
): SceneNode[] {
  return nodes.map((node) => {
    if (node.id === containerId && isContainer(node)) return { ...node, children };
    if (isContainer(node)) {
      return { ...node, children: setContainerChildren(node.children, containerId, children) };
    }
    return node;
  });
}

export function removeNodesById(nodes: SceneNode[], ids: ReadonlySet<string>): SceneNode[] {
  return nodes
    .filter((node) => !ids.has(node.id))
    .map((node) =>
      isContainer(node) ? { ...node, children: removeNodesById(node.children, ids) } : node,
    );
}

export function findNode(nodes: SceneNode[], id: string): SceneNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (isContainer(node)) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** The sibling list that directly contains `id`, plus the parent container (if any). */
export function findSiblings(
  nodes: SceneNode[],
  id: string,
): { siblings: SceneNode[]; parent: ContainerNode | null } | undefined {
  if (nodes.some((n) => n.id === id)) return { siblings: nodes, parent: null };
  for (const node of nodes) {
    if (isContainer(node)) {
      const inChild = findSiblings(node.children, id);
      if (inChild) return inChild.parent ? inChild : { siblings: node.children, parent: node };
    }
  }
  return undefined;
}

/** Append `child` to the children of container `containerId`, immutably. */
export function appendChild(
  nodes: SceneNode[],
  containerId: string,
  child: SceneNode,
): SceneNode[] {
  return nodes.map((node) => {
    if (node.id === containerId && isContainer(node)) {
      return { ...node, children: [...node.children, child] };
    }
    if (isContainer(node)) {
      return { ...node, children: appendChild(node.children, containerId, child) };
    }
    return node;
  });
}

/** Insert `node` into `parentId`'s children (or top level when null) before `beforeId`. */
export function insertNode(
  nodes: SceneNode[],
  parentId: string | null,
  node: SceneNode,
  beforeId: string | null,
): SceneNode[] {
  if (parentId === null) return insertInList(nodes, node, beforeId);
  return nodes.map((n) => {
    if (n.id === parentId && isContainer(n)) {
      return { ...n, children: insertInList(n.children, node, beforeId) };
    }
    if (isContainer(n)) return { ...n, children: insertNode(n.children, parentId, node, beforeId) };
    return n;
  });
}

function insertInList(list: SceneNode[], node: SceneNode, beforeId: string | null): SceneNode[] {
  if (!beforeId) return [...list, node];
  const idx = list.findIndex((n) => n.id === beforeId);
  if (idx < 0) return [...list, node];
  return [...list.slice(0, idx), node, ...list.slice(idx)];
}

/** Absolute origin of a container's content (sum of ancestor offsets), or null. */
export function offsetOf(
  nodes: SceneNode[],
  parentId: string,
  acc: { x: number; y: number } = { x: 0, y: 0 },
): { x: number; y: number } | null {
  for (const n of nodes) {
    if (n.id === parentId) return { x: acc.x + n.x, y: acc.y + n.y };
    if (isContainer(n)) {
      const found = offsetOf(n.children, parentId, { x: acc.x + n.x, y: acc.y + n.y });
      if (found) return found;
    }
  }
  return null;
}

/** Top-level frame whose bounds contain the canvas point, topmost first. */
export function frameAtPoint(
  nodes: SceneNode[],
  x: number,
  y: number,
): FrameNode | undefined {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (
      isFrame(node) &&
      node.visible &&
      x >= node.x &&
      x <= node.x + node.width &&
      y >= node.y &&
      y <= node.y + node.height
    ) {
      return node;
    }
  }
  return undefined;
}

export function countNodes(nodes: SceneNode[]): number {
  return nodes.reduce(
    (sum, n) => sum + 1 + (isContainer(n) ? countNodes(n.children) : 0),
    0,
  );
}
