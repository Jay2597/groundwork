import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Rect, Line } from "react-konva";
import { isFrame, isGroup, type FrameNode, type LayoutGrid, type NodePatch, type SceneNode } from "@/types/document";
import { computeAutoLayout } from "@/lib/autolayout";
import { applyConstraints } from "@/lib/constraints";
import { fillsFor, paintToKonva, strokeToKonva } from "@/lib/paint";
import { dropShadowKonva, blendModeKonva } from "@/lib/effects";
import { ShapeNode } from "./ShapeNode";
import { GroupView } from "./GroupView";
import { BooleanView } from "./BooleanView";

interface FrameViewProps {
  frame: FrameNode;
  frameDraggable: boolean;
  childDraggable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent>) => void;
  onChange: (id: string, patch: NodePatch) => void;
}

/**
 * A frame / artboard. Renders as a Konva Group at the frame origin: a background
 * rect, then a clipped container holding children (positioned relative to the
 * frame). Children move with the frame for free because they live in its group.
 */
export function FrameView({
  frame,
  frameDraggable,
  childDraggable,
  onSelect,
  onChange,
}: FrameViewProps) {
  if (!frame.visible) return null;

  function handleDragEnd(e: KonvaEventObject<DragEvent>) {
    onChange(frame.id, { x: e.target.x(), y: e.target.y() });
  }

  function handleTransformEnd(e: KonvaEventObject<Event>) {
    const group = e.target as Konva.Group;
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();
    group.scaleX(1);
    group.scaleY(1);
    const newWidth = Math.max(1, frame.width * scaleX);
    const newHeight = Math.max(1, frame.height * scaleY);
    // Bake the resize into the frame box; reflow children per their constraints.
    onChange(frame.id, {
      x: group.x(),
      y: group.y(),
      width: newWidth,
      height: newHeight,
      rotation: group.rotation(),
      children: applyConstraints(frame.children, frame.width, frame.height, newWidth, newHeight),
    });
  }

  return (
    <Group
      id={frame.id}
      name="scene-node"
      x={frame.x}
      y={frame.y}
      rotation={frame.rotation}
      opacity={frame.opacity}
      globalCompositeOperation={blendModeKonva(frame) as GlobalCompositeOperation | undefined}
      draggable={frameDraggable && !frame.locked}
      onMouseDown={(e) => onSelect(frame.id, e)}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {fillsFor(frame).map((p, i, arr) => (
        <Rect
          key={i}
          width={frame.width}
          height={frame.height}
          cornerRadius={frame.cornerRadius ?? 0}
          {...paintToKonva(p, frame.width, frame.height)}
          {...(i === arr.length - 1
            ? { ...strokeToKonva(frame.stroke), ...dropShadowKonva(frame) }
            : {})}
        />
      ))}
      <Group
        clip={
          frame.clipContent
            ? { x: 0, y: 0, width: frame.width, height: frame.height }
            : undefined
        }
      >
        {(() => {
          const layout = frame.autoLayout ? computeAutoLayout(frame) : null;
          return frame.children.map((child) => {
            const box = layout?.[child.id];
            const node = box
              ? ({ ...child, x: box.x, y: box.y, width: box.width, height: box.height } as SceneNode)
              : child;
            return (
              <FrameChild
                key={child.id}
                node={node}
                draggable={childDraggable && !layout}
                onSelect={onSelect}
                onChange={onChange}
              />
            );
          });
        })()}
      </Group>
      <LayoutGrids frame={frame} />
    </Group>
  );
}

/** Render the frame's layout grids as non-interactive line overlays. */
function LayoutGrids({ frame }: { frame: FrameNode }) {
  const grids = frame.layoutGrids?.filter((g) => g.visible);
  if (!grids || grids.length === 0) return null;
  return (
    <Group listening={false}>
      {grids.map((grid, gi) => (
        <Group key={gi}>
          {gridLines(grid, frame.width, frame.height).map((seg, i) => (
            <Line key={i} points={seg} stroke={grid.color} strokeWidth={1} opacity={0.6} />
          ))}
        </Group>
      ))}
    </Group>
  );
}

/** Compute line segments [x1,y1,x2,y2] for one layout grid. */
function gridLines(grid: LayoutGrid, w: number, h: number): number[][] {
  const lines: number[][] = [];
  if (grid.type === "grid") {
    const step = Math.max(1, grid.size);
    for (let x = step; x < w; x += step) lines.push([x, 0, x, h]);
    for (let y = step; y < h; y += step) lines.push([0, y, w, y]);
    return lines;
  }
  const isCols = grid.type === "columns";
  const extent = isCols ? w : h;
  const count = Math.max(1, grid.count);
  const usable = extent - grid.margin * 2 - grid.gutter * (count - 1);
  const track = usable / count;
  let pos = grid.margin;
  for (let i = 0; i < count; i++) {
    const a = pos;
    const b = pos + track;
    if (isCols) {
      lines.push([a, 0, a, h]);
      lines.push([b, 0, b, h]);
    } else {
      lines.push([0, a, w, a]);
      lines.push([0, b, w, b]);
    }
    pos = b + grid.gutter;
  }
  return lines;
}

interface FrameChildProps {
  node: SceneNode;
  draggable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent>) => void;
  onChange: (id: string, patch: NodePatch) => void;
}

/** Dispatch a frame child to the right renderer so nested containers work. */
function FrameChild({ node, draggable, onSelect, onChange }: FrameChildProps) {
  if (isFrame(node)) {
    return (
      <FrameView
        frame={node}
        frameDraggable={draggable}
        childDraggable={draggable}
        onSelect={onSelect}
        onChange={onChange}
      />
    );
  }
  if (isGroup(node)) {
    return <GroupView group={node} draggable={draggable} onSelect={onSelect} onChange={onChange} />;
  }
  if (node.type === "boolean") {
    return <BooleanView node={node} draggable={draggable} onSelect={onSelect} onChange={onChange} />;
  }
  return (
    <ShapeNode
      node={node}
      draggable={draggable}
      onSelect={(e) => onSelect(node.id, e)}
      onChange={(patch) => onChange(node.id, patch)}
    />
  );
}
