// Smooth-curve geometry for the pen tool. A "smooth" path stores plain anchor
// points (like a polyline); these helpers interpret them as a Catmull-Rom
// spline and convert to cubic Béziers so the curve renders and exports as true
// vector curves — no external library, all computed in code.

export interface CubicSegment {
  /** Segment start anchor. */
  x0: number;
  y0: number;
  /** First control point. */
  cx1: number;
  cy1: number;
  /** Second control point. */
  cx2: number;
  cy2: number;
  /** Segment end anchor. */
  x1: number;
  y1: number;
}

/** Read anchor `i` from a flat [x0,y0,x1,y1,…] array (clamped to ends). */
function anchor(points: number[], i: number, closed: boolean): { x: number; y: number } {
  const n = points.length / 2;
  let idx = i;
  if (closed) idx = ((i % n) + n) % n;
  else idx = Math.max(0, Math.min(n - 1, i));
  return { x: points[idx * 2], y: points[idx * 2 + 1] };
}

/**
 * Convert a flat anchor list into cubic Bézier segments using a centripetal-ish
 * Catmull-Rom formulation. `tension` 0 → loose, 1 → tight (default 0.5 matches
 * Konva's smoothing closely enough for consistent render/export).
 */
export function catmullRomToBezier(points: number[], closed: boolean, tension = 0.5): CubicSegment[] {
  const n = points.length / 2;
  if (n < 2) return [];
  const segs: CubicSegment[] = [];
  const last = closed ? n : n - 1;
  const k = (1 - tension) / 6;
  for (let i = 0; i < last; i++) {
    const p0 = anchor(points, i - 1, closed);
    const p1 = anchor(points, i, closed);
    const p2 = anchor(points, i + 1, closed);
    const p3 = anchor(points, i + 2, closed);
    segs.push({
      x0: p1.x,
      y0: p1.y,
      cx1: p1.x + (p2.x - p0.x) * k,
      cy1: p1.y + (p2.y - p0.y) * k,
      cx2: p2.x - (p3.x - p1.x) * k,
      cy2: p2.y - (p3.y - p1.y) * k,
      x1: p2.x,
      y1: p2.y,
    });
  }
  return segs;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** SVG path "d" data for a smooth curve through `points`, offset by (ox, oy). */
export function smoothPathToSvgD(points: number[], closed: boolean, ox = 0, oy = 0, tension = 0.5): string {
  if (points.length < 4) return "";
  const segs = catmullRomToBezier(points, closed, tension);
  if (segs.length === 0) return "";
  let d = `M${round(ox + segs[0].x0)},${round(oy + segs[0].y0)}`;
  for (const s of segs) {
    d += ` C${round(ox + s.cx1)},${round(oy + s.cy1)} ${round(ox + s.cx2)},${round(oy + s.cy2)} ${round(ox + s.x1)},${round(oy + s.y1)}`;
  }
  if (closed) d += " Z";
  return d;
}

/** Sample a smooth curve into a dense polyline (for hit-testing / flatten). */
export function sampleSmooth(points: number[], closed: boolean, perSeg = 12, tension = 0.5): number[] {
  const segs = catmullRomToBezier(points, closed, tension);
  if (segs.length === 0) return points.slice();
  const out: number[] = [];
  for (const s of segs) {
    for (let t = 0; t < perSeg; t++) {
      const u = t / perSeg;
      const mt = 1 - u;
      const x = mt * mt * mt * s.x0 + 3 * mt * mt * u * s.cx1 + 3 * mt * u * u * s.cx2 + u * u * u * s.x1;
      const y = mt * mt * mt * s.y0 + 3 * mt * mt * u * s.cy1 + 3 * mt * u * u * s.cy2 + u * u * u * s.y1;
      out.push(x, y);
    }
  }
  const lastSeg = segs[segs.length - 1];
  if (!closed) out.push(lastSeg.x1, lastSeg.y1);
  return out;
}
