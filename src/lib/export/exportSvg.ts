import {
  activePage,
  type FrameNode,
  type GroundworkDocument,
  type GroupNode,
  type Page,
  type SceneNode,
  type TextNode,
} from "@/types/document";
import { fillsFor, paintToSvg } from "@/lib/paint";

// Serialize the document to clean, standards-based SVG — an open, portable
// format generated 100% client-side. Gradients are emitted
// into a shared <defs>; strokes carry dash/cap/join; rects support per-corner radii.

export function documentToSvg(doc: GroundworkDocument): string {
  return pageToSvg(activePage(doc));
}

export function pageToSvg(page: Page): string {
  const { width, height, background } = page.canvas;
  const defs: string[] = [];
  const body = page.nodes
    .filter((node) => node.visible)
    .map((n) => nodeToSvg(n, defs))
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs.length ? `<defs>${defs.join("")}</defs>\n  ` : ""}<rect width="${width}" height="${height}" fill="${background}" />
  ${body}
</svg>`;
}

/** Top visible fill as an SVG paint reference (solid color or url(#grad)). */
function fillRef(node: SceneNode, defs: string[]): string {
  const fills = fillsFor(node);
  const top = fills[fills.length - 1];
  return paintToSvg(top, `grad-${node.id}`, defs);
}

function strokeAttr(node: SceneNode): string {
  const s = node.stroke;
  if (!s) return "";
  let out = ` stroke="${s.color}" stroke-width="${s.width}"`;
  if (s.style === "dashed") out += ` stroke-dasharray="${s.width * 3} ${s.width * 2}"`;
  else if (s.style === "dotted") out += ` stroke-dasharray="0.1 ${s.width * 2}" stroke-linecap="round"`;
  if (s.cap && s.style !== "dotted") out += ` stroke-linecap="${s.cap}"`;
  if (s.join) out += ` stroke-linejoin="${s.join}"`;
  return out;
}

/** Path data for a rectangle with independent corner radii. */
function roundedRectPath(w: number, h: number, [tl, tr, br, bl]: [number, number, number, number]): string {
  return [
    `M${tl},0`,
    `H${w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${w},${tr}` : `L${w},0`,
    `V${h - br}`,
    br ? `A${br},${br} 0 0 1 ${w - br},${h}` : `L${w},${h}`,
    `H${bl}`,
    bl ? `A${bl},${bl} 0 0 1 0,${h - bl}` : `L0,${h}`,
    `V${tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${tl},0` : `L0,0`,
    "Z",
  ].join(" ");
}

function nodeToSvg(node: SceneNode, defs: string[]): string {
  if (node.type === "frame") return frameToSvg(node, defs);
  if (node.type === "group" || node.type === "boolean") return groupToSvg(node, defs);

  const transform = node.rotation
    ? ` transform="rotate(${node.rotation} ${node.x + node.width / 2} ${node.y + node.height / 2})"`
    : "";
  const opacity = node.opacity !== 1 ? ` opacity="${node.opacity}"` : "";
  const stroke = strokeAttr(node);
  const fill = fillRef(node, defs);

  switch (node.type) {
    case "rect":
      if (node.cornerRadii) {
        const d = roundedRectPath(node.width, node.height, node.cornerRadii);
        const tf = ` transform="translate(${node.x} ${node.y})${node.rotation ? ` rotate(${node.rotation} ${node.width / 2} ${node.height / 2})` : ""}"`;
        return `<path d="${d}" fill="${fill}"${stroke}${opacity}${tf} />`;
      }
      return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.cornerRadius}" fill="${fill}"${stroke}${opacity}${transform} />`;
    case "ellipse":
      return `<ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${fill}"${stroke}${opacity}${transform} />`;
    case "image":
      return `<image x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" href="${escapeXml(node.image.src)}" preserveAspectRatio="${node.image.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}"${opacity}${transform} />`;
    case "path":
      return pathToSvg(node, stroke, opacity, transform, defs);
    case "text":
      return textToSvg(node, opacity, transform, defs);
  }
}

