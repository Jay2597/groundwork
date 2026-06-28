import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditorStore } from "@/store/editorStore";
import { registerStage } from "@/lib/stageRegistry";
import { createEllipse, createFrame, createPath, createRect, createText } from "@/lib/nodeFactory";
import { countNodes, findNode, findSiblings, frameAtPoint } from "@/lib/tree";
import {
  collectBoxes,
  computeSnap,
  computeSpacing,
  SNAP_PX,
  type Guide,
  type SnapBox,
  type SpacingMarker,
} from "@/lib/snapping";
import { activePage, isContainer, isFrame, isGroup } from "@/types/document";
import { fileToPlacedImage } from "@/lib/image";
import { placeImageAt } from "@/lib/placeImage";
import { applyVariables } from "@/lib/variables";
import { applyInstanceProps } from "@/lib/componentProps";
import { parseSvg, groupImported } from "@/lib/import/importSvg";
import { useUiStore } from "@/store/uiStore";
import { usePrefsStore } from "@/store/prefsStore";
import { CommentsLayer } from "@/components/comments/CommentsLayer";
import { Rulers } from "./Rulers";
import { CornerRadiusHandles } from "./CornerRadiusHandles";
import { TextEditor } from "./TextEditor";
import type { DraftShape } from "@/types/editor";
import { ShapeNode } from "./ShapeNode";
import { FrameView } from "./FrameView";
import { GroupView } from "./GroupView";
import { BooleanView } from "./BooleanView";
import { SelectionTransformer } from "./SelectionTransformer";
import { useStageSize } from "./useStageSize";

