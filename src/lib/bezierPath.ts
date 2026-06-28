import type { CubicSegment } from "@/lib/bezier";

// Explicit per-vertex Bézier handles. `handles` runs parallel to a path's flat
// anchor list: four numbers per anchor — [inDX, inDY, outDX, outDY] — giving the
// incoming and outgoing control points *relative* to that anchor. A zero pair
// means a sharp corner. Handles are stored relative so they move with the anchor
// for free. Pure geometry only; rendering/export/editor build on these.

const HANDLE_STRIDE = 4;

export function anchorCount(points: number[]): number {
  return Math.floor(points.length / 2);
}

export function inHandle(handles: number[], i: number): { dx: number; dy: number } {
  return { dx: handles[i * HANDLE_STRIDE] ?? 0, dy: handles[i * HANDLE_STRIDE + 1] ?? 0 };
}

export function outHandle(handles: number[], i: number): { dx: number; dy: number } {
  return { dx: handles[i * HANDLE_STRIDE + 2] ?? 0, dy: handles[i * HANDLE_STRIDE + 3] ?? 0 };
}

/** Set one handle (kind "in" or "out") of anchor `i`, returning a new array. */
export function setHandle(handles: number[], i: number, kind: "in" | "out", dx: number, dy: number, mirror = false): number[] {
  const next = handles.slice();
  const base = i * HANDLE_STRIDE;
  if (kind === "in") {
    next[base] = dx;
    next[base + 1] = dy;
    if (mirror) {
      next[base + 2] = -dx;
      next[base + 3] = -dy;
    }
  } else {
    next[base + 2] = dx;
    next[base + 3] = dy;
    if (mirror) {
      next[base] = -dx;
      next[base + 1] = -dy;
    }
  }
  return next;
}

/** A zero-filled handle array sized for `points`. */
export function zeroHandles(points: number[]): number[] {
  return new Array(anchorCount(points) * HANDLE_STRIDE).fill(0);
}

/** Insert a zero handle slot for a newly-added anchor after `index`. */
export function insertHandleSlot(handles: number[], index: number): number[] {
  const at = (index + 1) * HANDLE_STRIDE;
  const next = handles.slice();
  next.splice(at, 0, 0, 0, 0, 0);
  return next;
}

/** Remove the handle slot for a deleted anchor. */
export function deleteHandleSlot(handles: number[], index: number): number[] {
  const next = handles.slice();
  next.splice(index * HANDLE_STRIDE, HANDLE_STRIDE);
  return next;
}

function anchor(points: number[], i: number): { x: number; y: number } {
  return { x: points[i * 2], y: points[i * 2 + 1] };
}

/** Cubic segments described by explicit handles. */
export function handleSegments(points: number[], handles: number[], closed: boolean): CubicSegment[] {
  const n = anchorCount(points);
  if (n < 2) return [];
  const segs: CubicSegment[] = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const j = (i + 1) % n;
    const a = anchor(points, i);
    const b = anchor(points, j);
    const ao = outHandle(handles, i);
    const bi = inHandle(handles, j);
    segs.push({
      x0: a.x,
      y0: a.y,
      cx1: a.x + ao.dx,
      cy1: a.y + ao.dy,
      cx2: b.x + bi.dx,
      cy2: b.y + bi.dy,
      x1: b.x,
      y1: b.y,
    });
  }
  return segs;
}

/**
 * Derive symmetric smooth handles (Catmull-Rom tangents) for every anchor, so a
 * "smooth" path can be promoted to editable handles that reproduce its curve.
 */
export function deriveSmoothHandles(points: number[], closed: boolean, tension = 0.5): number[] {
  const n = anchorCount(points);
  const k = (1 - tension) / 6;
  const out: number[] = new Array(n * HANDLE_STRIDE).fill(0);
  const at = (i: number) => {
    const idx = closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
    return anchor(points, idx);
  };
  for (let i = 0; i < n; i++) {
    const prev = at(i - 1);
    const next = at(i + 1);
    const tx = (next.x - prev.x) * k;
    const ty = (next.y - prev.y) * k;
    out[i * HANDLE_STRIDE] = -tx; // in handle
    out[i * HANDLE_STRIDE + 1] = -ty;
    out[i * HANDLE_STRIDE + 2] = tx; // out handle
    out[i * HANDLE_STRIDE + 3] = ty;
  }
  return out;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** SVG path "d" for a handle-driven curve, offset by (ox, oy). */
export function handlePathToSvgD(points: number[], handles: number[], closed: boolean, ox = 0, oy = 0): string {
  const segs = handleSegments(points, handles, closed);
  if (segs.length === 0) return "";
  let d = `M${round(ox + segs[0].x0)},${round(oy + segs[0].y0)}`;
  for (const s of segs) {
    d += ` C${round(ox + s.cx1)},${round(oy + s.cy1)} ${round(ox + s.cx2)},${round(oy + s.cy2)} ${round(ox + s.x1)},${round(oy + s.y1)}`;
  }
  if (closed) d += " Z";
  return d;
}

/** Sample a handle-driven curve into a dense polyline (for hit / flatten). */
export function sampleHandles(points: number[], handles: number[], closed: boolean, perSeg = 12): number[] {
  const segs = handleSegments(points, handles, closed);
  if (segs.length === 0) return points.slice();
  const out: number[] = [];
  for (const s of segs) {
    for (let t = 0; t < perSeg; t++) {
      const u = t / perSeg;
      const mt = 1 - u;
      out.push(
        mt * mt * mt * s.x0 + 3 * mt * mt * u * s.cx1 + 3 * mt * u * u * s.cx2 + u * u * u * s.x1,
        mt * mt * mt * s.y0 + 3 * mt * mt * u * s.cy1 + 3 * mt * u * u * s.cy2 + u * u * u * s.y1,
      );
    }
  }
  const lastSeg = segs[segs.length - 1];
  if (!closed) out.push(lastSeg.x1, lastSeg.y1);
  return out;
}
