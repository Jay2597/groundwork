import type { ImageFill } from "@/types/document";

// Helpers for image crop + tile fills. Crop is stored as a normalized rect so it
// is resolution-independent; these convert it to the pixel rect Konva wants.

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Convert a normalized crop rect to image-pixel coordinates (clamped to 0–1). */
export function cropToPixels(
  crop: [number, number, number, number],
  naturalWidth: number,
  naturalHeight: number,
): PixelRect {
  const [x, y, w, h] = crop;
  const cx = clamp01(x);
  const cy = clamp01(y);
  const cw = clamp01(w);
  const ch = clamp01(h);
  return {
    x: cx * naturalWidth,
    y: cy * naturalHeight,
    width: Math.max(1, cw * naturalWidth),
    height: Math.max(1, ch * naturalHeight),
  };
}

/** The default (full-image) crop rect. */
export const FULL_CROP: [number, number, number, number] = [0, 0, 1, 1];

export function isTile(image: ImageFill): boolean {
  return image.fit === "tile";
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
