import { isContainer, type SceneNode } from "@/types/document";

// Alignment + spacing snapping in document space. We compare the dragged box's
// edges and centers (left / center / right, top / middle / bottom) against every
// other node's, and snap to the nearest within a threshold — the classic "smart
// guides" behaviour. Pure functions, no Konva.

/** Snap distance in screen pixels (callers divide by zoom for doc-space). */
export const SNAP_PX = 6;

export interface SnapBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guide {
  axis: "x" | "y";
  pos: number;
  start: number;
  end: number;
}

/** A pink equal-spacing marker segment with a gap label. */
export interface SpacingMarker {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  lx: number;
  ly: number;
}

export interface SpacingResult {
  dx: number;
  dy: number;
  markers: SpacingMarker[];
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

/** Absolute document-space boxes for every visible node except the excluded ids (and their subtrees). */
export function collectBoxes(
  nodes: SceneNode[],
  ox: number,
  oy: number,
  exclude: ReadonlySet<string>,
  out: SnapBox[],
): void {
  for (const node of nodes) {
    if (exclude.has(node.id) || !node.visible) continue;
    const box: SnapBox = { x: ox + node.x, y: oy + node.y, w: node.width, h: node.height };
    out.push(box);
    if (isContainer(node)) collectBoxes(node.children, box.x, box.y, exclude, out);
  }
}

export function computeSnap(box: SnapBox, candidates: SnapBox[], threshold: number): SnapResult {
  const dragX = [box.x, box.x + box.w / 2, box.x + box.w];
  const dragY = [box.y, box.y + box.h / 2, box.y + box.h];

  let bestDx = Infinity;
  let bestDy = Infinity;
  let vGuide: Guide | null = null;
  let hGuide: Guide | null = null;

  for (const c of candidates) {
    const candX = [c.x, c.x + c.w / 2, c.x + c.w];
    const candY = [c.y, c.y + c.h / 2, c.y + c.h];

    for (const d of dragX) {
      for (const cv of candX) {
        const diff = cv - d;
        if (Math.abs(diff) <= threshold && Math.abs(diff) < Math.abs(bestDx)) {
          bestDx = diff;
          vGuide = {
            axis: "x",
            pos: cv,
            start: Math.min(box.y, c.y),
            end: Math.max(box.y + box.h, c.y + c.h),
          };
        }
      }
    }
    for (const d of dragY) {
      for (const ch of candY) {
        const diff = ch - d;
        if (Math.abs(diff) <= threshold && Math.abs(diff) < Math.abs(bestDy)) {
          bestDy = diff;
          hGuide = {
            axis: "y",
            pos: ch,
            start: Math.min(box.x, c.x),
            end: Math.max(box.x + box.w, c.x + c.w),
          };
        }
      }
    }
  }

  const guides: Guide[] = [];
  if (vGuide) guides.push(vGuide);
  if (hGuide) guides.push(hGuide);
  return {
    dx: Number.isFinite(bestDx) ? bestDx : 0,
    dy: Number.isFinite(bestDy) ? bestDy : 0,
    guides,
  };
}

/** Unique edge + center lines from a set of boxes (for resize snapping). */
export function candidateLines(boxes: SnapBox[]): { v: number[]; h: number[] } {
  const v: number[] = [];
  const h: number[] = [];
  for (const b of boxes) {
    v.push(b.x, b.x + b.w / 2, b.x + b.w);
    h.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  return { v, h };
}

const overlapV = (a: SnapBox, b: SnapBox) => !(a.y > b.y + b.h || a.y + a.h < b.y);
const overlapH = (a: SnapBox, b: SnapBox) => !(a.x > b.x + b.w || a.x + a.w < b.x);

/**
 * Equal-spacing detection: if the dragged box sits between a left/right (or
 * top/bottom) neighbour with nearly-equal gaps, snap to exactly equal and emit
 * pink markers. Covers the common "centered between two neighbours" case.
 */
export function computeSpacing(box: SnapBox, candidates: SnapBox[], threshold: number): SpacingResult {
  let dx = 0;
  let dy = 0;
  const markers: SpacingMarker[] = [];

  const lefts = candidates.filter((c) => overlapV(box, c) && c.x + c.w <= box.x + 1);
  const rights = candidates.filter((c) => overlapV(box, c) && c.x >= box.x + box.w - 1);
  if (lefts.length && rights.length) {
    const L = lefts.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a));
    const R = rights.reduce((a, b) => (b.x < a.x ? b : a));
    const gapL = box.x - (L.x + L.w);
    const gapR = R.x - (box.x + box.w);
    const equal = (R.x - (L.x + L.w) - box.w) / 2;
    if (gapL > 0 && gapR > 0 && equal > 0 && Math.abs(gapL - gapR) <= threshold) {
      dx = L.x + L.w + equal - box.x;
      const nx = box.x + dx;
      const cy = box.y + box.h / 2;
      const g = `${Math.round(equal)}`;
      markers.push({ x1: L.x + L.w, y1: cy, x2: nx, y2: cy, label: g, lx: (L.x + L.w + nx) / 2, ly: cy });
      markers.push({ x1: nx + box.w, y1: cy, x2: R.x, y2: cy, label: g, lx: (nx + box.w + R.x) / 2, ly: cy });
    }
  }

  const tops = candidates.filter((c) => overlapH(box, c) && c.y + c.h <= box.y + 1);
  const bottoms = candidates.filter((c) => overlapH(box, c) && c.y >= box.y + box.h - 1);
  if (tops.length && bottoms.length) {
    const T = tops.reduce((a, b) => (b.y + b.h > a.y + a.h ? b : a));
    const B = bottoms.reduce((a, b) => (b.y < a.y ? b : a));
    const gapT = box.y - (T.y + T.h);
    const gapB = B.y - (box.y + box.h);
    const equal = (B.y - (T.y + T.h) - box.h) / 2;
    if (gapT > 0 && gapB > 0 && equal > 0 && Math.abs(gapT - gapB) <= threshold) {
      dy = T.y + T.h + equal - box.y;
      const ny = box.y + dy;
      const cx = box.x + box.w / 2;
      const g = `${Math.round(equal)}`;
      markers.push({ x1: cx, y1: T.y + T.h, x2: cx, y2: ny, label: g, lx: cx, ly: (T.y + T.h + ny) / 2 });
      markers.push({ x1: cx, y1: ny + box.h, x2: cx, y2: B.y, label: g, lx: cx, ly: (ny + box.h + B.y) / 2 });
    }
  }

  return { dx, dy, markers };
}
