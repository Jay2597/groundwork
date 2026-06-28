import { nanoid } from "nanoid";
import type { BooleanOp, PathNode, SceneNode, SubPath } from "@/types/document";
import { clipPolygons, type Ring } from "@/lib/polybool";

// Convert a set of shapes + a boolean op into a single true-geometry compound
// PathNode using the polygon clipper. Returns null on degenerate input so the
// caller can keep the existing composited boolean.

const ELLIPSE_SEGMENTS = 64;

/** A shape's outline as one ring in document space, or null if unsupported. */
function nodeToRing(node: SceneNode, ox: number, oy: number): Ring | null {
  const x = ox + node.x;
  const y = oy + node.y;
  switch (node.type) {
    case "rect":
    case "image":
    case "text":
      return [x, y, x + node.width, y, x + node.width, y + node.height, x, y + node.height];
    case "ellipse": {
      const cx = x + node.width / 2;
      const cy = y + node.height / 2;
      const rx = node.width / 2;
      const ry = node.height / 2;
      const pts: Ring = [];
      for (let i = 0; i < ELLIPSE_SEGMENTS; i++) {
        const a = (i / ELLIPSE_SEGMENTS) * Math.PI * 2;
        pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
      }
      return pts;
    }
    case "path": {
      if (node.points.length < 6) return null;
      const out: Ring = [];
      for (let i = 0; i < node.points.length; i += 2) out.push(x + node.points[i], y + node.points[i + 1]);
      return out;
    }
    default:
      return null;
  }
}

/** Clip every subject ring against one clip ring, concatenating results. */
function clipMany(subjects: Ring[], clip: Ring, op: "union" | "intersect" | "subtract"): Ring[] | null {
  const out: Ring[] = [];
  for (const s of subjects) {
    const res = clipPolygons(s, clip, op);
    if (!res) return null;
    out.push(...res);
  }
  return out.length ? out : null;
}

/** Reduce a list of rings under a boolean op, left to right. */
export function booleanRings(rings: Ring[], op: BooleanOp): Ring[] | null {
  if (rings.length < 2) return rings.length === 1 ? [rings[0]] : null;

  if (op === "exclude") {
    // XOR of two shapes = (A−B) ∪ (B−A); for >2 reduce pairwise.
    let acc: Ring[] = [rings[0]];
    for (let i = 1; i < rings.length; i++) {
      const aMinusB = clipMany(acc, rings[i], "subtract");
      const bMinusA = clipPolygons(rings[i], acc[0], "subtract");
      if (!aMinusB || !bMinusA) return null;
      acc = [...aMinusB, ...bMinusA];
    }
    return acc;
  }

  const norm: "union" | "intersect" | "subtract" = op === "intersect" ? "intersect" : op === "subtract" ? "subtract" : "union";
  let acc: Ring[] = [rings[0]];
  for (let i = 1; i < rings.length; i++) {
    const res = clipMany(acc, rings[i], norm);
    if (!res) return null;
    acc = res;
  }
  return acc;
}

/** Build a true-geometry compound PathNode from a boolean selection. */
export function trueBooleanPath(nodes: SceneNode[], op: BooleanOp, count: number): PathNode | null {
  const rings: Ring[] = [];
  for (const n of nodes) {
    const r = nodeToRing(n, 0, 0);
    if (!r) return null;
    rings.push(r);
  }
  const result = booleanRings(rings, op);
  if (!result || result.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of result) {
    for (let i = 0; i < ring.length; i += 2) {
      minX = Math.min(minX, ring[i]);
      maxX = Math.max(maxX, ring[i]);
      minY = Math.min(minY, ring[i + 1]);
      maxY = Math.max(maxY, ring[i + 1]);
    }
  }
  if (!Number.isFinite(minX)) return null;

  const subpaths: SubPath[] = result.map((ring) => ({
    closed: true,
    points: ring.map((p, i) => (i % 2 === 0 ? p - minX : p - minY)),
  }));

  const top = nodes[nodes.length - 1];
  return {
    id: nanoid(8),
    type: "path",
    name: `Boolean ${count}`,
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    rotation: 0,
    fill: top.fill,
    fills: top.fills,
    stroke: top.stroke,
    opacity: 1,
    visible: true,
    locked: false,
    points: subpaths[0].points,
    closed: true,
    subpaths,
  };
}
