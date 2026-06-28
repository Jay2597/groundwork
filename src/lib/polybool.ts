// Self-contained polygon boolean clipper (Greiner–Hormann) for true-geometry
// boolean operations. Operates on simple (non-self-intersecting) polygons given
// as flat [x0,y0,x1,y1,…] rings. Returns one or more result rings. Degenerate
// cases (shared vertices / collinear overlaps) return null so callers can fall
// back to the composited boolean. No external dependencies.

export type Ring = number[];
export type PolyOp = "union" | "intersect" | "subtract" | "exclude";

interface V {
  x: number;
  y: number;
  next: V;
  prev: V;
  intersect: boolean;
  entry: boolean;
  neighbour?: V;
  alpha: number;
  visited: boolean;
}

function toVertices(ring: Ring): V | null {
  const n = ring.length / 2;
  if (n < 3) return null;
  let first: V | null = null;
  let prev: V | null = null;
  for (let i = 0; i < n; i++) {
    const v: V = {
      x: ring[i * 2],
      y: ring[i * 2 + 1],
      next: null as unknown as V,
      prev: null as unknown as V,
      intersect: false,
      entry: false,
      alpha: 0,
      visited: false,
    };
    if (!first) first = v;
    if (prev) {
      prev.next = v;
      v.prev = prev;
    }
    prev = v;
  }
  if (!first || !prev) return null;
  prev.next = first;
  first.prev = prev;
  return first;
}

/** Segment-segment intersection; returns alphas along each segment or null. */
function intersection(a: V, a2: V, b: V, b2: V): { alphaA: number; alphaB: number; x: number; y: number } | null {
  const dax = a2.x - a.x;
  const day = a2.y - a.y;
  const dbx = b2.x - b.x;
  const dby = b2.y - b.y;
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-12) return null; // parallel / collinear
  const tA = ((b.x - a.x) * dby - (b.y - a.y) * dbx) / denom;
  const tB = ((b.x - a.x) * day - (b.y - a.y) * dax) / denom;
  // Strictly interior intersections only (avoid degenerate vertex hits).
  if (tA <= 1e-9 || tA >= 1 - 1e-9 || tB <= 1e-9 || tB >= 1 - 1e-9) return null;
  return { alphaA: tA, alphaB: tB, x: a.x + tA * dax, y: a.y + tA * day };
}

function insertBetween(v: V, start: V, end: V): void {
  let cur = start;
  while (cur !== end && cur.alpha < v.alpha) cur = cur.next;
  v.next = cur;
  v.prev = cur.prev;
  cur.prev.next = v;
  cur.prev = v;
}

function pointInPoly(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  const n = ring.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2];
    const yi = ring[i * 2 + 1];
    const xj = ring[j * 2];
    const yj = ring[j * 2 + 1];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/**
 * Clip subject polygon against clip polygon with the given op. Returns result
 * rings, or null when the inputs are degenerate for this simple implementation.
 */
export function clipPolygons(subject: Ring, clip: Ring, op: PolyOp): Ring[] | null {
  const s = toVertices(subject);
  const c = toVertices(clip);
  if (!s || !c) return null;

  // Phase 1 — find and insert intersections.
  let count = 0;
  let sv: V = s;
  do {
    if (!sv.intersect) {
      let cv: V = c;
      do {
        if (!cv.intersect) {
          const inter = intersection(sv, nextNonIntersect(sv), cv, nextNonIntersect(cv));
          if (inter) {
            const a: V = { x: inter.x, y: inter.y, next: null as unknown as V, prev: null as unknown as V, intersect: true, entry: false, alpha: inter.alphaA, visited: false };
            const b: V = { x: inter.x, y: inter.y, next: null as unknown as V, prev: null as unknown as V, intersect: true, entry: false, alpha: inter.alphaB, visited: false };
            a.neighbour = b;
            b.neighbour = a;
            insertBetween(a, sv, nextNonIntersect(sv));
            insertBetween(b, cv, nextNonIntersect(cv));
            count++;
          }
        }
        cv = cv.next;
      } while (cv !== c);
    }
    sv = sv.next;
  } while (sv !== s);

  if (count === 0 || count % 2 !== 0) return null; // no clean intersection set

  // Phase 2 — entry/exit flags.
  //   intersect: no inversion · union: invert both · A−B: invert subject only.
  const subjectInvert = op === "union" || op === "subtract";
  const clipInvert = op === "union";
  const subjectInClip = pointInPoly(s.x, s.y, clip);
  markFlags(s, subjectInClip, subjectInvert);
  const clipInSubject = pointInPoly(c.x, c.y, subject);
  markFlags(c, clipInSubject, clipInvert);

  // Phase 3 — trace result rings.
  const rings: Ring[] = [];
  let guard = 0;
  let startV = firstUnvisitedIntersection(s);
  while (startV && guard++ < 10000) {
    const ring: Ring = [];
    let v: V = startV;
    do {
      v.visited = true;
      if (v.neighbour) v.neighbour.visited = true;
      ring.push(v.x, v.y);
      if (v.entry) {
        do {
          v = v.next;
          ring.push(v.x, v.y);
        } while (!v.intersect);
      } else {
        do {
          v = v.prev;
          ring.push(v.x, v.y);
        } while (!v.intersect);
      }
      v = v.neighbour as V;
    } while (!v.visited && guard++ < 10000);
    if (ring.length >= 6) rings.push(dedupeRing(ring));
    startV = firstUnvisitedIntersection(s);
  }

  return rings.length ? rings : null;
}

function nextNonIntersect(v: V): V {
  let n = v.next;
  while (n.intersect) n = n.next;
  return n;
}

function markFlags(start: V, startInside: boolean, invert: boolean): void {
  let entry = !startInside;
  if (invert) entry = !entry;
  let v = start;
  do {
    if (v.intersect) {
      v.entry = entry;
      entry = !entry;
    }
    v = v.next;
  } while (v !== start);
}

function firstUnvisitedIntersection(start: V): V | undefined {
  let v = start;
  do {
    if (v.intersect && !v.visited) return v;
    v = v.next;
  } while (v !== start);
  return undefined;
}

function dedupeRing(ring: Ring): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i += 2) {
    const x = ring[i];
    const y = ring[i + 1];
    const lx = out[out.length - 2];
    const ly = out[out.length - 1];
    if (lx === undefined || Math.abs(lx - x) > 1e-6 || Math.abs(ly - y) > 1e-6) out.push(x, y);
  }
  // drop closing duplicate
  if (out.length >= 4 && Math.abs(out[0] - out[out.length - 2]) < 1e-6 && Math.abs(out[1] - out[out.length - 1]) < 1e-6) {
    out.length -= 2;
  }
  return out;
}

/** Signed area of a ring (shoelace). */
export function ringArea(ring: Ring): number {
  let area = 0;
  const n = ring.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += (ring[j * 2] + ring[i * 2]) * (ring[j * 2 + 1] - ring[i * 2 + 1]);
  }
  return Math.abs(area / 2);
}
