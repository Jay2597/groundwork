import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";
import type { Box } from "konva/lib/shapes/Transformer";
import type { SceneNode } from "@/types/document";
import type { Viewport } from "@/types/editor";
import { candidateLines, collectBoxes, SNAP_PX, type Guide, type SnapBox } from "@/lib/snapping";

interface SelectionTransformerProps {
  stage: Konva.Stage | null;
  selectedIds: string[];
  nodes: SceneNode[];
  viewport: Viewport;
  snapping: boolean;
  onGuides: (guides: Guide[]) => void;
}

/** Attaches a Konva Transformer to the selected nodes, with edge snap on resize. */
export function SelectionTransformer({
  stage,
  selectedIds,
  nodes,
  viewport,
  snapping,
  onGuides,
}: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer || !stage) return;
    const targets = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(targets);
    transformer.getLayer()?.batchDraw();
  }, [stage, selectedIds]);

  /** Snap the active resize edges to nearby object edges/centers (single selection). */
  function boundBoxFunc(oldBox: Box, newBox: Box): Box {
    if (newBox.width < 5 || newBox.height < 5) return oldBox;
    if (!snapping || selectedIds.length !== 1 || newBox.rotation) {
      onGuides([]);
      return newBox;
    }
    const anchor = transformerRef.current?.getActiveAnchor() ?? "";
    const { scale, x: vx, y: vy } = viewport;

    const boxes: SnapBox[] = [];
    collectBoxes(nodes, 0, 0, new Set([selectedIds[0]]), boxes);
    const { v, h } = candidateLines(boxes);
    const vScreen = v.map((x) => x * scale + vx);
    const hScreen = h.map((y) => y * scale + vy);

    const guides: Guide[] = [];
    const toDocX = (sx: number) => (sx - vx) / scale;
    const toDocY = (sy: number) => (sy - vy) / scale;

    if (anchor.includes("left")) {
      const s = nearest(newBox.x, vScreen);
      if (s !== null) {
        newBox.width += newBox.x - s;
        newBox.x = s;
        guides.push(vGuide(toDocX(s), newBox, toDocY));
      }
    } else if (anchor.includes("right")) {
      const s = nearest(newBox.x + newBox.width, vScreen);
      if (s !== null) {
        newBox.width = s - newBox.x;
        guides.push(vGuide(toDocX(s), newBox, toDocY));
      }
    }

    if (anchor.includes("top")) {
      const s = nearest(newBox.y, hScreen);
      if (s !== null) {
        newBox.height += newBox.y - s;
        newBox.y = s;
        guides.push(hGuide(toDocY(s), newBox, toDocX));
      }
    } else if (anchor.includes("bottom")) {
      const s = nearest(newBox.y + newBox.height, hScreen);
      if (s !== null) {
        newBox.height = s - newBox.y;
        guides.push(hGuide(toDocY(s), newBox, toDocX));
      }
    }

    onGuides(guides);
    return newBox;
  }

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled
      borderStroke="#f2a33c"
      anchorStroke="#f2a33c"
      anchorFill="#0d0d0f"
      anchorSize={8}
      anchorCornerRadius={2}
      ignoreStroke
      boundBoxFunc={boundBoxFunc}
      onTransformEnd={() => onGuides([])}
    />
  );
}

const SNAP = SNAP_PX;

function nearest(value: number, lines: number[]): number | null {
  let best: number | null = null;
  let bestDist = SNAP;
  for (const line of lines) {
    const d = Math.abs(line - value);
    if (d <= bestDist) {
      bestDist = d;
      best = line;
    }
  }
  return best;
}

function vGuide(posDoc: number, box: Box, toDocY: (sy: number) => number): Guide {
  return { axis: "x", pos: posDoc, start: toDocY(box.y), end: toDocY(box.y + box.height) };
}

function hGuide(posDoc: number, box: Box, toDocX: (sx: number) => number): Guide {
  return { axis: "y", pos: posDoc, start: toDocX(box.x), end: toDocX(box.x + box.width) };
}
