// Pure point-list edits for the on-canvas vector editor. Points are a flat
// [x0,y0,x1,y1,…] list in the path node's local space.

export interface Vertex {
  x: number;
  y: number;
}

/** Read the anchors as {x, y} pairs. */
export function vertices(points: number[]): Vertex[] {
  const out: Vertex[] = [];
  for (let i = 0; i < points.length; i += 2) out.push({ x: points[i], y: points[i + 1] });
  return out;
}

/** Move anchor `index` to (x, y). Returns a new points array. */
export function moveVertex(points: number[], index: number, x: number, y: number): number[] {
  if (index < 0 || index * 2 + 1 >= points.length) return points;
  const next = points.slice();
  next[index * 2] = x;
  next[index * 2 + 1] = y;
  return next;
}

/** Insert a new anchor after `index` at (x, y). */
export function insertVertex(points: number[], index: number, x: number, y: number): number[] {
  const at = Math.min(Math.max(index + 1, 0), points.length / 2);
  const next = points.slice();
  next.splice(at * 2, 0, x, y);
  return next;
}

/** Delete anchor `index`. Keeps at least two anchors. */
export function deleteVertex(points: number[], index: number): number[] {
  if (points.length <= 4) return points;
  if (index < 0 || index * 2 + 1 >= points.length) return points;
  const next = points.slice();
  next.splice(index * 2, 2);
  return next;
}

/** Midpoints of each editable segment, with the index they'd insert after. */
export function segmentMidpoints(points: number[], closed: boolean): { x: number; y: number; afterIndex: number }[] {
  const verts = vertices(points);
  const out: { x: number; y: number; afterIndex: number }[] = [];
  const last = closed ? verts.length : verts.length - 1;
  for (let i = 0; i < last; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, afterIndex: i });
  }
  return out;
}
