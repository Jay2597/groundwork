import { useEffect, useRef } from "react";
import { Ellipse, Group, Line, Rect } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BooleanNode, BooleanOp, NodePatch, SceneNode } from "@/types/document";
import { scaleNodeTree } from "@/lib/transform";

interface BooleanViewProps {
  node: BooleanNode;
  draggable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent>) => void;
  onChange: (id: string, patch: NodePatch) => void;
}

/** Konva composite operation for each boolean op (applied to operands 2..n). */
const COMPOSITE: Record<BooleanOp, GlobalCompositeOperation> = {
  union: "source-over",
  subtract: "destination-out",
  intersect: "source-in",
  exclude: "xor",
};

/**
 * Renders a boolean combination by drawing its operands into a cached group so
 * the canvas composite operations stay isolated to this node's own buffer.
 * Resizing scales the whole subtree, like a group.
 */
export function BooleanView({ node, draggable, onSelect, onChange }: BooleanViewProps) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.cache();
    group.getLayer()?.batchDraw();
  }, [node]);

  if (!node.visible) return null;

  function handleDragEnd(e: KonvaEventObject<DragEvent>) {
    onChange(node.id, { x: e.target.x(), y: e.target.y() });
  }

  function handleTransformEnd(e: KonvaEventObject<Event>) {
    const g = e.target as Konva.Group;
    const sx = g.scaleX();
    const sy = g.scaleY();
    g.scaleX(1);
    g.scaleY(1);
    onChange(node.id, {
      x: g.x(),
      y: g.y(),
      width: Math.max(1, node.width * sx),
      height: Math.max(1, node.height * sy),
      rotation: g.rotation(),
      children: node.children.map((c) => scaleNodeTree(c, sx, sy)),
    });
  }

  return (
    <Group
      id={node.id}
      name="scene-node"
      ref={groupRef}
      x={node.x}
      y={node.y}
      rotation={node.rotation}
      opacity={node.opacity}
      draggable={draggable && !node.locked}
      onMouseDown={(e) => onSelect(node.id, e)}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {node.children.map((child, i) => (
        <Operand
          key={child.id}
          node={child}
          fill={node.fill}
          composite={i === 0 ? "source-over" : COMPOSITE[node.op]}
        />
      ))}
    </Group>
  );
}

/** A single boolean operand — only flat shapes participate. */
function Operand({
  node,
  fill,
  composite,
}: {
  node: SceneNode;
  fill: string;
  composite: GlobalCompositeOperation;
}) {
  if (node.type === "ellipse") {
    return (
      <Ellipse
        x={node.x + node.width / 2}
        y={node.y + node.height / 2}
        radiusX={node.width / 2}
        radiusY={node.height / 2}
        fill={fill}
        globalCompositeOperation={composite}
      />
    );
  }
  if (node.type === "path") {
    return (
      <Line
        x={node.x}
        y={node.y}
        points={node.points}
        closed
        fill={fill}
        globalCompositeOperation={composite}
      />
    );
  }
  // rect (and any other box-shaped node) renders as a rectangle
  return (
    <Rect
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      cornerRadius={node.type === "rect" ? node.cornerRadius : 0}
      fill={fill}
      globalCompositeOperation={composite}
    />
  );
}
