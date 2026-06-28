import { isContainer, type PathNode, type SceneNode } from "@/types/document";

// Connectors: paths that link two nodes and reflow when those nodes move. The
// endpoint geometry is recomputed from the linked nodes' boxes at render/export
// time. Pure helpers here; a render-time pass rewrites each connector's points.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ConnectorKind = "straight" | "elbow";

function center(b: Box): { x: number; y: number } {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** The point on a box's border along the ray from its center toward (tx, ty). */
export function edgePoint(b: Box, tx: number, ty: number): { x: number; y: number } {
  const c = center(b);
  const dx = tx - c.x;
  const dy = ty - c.y;
  if (dx === 0 && dy === 0) return c;
  const hw = b.width / 2;
  const hh = b.height / 2;
  // Scale the direction so it lands on the nearest vertical/horizontal edge.
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(scaleX, scaleY);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** Flat points [x0,y0,…] for a connector between two boxes. */
export function connectorPoints(a: Box, b: Box, kind: ConnectorKind = "straight"): number[] {
  const ca = center(a);
  const cb = center(b);
  const pa = edgePoint(a, cb.x, cb.y);
  const pb = edgePoint(b, ca.x, ca.y);
  if (kind === "elbow") {
    // Orthogonal: leave horizontally, meet at the midpoint x, then vertically.
    const midX = (pa.x + pb.x) / 2;
    return [pa.x, pa.y, midX, pa.y, midX, pb.y, pb.x, pb.y];
  }
  return [pa.x, pa.y, pb.x, pb.y];
}

/** Look up a node by id anywhere in the tree, returning its absolute-ish box. */
function findBox(nodes: SceneNode[], id: string, ox = 0, oy = 0): Box | null {
  for (const n of nodes) {
    if (n.id === id) return { x: ox + n.x, y: oy + n.y, width: n.width, height: n.height };
    if (isContainer(n)) {
      const found = findBox(n.children, id, ox + n.x, oy + n.y);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Recompute every connector path's geometry from its linked nodes. Returns a new
 * node list when anything changed; connectors whose endpoints are missing are
 * left as-is.
 */
export function resolveConnectors(nodes: SceneNode[]): SceneNode[] {
  let changed = false;
  const out = nodes.map((node) => {
    if (node.type !== "path" || !node.connector) return node;
    const a = findBox(nodes, node.connector.from);
    const b = findBox(nodes, node.connector.to);
    if (!a || !b) return node;
    const points = connectorPoints(a, b, node.connector.kind ?? "straight");
    if (samePoints(points, node.points) && node.x === 0 && node.y === 0) return node;
    changed = true;
    return { ...node, x: 0, y: 0, points, closed: false } as PathNode;
  });
  return changed ? out : nodes;
}

function samePoints(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-6) return false;
  return true;
}
