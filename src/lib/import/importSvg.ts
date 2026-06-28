import { nanoid } from "nanoid";
import type { EllipseNode, GroupNode, PathNode, RectNode, SceneNode } from "@/types/document";

// Lightweight SVG → editable Groundwork nodes importer. Parses the common shape
// subset (rect, circle, ellipse, line, polyline, polygon, path with M/L/H/V/Z
// and curve endpoints) using string scanning so it runs in any environment.
// Unknown elements are skipped; callers can fall back to placing the raw SVG.

const BASE = {
  rotation: 0,
  fill: "#cccccc",
  opacity: 1,
  visible: true,
  locked: false,
};

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) out[m[1]] = m[2];
  return out;
}

function num(v: string | undefined, fallback = 0): number {
  if (v === undefined) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function fillOf(a: Record<string, string>): string {
  const f = a.fill;
  if (!f || f === "none") return BASE.fill;
  return f;
}

/** Parse a path "d" string into flat anchor points (curves use their endpoints). */
export function parsePathD(d: string): { points: number[]; closed: boolean } {
  const points: number[] = [];
  let closed = false;
  let cx = 0;
  let cy = 0;
  const re = /([MmLlHhVvCcSsQqTtZz])([^MmLlHhVvCcSsQqTtZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1];
    const nums = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M":
      case "L":
        for (let i = 0; i + 1 < nums.length; i += 2) {
          cx = rel ? cx + nums[i] : nums[i];
          cy = rel ? cy + nums[i + 1] : nums[i + 1];
          points.push(cx, cy);
        }
        break;
      case "H":
        for (const n of nums) {
          cx = rel ? cx + n : n;
          points.push(cx, cy);
        }
        break;
      case "V":
        for (const n of nums) {
          cy = rel ? cy + n : n;
          points.push(cx, cy);
        }
        break;
      case "C":
        for (let i = 0; i + 5 < nums.length; i += 6) {
          cx = rel ? cx + nums[i + 4] : nums[i + 4];
          cy = rel ? cy + nums[i + 5] : nums[i + 5];
          points.push(cx, cy);
        }
        break;
      case "Q":
      case "S":
        for (let i = 0; i + 3 < nums.length; i += 4) {
          cx = rel ? cx + nums[i + 2] : nums[i + 2];
          cy = rel ? cy + nums[i + 3] : nums[i + 3];
          points.push(cx, cy);
        }
        break;
      case "T":
        for (let i = 0; i + 1 < nums.length; i += 2) {
          cx = rel ? cx + nums[i] : nums[i];
          cy = rel ? cy + nums[i + 1] : nums[i + 1];
          points.push(cx, cy);
        }
        break;
      case "Z":
        closed = true;
        break;
    }
  }
  return { points, closed };
}

function pointsToPath(points: number[], closed: boolean, a: Record<string, string>, name: string): PathNode | null {
  if (points.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  const local = points.map((p, i) => (i % 2 === 0 ? p - minX : p - minY));
  return {
    ...BASE,
    id: nanoid(8),
    type: "path",
    name,
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    fill: fillOf(a),
    points: local,
    closed,
  };
}

/** Parse an SVG document string into Groundwork nodes (best-effort subset). */
export function parseSvg(svg: string): SceneNode[] {
  const nodes: SceneNode[] = [];
  let count = 0;
  const tagRe = /<(rect|circle|ellipse|line|polyline|polygon|path)\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(svg)) !== null) {
    const kind = m[1];
    const a = attrs(m[2]);
    count++;
    const name = `${kind} ${count}`;

    if (kind === "rect") {
      const rect: RectNode = {
        ...BASE,
        id: nanoid(8),
        type: "rect",
        name,
        x: num(a.x),
        y: num(a.y),
        width: Math.max(1, num(a.width)),
        height: Math.max(1, num(a.height)),
        fill: fillOf(a),
        cornerRadius: num(a.rx),
      };
      nodes.push(rect);
    } else if (kind === "circle") {
      const r = num(a.r);
      const ell: EllipseNode = {
        ...BASE,
        id: nanoid(8),
        type: "ellipse",
        name,
        x: num(a.cx) - r,
        y: num(a.cy) - r,
        width: Math.max(1, r * 2),
        height: Math.max(1, r * 2),
        fill: fillOf(a),
      };
      nodes.push(ell);
    } else if (kind === "ellipse") {
      const rx = num(a.rx);
      const ry = num(a.ry);
      const ell: EllipseNode = {
        ...BASE,
        id: nanoid(8),
        type: "ellipse",
        name,
        x: num(a.cx) - rx,
        y: num(a.cy) - ry,
        width: Math.max(1, rx * 2),
        height: Math.max(1, ry * 2),
        fill: fillOf(a),
      };
      nodes.push(ell);
    } else if (kind === "line") {
      const pts = [num(a.x1), num(a.y1), num(a.x2), num(a.y2)];
      const path = pointsToPath(pts, false, a, name);
      if (path) nodes.push(path);
    } else if (kind === "polyline" || kind === "polygon") {
      const pts = (a.points?.match(/-?\d*\.?\d+/g) ?? []).map(Number);
      const path = pointsToPath(pts, kind === "polygon", a, name);
      if (path) nodes.push(path);
    } else if (kind === "path") {
      const parsed = parsePathD(a.d ?? "");
      const path = pointsToPath(parsed.points, parsed.closed, a, name);
      if (path) nodes.push(path);
    }
  }
  return nodes;
}

/** Wrap imported nodes in a group placed at (x, y), children made relative. */
export function groupImported(nodes: SceneNode[], x: number, y: number, count: number): GroupNode {
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
  const children = nodes.map((n) => ({ ...n, x: n.x - minX, y: n.y - minY }));
  return {
    ...BASE,
    id: nanoid(8),
    type: "group",
    name: `Imported ${count}`,
    x,
    y,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    children,
  };
}
