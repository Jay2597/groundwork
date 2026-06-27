import { Ellipse, Group, Image as KonvaImage, Line, Rect, Shape, Text } from "react-konva";
import type Konva from "konva";
import type { Context as KonvaContext } from "konva/lib/Context";
import type { KonvaEventObject } from "konva/lib/Node";
import type { ImageNode, PathNode, RectNode, SceneNode } from "@/types/document";
import { useImage } from "@/hooks/useImage";
import { fillsFor, paintToKonva, strokeToKonva } from "@/lib/paint";
import { useUiStore } from "@/store/uiStore";

interface ShapeNodeProps {
  node: SceneNode;
  draggable: boolean;
  onSelect: (e: KonvaEventObject<MouseEvent>) => void;
  onChange: (patch: Partial<SceneNode>) => void;
}

/**
 * Every node renders inside a Group positioned at (x, y). Children draw from
 * local origin, so a single transform model (drag + scale-bake) works for all
 * node types uniformly.
 */
export function ShapeNode({ node, draggable, onSelect, onChange }: ShapeNodeProps) {
  if (!node.visible) return null;

  function handleDragEnd(e: KonvaEventObject<DragEvent>) {
    onChange({ x: e.target.x(), y: e.target.y() });
  }

  function handleTransformEnd(e: KonvaEventObject<Event>) {
    const group = e.target as Konva.Group;
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();
    group.scaleX(1);
    group.scaleY(1);
    onChange({
      x: group.x(),
      y: group.y(),
      width: Math.max(1, node.width * scaleX),
      height: Math.max(1, node.height * scaleY),
      rotation: group.rotation(),
    });
  }

  return (
    <Group
      id={node.id}
      name="scene-node"
      x={node.x}
      y={node.y}
      rotation={node.rotation}
      opacity={node.opacity}
      draggable={draggable && !node.locked}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <Child node={node} />
    </Group>
  );
}

function shadowProps(node: SceneNode) {
  return {
    shadowColor: node.shadow?.color,
    shadowBlur: node.shadow?.blur,
    shadowOffsetX: node.shadow?.offsetX,
    shadowOffsetY: node.shadow?.offsetY,
    shadowEnabled: Boolean(node.shadow),
  };
}

/** Konva cornerRadius: a 4-tuple when per-corner, else the uniform number. */
function radiusValue(node: RectNode): number | number[] {
  return node.cornerRadii ?? node.cornerRadius;
}

function Child({ node }: { node: SceneNode }) {
  const editingTextId = useUiStore((s) => s.editingTextId);
  const stroke = strokeToKonva(node.stroke);
  const shadow = shadowProps(node);

  // Hide the Konva text while it's being edited inline (the textarea covers it).
  if (node.type === "text" && editingTextId === node.id) return null;

  switch (node.type) {
    case "rect": {
      if (node.image) return <ImageFillRect node={node} fx={{ ...stroke, ...shadow }} />;
      const fills = fillsFor(node);
      const cr = radiusValue(node);
      return (
        <>
          {fills.map((p, i) => (
            <Rect
              key={i}
              width={node.width}
              height={node.height}
              cornerRadius={cr}
              {...paintToKonva(p, node.width, node.height)}
              {...(i === fills.length - 1 ? { ...stroke, ...shadow } : {})}
            />
          ))}
        </>
      );
    }
    case "ellipse": {
      const fills = fillsFor(node);
      return (
        <>
          {fills.map((p, i) => (
            <Ellipse
              key={i}
              x={node.width / 2}
              y={node.height / 2}
              radiusX={node.width / 2}
              radiusY={node.height / 2}
              {...paintToKonva(p, node.width, node.height, true)}
              {...(i === fills.length - 1 ? { ...stroke, ...shadow } : {})}
            />
          ))}
        </>
      );
    }
    case "image":
      return <ImageShape node={node} fx={{ ...stroke, ...shadow }} />;
    case "path": {
      if (node.subpaths && node.subpaths.length > 1) {
        return <CompoundPath node={node} stroke={stroke} shadow={shadow} />;
      }
      const top = fillsFor(node)[fillsFor(node).length - 1];
      return (
        <Line
          points={node.points}
          closed={node.closed}
          {...(node.closed ? paintToKonva(top, node.width, node.height) : { fill: undefined })}
          {...stroke}
          {...shadow}
        />
      );
    }
    case "text": {
      const top = fillsFor(node)[fillsFor(node).length - 1];
      return (
        <Text
          width={node.width}
          text={node.text}
          fontSize={node.fontSize}
          fontFamily={node.fontFamily}
          fontStyle={node.fontStyle}
          align={node.align}
          lineHeight={node.lineHeight}
          letterSpacing={node.letterSpacing}
          {...paintToKonva(top, node.width, node.height)}
          {...stroke}
          {...shadow}
        />
      );
    }
    default:
      return null;
  }
}

type Fx = Record<string, unknown>;

/** Compound path rendered with the even-odd fill rule (holes work). */
function CompoundPath({ node, stroke, shadow }: { node: PathNode; stroke: Fx; shadow: Fx }) {
  const subs = node.subpaths ?? [];
  const trace = (ctx: KonvaContext) => {
    ctx.beginPath();
    for (const sp of subs) {
      const p = sp.points;
      if (p.length < 2) continue;
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      if (sp.closed) ctx.closePath();
    }
  };
  return (
    <Shape
      {...stroke}
      {...shadow}
      fill={node.fill}
      sceneFunc={(ctx, shape) => {
        trace(ctx);
        const raw = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
        raw.fillStyle = node.fill;
        raw.fill("evenodd");
        ctx.strokeShape(shape);
      }}
      hitFunc={(ctx, shape) => {
        trace(ctx);
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

function ImageShape({ node, fx }: { node: ImageNode; fx: Fx }) {
  const img = useImage(node.image.src);
  if (!img) return <Rect width={node.width} height={node.height} fill="#e7e7ea" {...fx} />;
  return <KonvaImage image={img} width={node.width} height={node.height} {...fx} />;
}

function ImageFillRect({ node, fx }: { node: RectNode; fx: Fx }) {
  const img = useImage(node.image?.src);
  const cr = radiusValue(node);
  if (!img) return <Rect width={node.width} height={node.height} fill="#e7e7ea" cornerRadius={cr} {...fx} />;
  return <KonvaImage image={img} width={node.width} height={node.height} cornerRadius={cr} {...fx} />;
}
