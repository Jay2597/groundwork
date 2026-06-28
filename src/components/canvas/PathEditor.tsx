import { Circle, Group, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PathNode } from "@/types/document";
import { useEditorStore } from "@/store/editorStore";
import { moveVertex, insertVertex, deleteVertex, segmentMidpoints, vertices } from "@/lib/pathEdit";

interface PathEditorProps {
  node: PathNode;
  scale: number;
}

/**
 * On-canvas vector editing for a path: draggable anchor handles, midpoint
 * "add" handles, and alt/right-click to delete a vertex. Operates in the path's
 * document space (anchors are local to node.x / node.y).
 */
export function PathEditor({ node, scale }: PathEditorProps) {
  const updateNode = useEditorStore((s) => s.updateNode);
  const r = 5 / scale;
  const mr = 3.5 / scale;
  const verts = vertices(node.points);
  const mids = segmentMidpoints(node.points, node.closed);

  function dragVertex(index: number, e: KonvaEventObject<DragEvent>) {
    const localX = e.target.x() - node.x;
    const localY = e.target.y() - node.y;
    updateNode(node.id, { points: moveVertex(node.points, index, localX, localY) });
  }

  function addVertex(afterIndex: number, x: number, y: number) {
    updateNode(node.id, { points: insertVertex(node.points, afterIndex, x, y) });
  }

  function removeVertex(index: number, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    e.evt.preventDefault();
    updateNode(node.id, { points: deleteVertex(node.points, index) });
  }

  return (
    <Group listening>
      {mids.map((m, i) => (
        <Rect
          key={`mid-${i}`}
          x={node.x + m.x - mr}
          y={node.y + m.y - mr}
          width={mr * 2}
          height={mr * 2}
          fill="#0d0d0f"
          stroke="#f2a33c"
          strokeWidth={1 / scale}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            addVertex(m.afterIndex, m.x, m.y);
          }}
        />
      ))}
      {verts.map((v, i) => (
        <Circle
          key={`v-${i}`}
          x={node.x + v.x}
          y={node.y + v.y}
          radius={r}
          fill="#f2a33c"
          stroke="#0d0d0f"
          strokeWidth={1 / scale}
          draggable
          onMouseDown={(e) => {
            e.cancelBubble = true;
            if (e.evt.altKey) removeVertex(i, e);
          }}
          onContextMenu={(e) => removeVertex(i, e)}
          onDragMove={(e) => dragVertex(i, e)}
          onDragEnd={(e) => dragVertex(i, e)}
        />
      ))}
    </Group>
  );
}
