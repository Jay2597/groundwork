import { nanoid } from "nanoid";
import { isContainer, type PathNode, type SceneNode, type SubPath } from "@/types/document";
import { sampleSmooth } from "@/lib/bezier";
import { sampleHandles } from "@/lib/bezierPath";

// Flatten shapes/booleans into a single compound vector path. Each source shape
// becomes one or more contours; the result uses the even-odd fill rule, so a
// "subtract" of two rects flattens to a real donut, etc.

const ELLIPSE_SEGMENTS = 64;

/** A contour with absolute document-space points. */
interface Contour {
  points: number[];
  closed: boolean;
}

function rectContour(x: number, y: number, w: number, h: number): Contour {
  return { points: [x, y, x + w, y, x + w, y + h, x, y + h], closed: true };
}

function ellipseContour(x: number, y: number, w: number, h: number): Contour {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: number[] = [];
  for (let i = 0; i < ELLIPSE_SEGMENTS; i++) {
    const a = (i / ELLIPSE_SEGMENTS) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return { points: pts, closed: true };
}

/** Collect a node's contours in document space (accumulating container offsets). */
function nodeContours(node: SceneNode, ox: number, oy: number): Contour[] {
  if (!node.visible) return [];
  const ax = ox + node.x;
  const ay = oy + node.y;

  switch (node.type) {
    case "rect":
    case "image":
    case "text":
      return [rectContour(ax, ay, node.width, node.height)];
    case "ellipse":
      return [ellipseContour(ax, ay, node.width, node.height)];
    case "path": {
      const sampled =
        node.handles && node.handles.length >= 8 && node.points.length >= 4
          ? sampleHandles(node.points, node.handles, node.closed)
          : node.smooth && node.points.length >= 6
            ? sampleSmooth(node.points, node.closed)
            : node.points;
      const subs: SubPath[] = node.subpaths ?? [{ points: sampled, closed: node.closed }];
      return subs.map((sp) => ({
        points: sp.points.map((p, i) => (i % 2 === 0 ? ax + p : ay + p)),
        closed: sp.closed,
      }));
    }
    default:
      if (isContainer(node)) {
        const out: Contour[] = [];
        for (const child of node.children) out.push(...nodeContours(child, ax, ay));
        return out;
      }
      return [];
  }
}

/** Build one compound PathNode from a selection (top-level, document-space coords). */
export function flattenNodes(nodes: SceneNode[], count: number): PathNode | null {
  const contours: Contour[] = [];
  for (const n of nodes) contours.push(...nodeContours(n, 0, 0));
  if (contours.length === 0) return null;

  // Bounding box of all points.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of contours) {
    for (let i = 0; i < c.points.length; i += 2) {
      minX = Math.min(minX, c.points[i]);
      maxX = Math.max(maxX, c.points[i]);
      minY = Math.min(minY, c.points[i + 1]);
      maxY = Math.max(maxY, c.points[i + 1]);
    }
  }

  const subpaths: SubPath[] = contours.map((c) => ({
    closed: c.closed,
    points: c.points.map((p, i) => (i % 2 === 0 ? p - minX : p - minY)),
  }));

  // Inherit the topmost source's fill/stroke.
  const top = nodes[nodes.length - 1];
  return {
    id: nanoid(8),
    type: "path",
    name: `Flattened ${count}`,
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
