import { Group } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  isFrame,
  type GroupNode,
  type NodePatch,
  type SceneNode,
} from "@/types/document";
import { scaleNodeTree } from "@/lib/transform";
import { ShapeNode } from "./ShapeNode";
import { FrameView } from "./FrameView";
import { BooleanView } from "./BooleanView";

interface GroupViewProps {
  group: GroupNode;
  draggable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent>) => void;
  onChange: (id: string, patch: NodePatch) => void;
}

/**
 * A group renders as a transparent Konva Group: children move with it, and
 * clicking any child selects the group (not the child). Unlike a frame, resizing
 * a group scales its whole subtree.
 */
export function GroupView({ group, draggable, onSelect, onChange }: GroupViewProps) {
  if (!group.visible) return null;

  function handleDragEnd(e: KonvaEventObject<DragEvent>) {
    onChange(group.id, { x: e.target.x(), y: e.target.y() });
  }

  function handleTransformEnd(e: KonvaEventObject<Event>) {
    const g = e.target as Konva.Group;
    const sx = g.scaleX();
    const sy = g.scaleY();
    g.scaleX(1);
    g.scaleY(1);
    onChange(group.id, {
      x: g.x(),
      y: g.y(),
      width: Math.max(1, group.width * sx),
      height: Math.max(1, group.height * sy),
      rotation: g.rotation(),
      children: group.children.map((c) => scaleNodeTree(c, sx, sy)),
    });
  }

  return (
    <Group
      id={group.id}
      name="scene-node"
      x={group.x}
      y={group.y}
      rotation={group.rotation}
      opacity={group.opacity}
      draggable={draggable && !group.locked}
      onMouseDown={(e) => onSelect(group.id, e)}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {group.children.map((child) => (
        <GroupChild
          key={child.id}
          node={child}
          onSelectGroup={(e) => onSelect(group.id, e)}
          onChange={onChange}
        />
      ))}
    </Group>
  );
}

interface GroupChildProps {
  node: SceneNode;
  onSelectGroup: (e: KonvaEventObject<MouseEvent>) => void;
  onChange: (id: string, patch: NodePatch) => void;
}

/** Children inside a group aren't individually interactive — selecting routes to the group. */
function GroupChild({ node, onSelectGroup, onChange }: GroupChildProps) {
  if (isFrame(node)) {
    return (
      <FrameView
        frame={node}
        frameDraggable={false}
        childDraggable={false}
        onSelect={(_id, e) => onSelectGroup(e)}
        onChange={onChange}
      />
    );
  }
  if (node.type === "group") {
    return (
      <GroupView group={node} draggable={false} onSelect={(_id, e) => onSelectGroup(e)} onChange={onChange} />
    );
  }
  if (node.type === "boolean") {
    return (
      <BooleanView node={node} draggable={false} onSelect={(_id, e) => onSelectGroup(e)} onChange={onChange} />
    );
  }
  return (
    <ShapeNode
      node={node}
      draggable={false}
      onSelect={onSelectGroup}
      onChange={(patch) => onChange(node.id, patch)}
    />
  );
}