function pathToSvg(
  node: Extract<SceneNode, { type: "path" }>,
  stroke: string,
  opacity: string,
  transform: string,
  defs: string[],
): string {
  const fill = node.closed ? fillRef(node, defs) : "none";
  if (node.subpaths && node.subpaths.length > 1) {
    const d = node.subpaths
      .map((sp) => subpathToD(node.x, node.y, sp.points, sp.closed))
      .join(" ");
    return `<path d="${d}" fill="${fill}" fill-rule="evenodd"${stroke}${opacity}${transform} />`;
  }
  const pts: string[] = [];
  for (let i = 0; i < node.points.length; i += 2) {
    pts.push(`${node.x + node.points[i]},${node.y + node.points[i + 1]}`);
  }
  const tag = node.closed ? "polygon" : "polyline";
  return `<${tag} points="${pts.join(" ")}" fill="${fill}"${stroke}${opacity}${transform} />`;
}

/** SVG path "d" for one contour, offset to (ox, oy). */
function subpathToD(ox: number, oy: number, points: number[], closed: boolean): string {
  if (points.length < 2) return "";
  let d = `M${ox + points[0]},${oy + points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L${ox + points[i]},${oy + points[i + 1]}`;
  return closed ? `${d} Z` : d;
}

function frameToSvg(frame: FrameNode, defs: string[]): string {
  const rot = frame.rotation ? ` rotate(${frame.rotation} ${frame.width / 2} ${frame.height / 2})` : "";
  const opacity = frame.opacity !== 1 ? ` opacity="${frame.opacity}"` : "";
  const rx = frame.cornerRadius ? ` rx="${frame.cornerRadius}"` : "";
  const fill = fillRef(frame, defs);
  const children = frame.children
    .filter((c) => c.visible)
    .map((c) => nodeToSvg(c, defs))
    .join("\n    ");

  if (frame.clipContent) {
    const clipId = `clip-${frame.id}`;
    return `<g transform="translate(${frame.x} ${frame.y})${rot}"${opacity}><clipPath id="${clipId}"><rect width="${frame.width}" height="${frame.height}"${rx} /></clipPath><rect width="${frame.width}" height="${frame.height}"${rx} fill="${fill}" /><g clip-path="url(#${clipId})">${children}</g></g>`;
  }
  return `<g transform="translate(${frame.x} ${frame.y})${rot}"${opacity}><rect width="${frame.width}" height="${frame.height}"${rx} fill="${fill}" />${children}</g>`;
}

function groupToSvg(group: GroupNode | Extract<SceneNode, { type: "boolean" }>, defs: string[]): string {
  const rot = group.rotation ? ` rotate(${group.rotation} ${group.width / 2} ${group.height / 2})` : "";
  const opacity = group.opacity !== 1 ? ` opacity="${group.opacity}"` : "";
  const children = group.children
    .filter((c) => c.visible)
    .map((c) => nodeToSvg(c, defs))
    .join("\n    ");
  return `<g transform="translate(${group.x} ${group.y})${rot}"${opacity}>${children}</g>`;
}

function textToSvg(node: TextNode, opacity: string, transform: string, defs: string[]): string {
  const weight = node.fontStyle === "bold" ? ' font-weight="bold"' : "";
  const style = node.fontStyle === "italic" ? ' font-style="italic"' : "";
  const safe = escapeXml(node.text);
  const fill = fillRef(node, defs);
  return `<text x="${node.x}" y="${node.y + node.fontSize}" font-family="${escapeXml(node.fontFamily)}" font-size="${node.fontSize}" fill="${fill}"${weight}${style}${opacity}${transform}>${safe}</text>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadSvg(doc: GroundworkDocument): void {
  downloadSvgString(documentToSvg(doc), doc.name);
}

/** Serialize one node to a standalone SVG sized to its own bounds. */
export function nodeToSvgDocument(node: SceneNode): string {
  const w = Math.ceil(node.width);
  const h = Math.ceil(node.height);
  const defs: string[] = [];
  const inner = nodeToSvg({ ...node, x: 0, y: 0, rotation: 0 } as SceneNode, defs);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  ${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${inner}\n</svg>`;
}

export function downloadNodeSvg(node: SceneNode, name: string): void {
  downloadSvgString(nodeToSvgDocument(node), name);
}

function downloadSvgString(svg: string, name: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