const MIN_SCALE = 0.05;
const MAX_SCALE = 16;
const ZOOM_STEP = 1.04;
const DEFAULT_SIZE = 120;
const FRAME_DEFAULT = { width: 400, height: 300 };
const PEN_CLOSE_PX = 10;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const { width, height } = useStageSize(containerRef);
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[] | null>(null);
  const [penCursor, setPenCursor] = useState<{ x: number; y: number } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [spacing, setSpacing] = useState<SpacingMarker[]>([]);
  const multiDragRef = useRef<{ others: string[]; lastX: number; lastY: number } | null>(null);

  const document = useEditorStore((s) => s.document);
  const nodes = activePage(document).nodes;
  const renderNodes = applyInstanceProps(applyVariables(nodes, document.variables));
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const tool = useEditorStore((s) => s.tool);
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const addNode = useEditorStore((s) => s.addNode);
  const updateNode = useEditorStore((s) => s.updateNode);
  const updateNodesPositions = useEditorStore((s) => s.updateNodesPositions);
  const reparentNode = useEditorStore((s) => s.reparentNode);
  const setTool = useEditorStore((s) => s.setTool);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const commentMode = useUiStore((s) => s.commentMode);
  const setEditingTextId = useUiStore((s) => s.setEditingTextId);
  const addComment = useEditorStore((s) => s.addComment);
  const addSlice = useEditorStore((s) => s.addSlice);
  const snapping = usePrefsStore((s) => s.snapping);
  const showGrid = usePrefsStore((s) => s.showGrid);
  const gridSize = usePrefsStore((s) => s.gridSize);

  const isDrawTool = tool === "rect" || tool === "ellipse" || tool === "frame" || tool === "slice";
  const slices = activePage(document).slices ?? [];

  useEffect(() => {
    registerStage(stageRef.current);
    return () => registerStage(null);
  }, []);

  // Finish (Enter) or cancel (Escape) an in-progress pen path.
  useEffect(() => {
    if (!penPoints) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitPath(penPoints ?? [], false);
      } else if (e.key === "Escape") {
        setPenPoints(null);
        setPenCursor(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penPoints]);

  function pointerInCanvas(): { x: number; y: number } | null {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return null;
    return stage.getAbsoluteTransform().copy().invert().point(pointer);
  }

  function handleWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    const oldScale = viewport.scale;
    const direction = e.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    const newScale = clamp(oldScale * direction, MIN_SCALE, MAX_SCALE);
    const mousePoint = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };
    setViewport({
      scale: newScale,
      x: pointer.x - mousePoint.x * newScale,
      y: pointer.y - mousePoint.y * newScale,
    });
  }

  function handlePenClick(pos: { x: number; y: number }) {
    if (!penPoints) {
      setPenPoints([pos]);
      return;
    }
    const first = penPoints[0];
    const near = Math.hypot(pos.x - first.x, pos.y - first.y) < PEN_CLOSE_PX / viewport.scale;
    if (near && penPoints.length >= 3) {
      commitPath(penPoints, true);
      return;
    }
    setPenPoints([...penPoints, pos]);
  }

  function commitPath(points: { x: number; y: number }[], closed: boolean) {
    if (points.length >= 2) {
      const node = createPath(points, closed, countNodes(nodes) + 1);
      addNode(node);
      select([node.id]);
    }
    setPenPoints(null);
    setPenCursor(null);
    setTool("select");
  }

  function handleStageMouseDown(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 2) return; // right-click is for the context menu only
    if (tool === "pen") {
      const pos = pointerInCanvas();
      if (pos) handlePenClick(pos);
      return;
    }
    if (commentMode) {
      const pos = pointerInCanvas();
      if (pos) addComment(pos.x, pos.y);
      return;
    }
    if (e.target !== e.target.getStage()) return; // only empty-canvas clicks

    if (tool === "text") {
      const pos = pointerInCanvas();
      if (!pos) return;
      placeText(pos.x, pos.y);
      return;
    }
    if (isDrawTool) {
      const pos = pointerInCanvas();
      if (!pos) return;
      setDraft({ type: tool as DraftShape["type"], x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }
    if (tool === "select") {
      const pos = pointerInCanvas();
      if (!pos) return;
      setMarquee({ x: pos.x, y: pos.y, width: 0, height: 0 });
    }
  }

  function handleStageMouseMove() {
    const pos = pointerInCanvas();
    if (!pos) return;
    if (tool === "pen" && penPoints) {
      setPenCursor(pos);
      return;
    }
    if (marquee) {
      setMarquee({ ...marquee, width: pos.x - marquee.x, height: pos.y - marquee.y });
      return;
    }
    if (draft) setDraft({ ...draft, width: pos.x - draft.x, height: pos.y - draft.y });
  }

  function handleStageMouseUp() {
    if (marquee) {
      const box = normalize(marquee);
      if (box.width < 4 && box.height < 4) clearSelection();
      else select(nodes.filter((n) => n.visible && !n.locked && intersects(box, n)).map((n) => n.id));
      setMarquee(null);
      return;
    }
    if (!draft) return;
    const tiny = Math.abs(draft.width) < 4 && Math.abs(draft.height) < 4;
    const box = normalize(
      tiny
        ? {
            x: draft.x,
            y: draft.y,
            width: draft.type === "frame" ? FRAME_DEFAULT.width : DEFAULT_SIZE,
            height: draft.type === "frame" ? FRAME_DEFAULT.height : DEFAULT_SIZE,
          }
        : draft,
    );
    commitDraft(draft.type, box);
    setDraft(null);
    setTool("select");
  }

  function commitDraft(type: DraftShape["type"], box: Box) {
    const count = countNodes(nodes) + 1;
    if (type === "slice") {
      addSlice(box);
      return;
    }
    if (type === "frame") {
      const frame = createFrame(box, count);
      addNode(frame);
      select([frame.id]);
      return;
    }
    // Shapes started inside a frame become that frame's children (relative coords).
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const frame = frameAtPoint(nodes, center.x, center.y);
    const local = frame ? { ...box, x: box.x - frame.x, y: box.y - frame.y } : box;
    const node = type === "rect" ? createRect(local, count) : createEllipse(local, count);
    addNode(node, frame?.id);
    select([node.id]);
  }

  function placeText(x: number, y: number) {
    const count = countNodes(nodes) + 1;
    const frame = frameAtPoint(nodes, x, y);
    const node = frame
      ? createText(x - frame.x, y - frame.y, count)
      : createText(x, y, count);
    addNode(node, frame?.id);
    select([node.id]);
    setTool("select");
    setEditingTextId(node.id);
  }

  function handleStageDragEnd(e: KonvaEventObject<DragEvent>) {
    if (tool !== "hand") return;
    setViewport({ ...viewport, x: e.target.x(), y: e.target.y() });
  }

  async function handleDrop(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".svg"),
    );
    if (!file) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const docX = (e.clientX - rect.left - viewport.x) / viewport.scale;
    const docY = (e.clientY - rect.top - viewport.y) / viewport.scale;

    // Prefer importing SVG as editable vectors; fall back to placing it as image.
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (isSvg) {
      const parsed = parseSvg(await file.text());
      if (parsed.length) {
        const group = groupImported(parsed, docX, docY, countNodes(nodes) + 1);
        addNode(group);
        select([group.id]);
        return;
      }
    }
    const placed = await fileToPlacedImage(file);
    if (placed) placeImageAt(placed, docX, docY);
  }

  function handleSelectNode(id: string, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    const model = findNode(nodes, id);
    if (model?.locked) return; // locked layers aren't selectable on the canvas
    // Right-click must not collapse a multi-selection (the context menu needs it).
    if (e.evt.button === 2) {
      if (!selectedIds.includes(id)) select([id]);
      return;
    }
    if (e.evt.shiftKey) toggleSelect(id);
    else select([id]);
  }

  function handleDragStart(e: KonvaEventObject<DragEvent>) {
    const target = e.target;
    if (target.name() !== "scene-node") return;
    const id = target.id();
    multiDragRef.current =
      selectedIds.length > 1 && selectedIds.includes(id)
        ? { others: selectedIds.filter((sid) => sid !== id), lastX: target.x(), lastY: target.y() }
        : null;
  }

  // Live alignment snapping + group drag-move.
  function handleDragMove(e: KonvaEventObject<DragEvent>) {
    const target = e.target;
    if (target.name() !== "scene-node") return;
    const id = target.id();
    const model = findNode(nodes, id);
    if (!model) return;

    const md = multiDragRef.current;
    const exclude = new Set(md ? selectedIds : [id]);

    if (!model.rotation && snapping) {
      const loc = findSiblings(nodes, id);
      const ox = loc?.parent ? loc.parent.x : 0;
      const oy = loc?.parent ? loc.parent.y : 0;
      const box: SnapBox = { x: ox + target.x(), y: oy + target.y(), w: model.width, h: model.height };
      const candidates: SnapBox[] = [];
      collectBoxes(nodes, 0, 0, exclude, candidates);
      const threshold = SNAP_PX / viewport.scale;

      const snap = computeSnap(box, candidates, threshold);
      let dx = snap.dx;
      let dy = snap.dy;

      // Equal-spacing only when edge-alignment didn't already snap.
      let marks: SpacingMarker[] = [];
      if (dx === 0 && dy === 0) {
        const sp = computeSpacing(box, candidates, threshold);
        dx = sp.dx;
        dy = sp.dy;
        marks = sp.markers;
      }
      if (dx) target.x(target.x() + dx);
      if (dy) target.y(target.y() + dy);
      setGuides(snap.guides);
      setSpacing(marks);
    }

    // Move the rest of the selection by the same delta as the dragged node.
    if (md && stageRef.current) {
      const ddx = target.x() - md.lastX;
      const ddy = target.y() - md.lastY;
      if (ddx || ddy) {
        for (const oid of md.others) {
          const node = stageRef.current.findOne(`#${oid}`);
          if (node) {
            node.x(node.x() + ddx);
            node.y(node.y() + ddy);
          }
        }
        md.lastX = target.x();
        md.lastY = target.y();
      }
    }
  }

  function handleDragEnd(e: KonvaEventObject<DragEvent>) {
    if (guides.length) setGuides([]);
    if (spacing.length) setSpacing([]);

    const md = multiDragRef.current;
    const stage = stageRef.current;
    if (md && stage) {
      const updates = md.others
        .map((id) => {
          const node = stage.findOne(`#${id}`);
          return node ? { id, x: node.x(), y: node.y() } : null;
        })
        .filter((u): u is { id: string; x: number; y: number } => u !== null);
      if (updates.length) updateNodesPositions(updates);
      multiDragRef.current = null;
      return; // no reparenting during a group move
    }

    // Reparent a single leaf into / out of a frame based on where it was dropped.
    const target = e.target;
    if (target.name() !== "scene-node") return;
    const id = target.id();
    const model = findNode(nodes, id);
    if (!model || isContainer(model)) return;

    const loc = findSiblings(nodes, id);
    const parent = loc?.parent && loc.parent.type === "frame" ? loc.parent : null;
    const docX = (parent ? parent.x : 0) + target.x();
    const docY = (parent ? parent.y : 0) + target.y();
    const dropFrame = frameAtPoint(nodes, docX + model.width / 2, docY + model.height / 2);

    const newParentId = dropFrame ? dropFrame.id : null;
    const currentParentId = parent ? parent.id : null;
    if (newParentId !== currentParentId) {
      const relX = dropFrame ? docX - dropFrame.x : docX;
      const relY = dropFrame ? docY - dropFrame.y : docY;
      reparentNode(id, newParentId, relX, relY);
    }
  }

  function handleContextMenu(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const stage = stageRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!stage || !rect) {
      openContextMenu(e.clientX, e.clientY, "canvas");
      return;
    }
    const shape = stage.getIntersection({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const sceneNode = shape?.findAncestor(".scene-node", true);
    if (sceneNode) {
      const id = sceneNode.id();
      if (!selectedIds.includes(id)) select([id]);
      openContextMenu(e.clientX, e.clientY, "node");
    } else {
      openContextMenu(e.clientX, e.clientY, "canvas");
    }
  }

  const selectDraggable = tool === "select";

  // Single top-level rect/frame (unrotated) gets on-canvas corner-radius handles.
  const radiusTarget =
    tool === "select" && selectedIds.length === 1
      ? nodes.find((n) => n.id === selectedIds[0])
      : undefined;
  const showRadiusHandles =
    radiusTarget &&
    (radiusTarget.type === "rect" || radiusTarget.type === "frame") &&
    !radiusTarget.rotation;

  return (
    <div
      ref={containerRef}
      className="canvas-host"
      data-tool={tool}
      style={{
        background: showGrid
          ? `radial-gradient(circle at 1px 1px, var(--canvas-dot) 1px, transparent 0) 0 0 / ${gridSize}px ${gridSize}px, var(--canvas-bg)`
          : "var(--canvas-bg)",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={tool === "hand"}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={() => {
          if (tool === "pen" && penPoints) {
            commitPath(penPoints, false);
            return;
          }
          const stage = stageRef.current;
          const pointer = stage?.getPointerPosition();
          if (!stage || !pointer) return;
          const hit = stage.getIntersection(pointer)?.findAncestor(".scene-node", true);
          if (hit) {
            const model = findNode(nodes, hit.id());
            if (model?.type === "text" && !model.locked) {
              select([model.id]);
              setEditingTextId(model.id);
            }
          }
        }}
        onDragEnd={handleStageDragEnd}
      >
        <Layer onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
          {renderNodes.map((node) =>
            isFrame(node) ? (
              <FrameView
                key={node.id}
                frame={node}
                frameDraggable={selectDraggable}
                childDraggable={selectDraggable}
                onSelect={handleSelectNode}
                onChange={updateNode}
              />
            ) : isGroup(node) ? (
              <GroupView
                key={node.id}
                group={node}
                draggable={selectDraggable}
                onSelect={handleSelectNode}
                onChange={updateNode}
              />
            ) : node.type === "boolean" ? (
              <BooleanView
                key={node.id}
                node={node}
                draggable={selectDraggable}
                onSelect={handleSelectNode}
                onChange={updateNode}
              />
            ) : (
              <ShapeNode
                key={node.id}
                node={node}
                draggable={selectDraggable}
                onSelect={(e) => handleSelectNode(node.id, e)}
                onChange={(patch) => updateNode(node.id, patch)}
              />
            ),
          )}

          {/* Frame name labels above each artboard */}
          {nodes.filter(isFrame).map((frame) => (
            <Text
              key={`label-${frame.id}`}
              x={frame.x}
              y={frame.y - 18}
              text={frame.name}
              fontSize={12}
              fontFamily="IBM Plex Mono, monospace"
              fill={selectedIds.includes(frame.id) ? "#f2a33c" : "#9a9aa2"}
              onMouseDown={(e) => handleSelectNode(frame.id, e)}
            />
          ))}

          <SelectionTransformer
            stage={stageRef.current}
            selectedIds={selectedIds}
            nodes={nodes}
            viewport={viewport}
            snapping={snapping}
            onGuides={setGuides}
          />
          {showRadiusHandles && radiusTarget && (
            <CornerRadiusHandles
              node={radiusTarget as Extract<typeof radiusTarget, { type: "rect" | "frame" }>}
              scale={viewport.scale}
              onChange={(patch) => updateNode(radiusTarget.id, patch)}
            />
          )}
          {slices.map((s) => (
            <Group key={s.id} listening={false}>
              <Rect
                x={s.x}
                y={s.y}
                width={s.width}
                height={s.height}
                stroke="#ff5da2"
                strokeWidth={1 / viewport.scale}
                dash={[6 / viewport.scale, 4 / viewport.scale]}
              />
              <Text
                x={s.x}
                y={s.y - 16 / viewport.scale}
                text={s.name}
                fontSize={11 / viewport.scale}
                fontFamily="IBM Plex Mono, monospace"
                fill="#ff5da2"
              />
            </Group>
          ))}
          {draft && <DraftPreview draft={draft} />}
          {penPoints && <PenPreview points={penPoints} cursor={penCursor} scale={viewport.scale} />}
          {marquee && <MarqueeBox box={marquee} scale={viewport.scale} />}
          <SpacingGuides markers={spacing} scale={viewport.scale} />

          {guides.map((g, i) => (
            <Line
              key={i}
              points={
                g.axis === "x"
                  ? [g.pos, g.start, g.pos, g.end]
                  : [g.start, g.pos, g.end, g.pos]
              }
              stroke="#f2a33c"
              strokeWidth={1 / viewport.scale}
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
      <CommentsLayer />
      <Rulers />
      <TextEditor />
    </div>
  );
}

function DraftPreview({ draft }: { draft: DraftShape }) {
  const box = normalize(draft);
  return (
    <Rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      stroke="#f2a33c"
      dash={[4, 4]}
      listening={false}
    />
  );
}

function PenPreview({
  points,
  cursor,
  scale,
}: {
  points: { x: number; y: number }[];
  cursor: { x: number; y: number } | null;
  scale: number;
}) {
  const flat: number[] = [];
  for (const p of points) flat.push(p.x, p.y);
  if (cursor) flat.push(cursor.x, cursor.y);
  const r = 3 / scale;
  return (
    <Group listening={false}>
      <Line points={flat} stroke="#f2a33c" strokeWidth={1.5 / scale} />
      {points.map((p, i) => (
        <Rect
          key={i}
          x={p.x - r}
          y={p.y - r}
          width={r * 2}
          height={r * 2}
          fill={i === 0 ? "#f2a33c" : "#0d0d0f"}
          stroke="#f2a33c"
          strokeWidth={1 / scale}
        />
      ))}
    </Group>
  );
}

function MarqueeBox({ box, scale }: { box: Box; scale: number }) {
  const b = normalize(box);
  return (
    <Rect
      x={b.x}
      y={b.y}
      width={b.width}
      height={b.height}
      fill="#f2a33c"
      opacity={0.08}
      stroke="#f2a33c"
      strokeWidth={1 / scale}
      listening={false}
    />
  );
}

function SpacingGuides({ markers, scale }: { markers: SpacingMarker[]; scale: number }) {
  if (markers.length === 0) return null;
  const sw = 1 / scale;
  const tick = 4 / scale;
  return (
    <>
      {markers.map((m, i) => {
        const horizontal = m.y1 === m.y2;
        return (
          <Group key={i} listening={false}>
            <Line points={[m.x1, m.y1, m.x2, m.y2]} stroke="#ff5da2" strokeWidth={sw} />
            {horizontal ? (
              <>
                <Line points={[m.x1, m.y1 - tick, m.x1, m.y1 + tick]} stroke="#ff5da2" strokeWidth={sw} />
                <Line points={[m.x2, m.y2 - tick, m.x2, m.y2 + tick]} stroke="#ff5da2" strokeWidth={sw} />
              </>
            ) : (
              <>
                <Line points={[m.x1 - tick, m.y1, m.x1 + tick, m.y1]} stroke="#ff5da2" strokeWidth={sw} />
                <Line points={[m.x2 - tick, m.y2, m.x2 + tick, m.y2]} stroke="#ff5da2" strokeWidth={sw} />
              </>
            )}
            <Text
              x={m.lx}
              y={m.ly - (horizontal ? 14 / scale : 0)}
              text={m.label}
              fontSize={11 / scale}
              fontFamily="IBM Plex Mono, monospace"
              fill="#ff5da2"
            />
          </Group>
        );
      })}
    </>
  );
}

function normalize(box: Box): Box {
  return {
    x: box.width < 0 ? box.x + box.width : box.x,
    y: box.height < 0 ? box.y + box.height : box.y,
    width: Math.max(1, Math.abs(box.width)),
    height: Math.max(1, Math.abs(box.height)),
  };
}

/** Axis-aligned overlap test between a marquee box and a top-level node. */
function intersects(box: Box, node: { x: number; y: number; width: number; height: number }): boolean {
  return !(
    box.x + box.width < node.x ||
    node.x + node.width < box.x ||
    box.y + box.height < node.y ||
    node.y + node.height < box.y
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
