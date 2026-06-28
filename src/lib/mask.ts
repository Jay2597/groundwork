import type { SceneNode } from "@/types/document";
import { catmullRomToBezier } from "@/lib/bezier";
import { sampleHandles } from "@/lib/bezierPath";

// Shape masking: a node flagged `isMask` clips its container's children to its
// own outline. The clip is shape-based (rect / ellipse / path), traced into the
// container's local coordinate space.

/** Index of the first mask among a container's children, or -1. */
export function firstMaskIndex(children: SceneNode[]): number {
  return children.findIndex((c) => c.isMask && c.visible);
}

/** A polygon outline (flat points) approximating a mask node, in container space. */
export function maskOutline(node: SceneNode, segments = 48): number[] {
  const { x, y, width, height } = node;
  if (node.type === "ellipse") {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    const pts: number[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
    }
    return pts;
  }
  if (node.type === "path") {
    const local =
      node.handles && node.handles.length >= 8 && node.points.length >= 4
        ? sampleHandles(node.points, node.handles, node.closed)
        : node.smooth && node.points.length >= 6
          ? samplePts(node.points, node.closed)
          : node.points;
    const out: number[] = [];
    for (let i = 0; i < local.length; i += 2) out.push(x + local[i], y + local[i + 1]);
    return out;
  }
  // rect / image / text / frame / group fall back to the bounding box
  return [x, y, x + width, y, x + width, y + height, x, y + height];
}

function samplePts(points: number[], closed: boolean): number[] {
  const segs = catmullRomToBezier(points, closed);
  const out: number[] = [];
  for (const s of segs) {
    for (let t = 0; t < 8; t++) {
      const u = t / 8;
      const mt = 1 - u;
      out.push(
        mt * mt * mt * s.x0 + 3 * mt * mt * u * s.cx1 + 3 * mt * u * u * s.cx2 + u * u * u * s.x1,
        mt * mt * mt * s.y0 + 3 * mt * mt * u * s.cy1 + 3 * mt * u * u * s.cy2 + u * u * u * s.y1,
      );
    }
  }
  return out;
}

/** Trace a mask outline onto a canvas-like context (for Konva clipFunc). */
export function traceMask(ctx: { beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; closePath(): void }, node: SceneNode): void {
  const pts = maskOutline(node);
  if (pts.length < 4) return;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
