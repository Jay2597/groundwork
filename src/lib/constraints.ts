import type { SceneNode } from "@/types/document";

/**
 * Reposition / resize a frame's children when the frame is resized, honoring
 * each child's horizontal & vertical constraints. Default is "min" (pin to the
 * top-left, keep size) which matches the historical behaviour.
 */
export function applyConstraints(
  children: SceneNode[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
): SceneNode[] {
  const sx = oldW === 0 ? 1 : newW / oldW;
  const sy = oldH === 0 ? 1 : newH / oldH;

  return children.map((c) => {
    const h = c.constraintH ?? "min";
    const v = c.constraintV ?? "min";

    let x = c.x;
    let width = c.width;
    if (h === "max") {
      const right = oldW - (c.x + c.width);
      x = newW - right - c.width;
    } else if (h === "center") {
      const cx = c.x + c.width / 2;
      x = cx * sx - c.width / 2;
    } else if (h === "stretch") {
      const right = oldW - (c.x + c.width);
      width = Math.max(1, newW - c.x - right);
    } else if (h === "scale") {
      x = c.x * sx;
      width = Math.max(1, c.width * sx);
    }

    let y = c.y;
    let height = c.height;
    if (v === "max") {
      const bottom = oldH - (c.y + c.height);
      y = newH - bottom - c.height;
    } else if (v === "center") {
      const cy = c.y + c.height / 2;
      y = cy * sy - c.height / 2;
    } else if (v === "stretch") {
      const bottom = oldH - (c.y + c.height);
      height = Math.max(1, newH - c.y - bottom);
    } else if (v === "scale") {
      y = c.y * sy;
      height = Math.max(1, c.height * sy);
    }

    return { ...c, x, y, width, height } as SceneNode;
  });
}
