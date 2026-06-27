import type { FrameNode } from "@/types/document";

/**
 * Compute auto-layout positions for a frame's direct children (a simple flex
 * container). Returns a map of child id → local {x, y}. Pure — callers apply it
 * at render time, so child model coordinates stay untouched.
 */
export function layoutPositions(frame: FrameNode): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const layout = frame.autoLayout;
  if (!layout) return out;

  const { direction, gap, padding, align } = layout;
  const visible = frame.children.filter((c) => c.visible);

  let cursor = padding;
  for (const child of visible) {
    if (direction === "row") {
      const y =
        align === "center"
          ? (frame.height - child.height) / 2
          : align === "end"
            ? frame.height - padding - child.height
            : padding;
      out[child.id] = { x: cursor, y };
      cursor += child.width + gap;
    } else {
      const x =
        align === "center"
          ? (frame.width - child.width) / 2
          : align === "end"
            ? frame.width - padding - child.width
            : padding;
      out[child.id] = { x, y: cursor };
      cursor += child.height + gap;
    }
  }
  return out;
}
