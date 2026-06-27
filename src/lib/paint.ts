import type { Paint, SceneNode, Stroke } from "@/types/document";

// Helpers to translate the fill/stroke model into Konva props and CSS, shared by
// the canvas renderer and the code/SVG exporters.

/** The visible fills for a node, falling back to its solid `fill`. */
export function fillsFor(node: SceneNode): Paint[] {
  if (node.fills && node.fills.length) return node.fills.filter((f) => f.visible);
  return [{ type: "solid", color: node.fill, opacity: 1, visible: true }];
}

/** Konva fill props for one paint over a w×h box. `centered` for shapes whose
 *  local origin is their center (ellipse). */
export function paintToKonva(
  paint: Paint,
  w: number,
  h: number,
  centered = false,
): Record<string, unknown> {
  const ox = centered ? -w / 2 : 0;
  const oy = centered ? -h / 2 : 0;
  if (paint.type === "solid") {
    return { fill: paint.color, opacity: paint.opacity };
  }
  if (paint.type === "linear") {
    const rad = (paint.angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const cx = ox + w / 2;
    const cy = oy + h / 2;
    return {
      fillLinearGradientStartPoint: { x: cx - dx * half, y: cy - dy * half },
      fillLinearGradientEndPoint: { x: cx + dx * half, y: cy + dy * half },
      fillLinearGradientColorStops: stopsToArray(paint.stops),
      opacity: paint.opacity,
    };
  }
  // radial
  const cx = ox + w / 2;
  const cy = oy + h / 2;
  return {
    fillRadialGradientStartPoint: { x: cx, y: cy },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndPoint: { x: cx, y: cy },
    fillRadialGradientEndRadius: Math.max(w, h) / 2,
    fillRadialGradientColorStops: stopsToArray(paint.stops),
    opacity: paint.opacity,
  };
}

function stopsToArray(stops: { position: number; color: string }[]): (number | string)[] {
  return [...stops]
    .sort((a, b) => a.position - b.position)
    .flatMap((s) => [s.position, s.color]);
}

/** Konva stroke props (dash/cap/join). */
export function strokeToKonva(stroke: Stroke | undefined): Record<string, unknown> {
  if (!stroke) return { strokeEnabled: false };
  const dash =
    stroke.style === "dashed"
      ? [stroke.width * 3, stroke.width * 2]
      : stroke.style === "dotted"
        ? [0.1, stroke.width * 2]
        : undefined;
  return {
    stroke: stroke.color,
    strokeWidth: stroke.width,
    strokeEnabled: true,
    dash,
    lineCap: stroke.cap ?? (stroke.style === "dotted" ? "round" : "butt"),
    lineJoin: stroke.join ?? "miter",
  };
}

/** A single CSS background value for one paint. */
export function paintToCss(paint: Paint): string {
  if (paint.type === "solid") return paint.color;
  const stops = [...paint.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${Math.round(s.position * 100)}%`)
    .join(", ");
  if (paint.type === "linear") return `linear-gradient(${paint.angle + 90}deg, ${stops})`;
  return `radial-gradient(circle, ${stops})`;
}

/** Combined CSS `background` for stacked fills (top paint first). */
export function fillsToCss(node: SceneNode): string {
  const fills = fillsFor(node);
  // CSS paints top → bottom, so reverse the bottom→top model order.
  return [...fills].reverse().map(paintToCss).join(", ");
}

/** An SVG paint reference, emitting <defs> as needed via the collector. */
export function paintToSvg(
  paint: Paint,
  id: string,
  defs: string[],
): string {
  if (paint.type === "solid") return paint.color;
  const stops = [...paint.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `<stop offset="${Math.round(s.position * 100)}%" stop-color="${s.color}" />`)
    .join("");
  if (paint.type === "linear") {
    const rad = (paint.angle * Math.PI) / 180;
    const x1 = 0.5 - Math.cos(rad) / 2;
    const y1 = 0.5 - Math.sin(rad) / 2;
    const x2 = 0.5 + Math.cos(rad) / 2;
    const y2 = 0.5 + Math.sin(rad) / 2;
    defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`,
    );
  } else {
    defs.push(`<radialGradient id="${id}">${stops}</radialGradient>`);
  }
  return `url(#${id})`;
}
