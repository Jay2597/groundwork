import { Ellipse, Group, Image as KonvaImage, Line, Rect, Shape, Text } from "react-konva";
import type Konva from "konva";
import type { Context as KonvaContext } from "konva/lib/Context";
import type { KonvaEventObject } from "konva/lib/Node";
import type { ImageNode, PathNode, RectNode, SceneNode } from "@/types/document";
import { useImage } from "@/hooks/useImage";
import { fillsFor, paintToKonva, strokeToKonva } from "@/lib/paint";
import { catmullRomToBezier, type CubicSegment } from "@/lib/bezier";
import { handleSegments } from "@/lib/bezierPath";
import { dropShadowKonva, blendModeKonva } from "@/lib/effects";
import { cropToPixels } from "@/lib/imageCrop";
import { displayText } from "@/lib/text";
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
      globalCompositeOperation={blendModeKonva(node) as GlobalCompositeOperation | undefined}
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
  return dropShadowKonva(node);
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
      const fillProps = node.closed ? paintToKonva(top, node.width, node.height) : { fill: undefined };
      if (node.handles && node.handles.length >= 8 && node.points.length >= 4) {
        const segs = handleSegments(node.points, node.handles, node.closed);
        return <CubicPath segments={segs} closed={node.closed} fillProps={fillProps} stroke={stroke} shadow={shadow} />;
      }
      if (node.smooth && node.points.length >= 6) {
        return <SmoothPath node={node} fillProps={fillProps} stroke={stroke} shadow={shadow} />;
      }
      return (
        <Line
          points={node.points}
          closed={node.closed}
          {...fillProps}
          {...stroke}
          {...shadow}
        />
      );
    }
    case "text": {
      const top = fillsFor(node)[fillsFor(node).length - 1];
      const autoWidth = node.textResize === "auto-width";
      return (
        <Text
          width={autoWidth ? undefined : node.width}
          text={displayText(node)}
          fontSize={node.fontSize}
          fontFamily={node.fontFamily}
          fontStyle={node.fontStyle}
          textDecoration={node.textDecoration === "none" ? undefined : node.textDecoration}
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

/** A smooth (Catmull-Rom → cubic Bézier) path, drawn via a custom sceneFunc. */
function SmoothPath({
  node,
  fillProps,
  stroke,
  shadow,
}: {
  node: PathNode;
  fillProps: Fx;
  stroke: Fx;
  shadow: Fx;
}) {
  const segs = catmullRomToBezier(node.points, node.closed);
  return <CubicPath segments={segs} closed={node.closed} fillProps={fillProps} stroke={stroke} shadow={shadow} />;
}

/** Render an arbitrary list of cubic Bézier segments. */
function CubicPath({
  segments,
  closed,
  fillProps,
  stroke,
  shadow,
}: {
  segments: CubicSegment[];
  closed: boolean;
  fillProps: Fx;
  stroke: Fx;
  shadow: Fx;
}) {
  const trace = (ctx: KonvaContext) => {
    if (segments.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(segments[0].x0, segments[0].y0);
    for (const s of segments) ctx.bezierCurveTo(s.cx1, s.cy1, s.cx2, s.cy2, s.x1, s.y1);
    if (closed) ctx.closePath();
  };
  return (
    <Shape
      {...fillProps}
      {...stroke}
      {...shadow}
      sceneFunc={(ctx, shape) => {
        trace(ctx);
        ctx.fillStrokeShape(shape);
      }}
      hitFunc={(ctx, shape) => {
        trace(ctx);
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

/** Konva props for an image fill's crop / tile mode. */
function imageFillProps(image: { fit: string; crop?: [number, number, number, number]; scale?: number }, img: HTMLImageElement): Fx {
  if (image.fit === "tile") {
    const scale = image.scale ?? 1;
    return {
      fillPatternImage: img,
      fillPatternRepeat: "repeat",
      fillPatternScaleX: scale,
      fillPatternScaleY: scale,
    };
  }
  if (image.crop) {
    return { crop: cropToPixels(image.crop, img.naturalWidth || img.width, img.naturalHeight || img.height) };
  }
  return {};
}

function ImageShape({ node, fx }: { node: ImageNode; fx: Fx }) {
  const img = useImage(node.image.src);
  if (!img) return <Rect width={node.width} height={node.height} fill="#e7e7ea" {...fx} />;
  if (node.image.fit === "tile") {
    return <Rect width={node.width} height={node.height} {...imageFillProps(node.image, img)} {...fx} />;
  }
  return <KonvaImage image={img} width={node.width} height={node.height} {...imageFillProps(node.image, img)} {...fx} />;
}

function ImageFillRect({ node, fx }: { node: RectNode; fx: Fx }) {
  const img = useImage(node.image?.src);
  const cr = radiusValue(node);
  if (!img || !node.image) return <Rect width={node.width} height={node.height} fill="#e7e7ea" cornerRadius={cr} {...fx} />;
  if (node.image.fit === "tile") {
    return <Rect width={node.width} height={node.height} cornerRadius={cr} {...imageFillProps(node.image, img)} {...fx} />;
  }
  return <KonvaImage image={img} width={node.width} height={node.height} cornerRadius={cr} {...imageFillProps(node.image, img)} {...fx} />;
}
