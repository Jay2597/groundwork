import { Circle, Group, Line, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PathNode } from "@/types/document";
import { useEditorStore } from "@/store/editorStore";
import { moveVertex, insertVertex, deleteVertex, segmentMidpoints, vertices } from "@/lib/pathEdit";
import { inHandle, outHandle, setHandle, insertHandleSlot, deleteHandleSlot } from "@/lib/bezierPath";

interface PathEditorProps {
  node: PathNode;
  scale: number;
}

/**
 * On-canvas vector editing: draggable anchor handles, midpoint "add" handles,
 * and (when the path has Bézier handles) draggable in/out control points with
 * tangent lines. Operates in the path's document space.
 */
export function PathEditor({ node, scale }: PathEditorProps) {
  const updateNode = useEditorStore((s) => s.updateNode);
  const r = 5 / scale;
  const hr = 4 / scale;
  const mr = 3.5 / scale;
  const verts = vertices(node.points);
  const mids = segmentMidpoints(node.points, node.closed);
  const handles = node.handles;
  const hasHandles = Boolean(handles && handles.length >= node.points.length * 2);

  function dragVertex(index: number, e: KonvaEventObject<DragEvent>) {
    const localX = e.target.x() - node.x;
    const localY = e.target.y() - node.y;
    updateNode(node.id, { points: moveVertex(node.points, index, localX, localY) });
  }

  function dragHandle(index: number, kind: "in" | "out", e: KonvaEventObject<DragEvent>) {
    if (!handles) return;
    const ax = node.points[index * 2];
    const ay = node.points[index * 2 + 1];
    const dx = e.target.x() - node.x - ax;
    const dy = e.target.y() - node.y - ay;
    const mirror = !e.evt.altKey; // alt = break tangent (independent handles)
    updateNode(node.id, { handles: setHandle(handles, index, kind, dx, dy, mirror) });
  }

  function addVertex(afterIndex: number, x: number, y: number) {
    const patch: { points: number[]; handles?: number[] } = { points: insertVertex(node.points, afterIndex, x, y) };
    if (handles) patch.handles = insertHandleSlot(handles, afterIndex);
    updateNode(node.id, patch);
  }

  function removeVertex(index: number, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    e.evt.preventDefault();
    if (node.points.length <= 4) return;
    const patch: { points: number[]; handles?: number[] } = { points: deleteVertex(node.points, index) };
    if (handles) patch.handles = deleteHandleSlot(handles, index);
    updateNode(node.id, patch);
  }

  return (
    <Group listening>
      {/* Tangent lines + control dots */}
      {hasHandles &&
        verts.map((v, i) => {
          const ax = node.x + v.x;
          const ay = node.y + v.y;
          const ih = inHandle(handles!, i);
          const oh = outHandle(handles!, i);
          const hasIn = ih.dx !== 0 || ih.dy !== 0;
          const hasOut = oh.dx !== 0 || oh.dy !== 0;
          return (
            <Group key={`h-${i}`}>
              {hasIn && <Line points={[ax, ay, ax + ih.dx, ay + ih.dy]} stroke="#8a8a92" strokeWidth={1 / scale} />}
              {hasOut && <Line points={[ax, ay, ax + oh.dx, ay + oh.dy]} stroke="#8a8a92" strokeWidth={1 / scale} />}
              {hasIn && (
                <Circle
                  x={ax + ih.dx}
                  y={ay + ih.dy}
                  radius={hr}
                  fill="#0d0d0f"
                  stroke="#8a8a92"
                  strokeWidth={1 / scale}
                  draggable
                  onMouseDown={(e) => (e.cancelBubble = true)}
                  onDragMove={(e) => dragHandle(i, "in", e)}
                  onDragEnd={(e) => dragHandle(i, "in", e)}
                />
              )}
              {hasOut && (
                <Circle
                  x={ax + oh.dx}
                  y={ay + oh.dy}
                  radius={hr}
                  fill="#0d0d0f"
                  stroke="#8a8a92"
                  strokeWidth={1 / scale}
                  draggable
                  onMouseDown={(e) => (e.cancelBubble = true)}
                  onDragMove={(e) => dragHandle(i, "out", e)}
                  onDragEnd={(e) => dragHandle(i, "out", e)}
                />
              )}
            </Group>
          );
        })}

      {/* Midpoint add handles */}
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

      {/* Anchor handles */}
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
