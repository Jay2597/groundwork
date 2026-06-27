import { Group, Rect } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { isFrame, isGroup, type FrameNode, type NodePatch, type SceneNode } from "@/types/document";
import { layoutPositions } from "@/lib/autolayout";
import { applyConstraints } from "@/lib/constraints";
import { fillsFor, paintToKonva, strokeToKonva } from "@/lib/paint";
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
            ? {
                ...strokeToKonva(frame.stroke),
                shadowColor: frame.shadow?.color,
                shadowBlur: frame.shadow?.blur,
                shadowOffsetX: frame.shadow?.offsetX,
                shadowOffsetY: frame.shadow?.offsetY,
                shadowEnabled: Boolean(frame.shadow),
              }
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
          const layout = frame.autoLayout ? layoutPositions(frame) : null;
          return frame.children.map((child) => {
            const pos = layout?.[child.id];
            const node = pos ? ({ ...child, x: pos.x, y: pos.y } as SceneNode) : child;
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
    </Group>
  );
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
