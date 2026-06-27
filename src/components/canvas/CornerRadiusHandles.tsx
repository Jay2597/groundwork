import { Circle, Group } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { FrameNode, NodePatch, RectNode } from "@/types/document";

interface Props {
  node: RectNode | FrameNode;
  scale: number;
  onChange: (patch: NodePatch) => void;
}

/**
 * Figma-style on-canvas corner-radius handles: four amber dots inset from each
 * corner of a selected rectangle/frame. Dragging any of them sets a uniform
 * cornerRadius. Handles sit a constant screen gap beyond the rounded corner so
 * they never collide with the resize anchors.
 */
export function CornerRadiusHandles({ node, scale, onChange }: Props) {
  const r = node.cornerRadius ?? 0;
  const maxR = Math.min(node.width, node.height) / 2;
  const pad = 12 / scale;
  const dot = 4 / scale;

  // corner anchor + inward sign for each of the four corners
  const corners = [
    { cx: node.x, cy: node.y, sx: 1, sy: 1 },
    { cx: node.x + node.width, cy: node.y, sx: -1, sy: 1 },
    { cx: node.x + node.width, cy: node.y + node.height, sx: -1, sy: -1 },
    { cx: node.x, cy: node.y + node.height, sx: 1, sy: -1 },
  ];

  function onDragMove(corner: (typeof corners)[number]) {
    return (e: KonvaEventObject<DragEvent>) => {
      const h = e.target as Konva.Circle;
      const inwardX = (h.x() - corner.cx) * corner.sx;
      const inwardY = (h.y() - corner.cy) * corner.sy;
      const next = Math.max(0, Math.min(maxR, (inwardX + inwardY) / 2 - pad));
      onChange({ cornerRadius: Math.round(next) });
    };
  }

  return (
    <Group listening>
      {corners.map((c, i) => (
        <Circle
          key={i}
          x={c.cx + c.sx * (r + pad)}
          y={c.cy + c.sy * (r + pad)}
          radius={dot}
          fill="#0d0d0f"
          stroke="#f2a33c"
          strokeWidth={1.5 / scale}
          draggable
          onDragMove={onDragMove(c)}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "";
          }}
        />
      ))}
    </Group>
  );
}
