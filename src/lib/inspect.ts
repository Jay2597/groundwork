// Dev-mode measurement helpers: distances/gaps between two boxes, for the
// inspect readout and redline overlays. Pure and unit-tested.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GapMeasurement {
  /** Horizontal gap between the boxes (0 if they overlap on X). */
  horizontal: number;
  /** Vertical gap between the boxes (0 if they overlap on Y). */
  vertical: number;
  /** Center-to-center distance. */
  distance: number;
}

/** Measure the gap and center distance between two boxes. */
export function measureGap(a: Box, b: Box): GapMeasurement {
  const horizontal = axisGap(a.x, a.x + a.width, b.x, b.x + b.width);
  const vertical = axisGap(a.y, a.y + a.height, b.y, b.y + b.height);
  const acx = a.x + a.width / 2;
  const acy = a.y + a.height / 2;
  const bcx = b.x + b.width / 2;
  const bcy = b.y + b.height / 2;
  const distance = Math.round(Math.hypot(bcx - acx, bcy - acy) * 100) / 100;
  return { horizontal, vertical, distance };
}

function axisGap(a0: number, a1: number, b0: number, b1: number): number {
  if (b0 >= a1) return b0 - a1; // b is after a
  if (a0 >= b1) return a0 - b1; // a is after b
  return 0; // overlapping
}

/** Round a box's measurements for display. */
export function readout(box: Box): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.round(box.x * 100) / 100,
    y: Math.round(box.y * 100) / 100,
    w: Math.round(box.width * 100) / 100,
    h: Math.round(box.height * 100) / 100,
  };
}
