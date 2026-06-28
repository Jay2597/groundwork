// Arrowhead / endpoint marker geometry for open paths and connectors. Pure: the
// canvas renderer and SVG exporter both build markers from these helpers.

export type MarkerType = "none" | "arrow" | "triangle" | "circle";

export interface Pt {
  x: number;
  y: number;
}

/**
 * Triangle points for an arrowhead whose tip is at `tip`, pointing in the
 * direction from `from` → `tip`. `size` is the arrow length (px). Returns the
 * three polygon vertices (tip, then the two back corners).
 */
export function arrowheadPoints(tip: Pt, from: Pt, size: number): Pt[] {
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular unit vector.
  const px = -uy;
  const py = ux;
  const baseX = tip.x - ux * size;
  const baseY = tip.y - uy * size;
  const half = size * 0.5;
  return [
    { x: tip.x, y: tip.y },
    { x: baseX + px * half, y: baseY + py * half },
    { x: baseX - px * half, y: baseY - py * half },
  ];
}

/** Default arrowhead length for a given stroke width. */
export function markerSize(strokeWidth: number): number {
  return Math.max(8, strokeWidth * 3.5);
}

/** Flat [x0,y0,…] for Konva from a marker triangle. */
export function toFlat(points: Pt[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

/** The endpoints + their inbound neighbor for an open polyline, for marker placement. */
export function endpointTangents(points: number[]): { start?: { tip: Pt; from: Pt }; end?: { tip: Pt; from: Pt } } {
  const n = points.length / 2;
  if (n < 2) return {};
  const at = (i: number): Pt => ({ x: points[i * 2], y: points[i * 2 + 1] });
  return {
    start: { tip: at(0), from: at(1) },
    end: { tip: at(n - 1), from: at(n - 2) },
  };
}
