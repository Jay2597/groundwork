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
import { smoothPathToSvgD } from "@/lib/bezier";
import { handlePathToSvgD } from "@/lib/bezierPath";
import { displayText } from "@/lib/text";
import { effectsOf, blendModeCss } from "@/lib/effects";
import { applyVariables } from "@/lib/variables";
import { applyInstanceProps } from "@/lib/componentProps";

// Serialize the document to clean, standards-based SVG — an open, portable
// format generated 100% client-side. Gradients are emitted
// into a shared <defs>; strokes carry dash/cap/join; rects support per-corner radii.

export function documentToSvg(doc: GroundworkDocument): string {
  const page = activePage(doc);
  return pageToSvg({ ...page, nodes: applyInstanceProps(applyVariables(page.nodes, doc.variables)) });
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

/** Export a document-space region (a slice) as a cropped SVG string. */
export function regionToSvg(doc: GroundworkDocument, rect: { x: number; y: number; width: number; height: number }): string {
  const page = activePage(doc);
  const nodes = applyInstanceProps(applyVariables(page.nodes, doc.variables));
  const defs: string[] = [];
  const body = nodes
    .filter((node) => node.visible)
    .map((n) => nodeToSvg(n, defs))
    .join("\n  ");
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${rect.x} ${rect.y} ${w} ${h}">
  ${defs.length ? `<defs>${defs.join("")}</defs>\n  ` : ""}${body}
</svg>`;
}

export function downloadRegionSvg(doc: GroundworkDocument, rect: { x: number; y: number; width: number; height: number }, name: string): void {
  downloadSvgString(regionToSvg(doc, rect), name);
}

/** Top visible fill as an SVG paint reference (solid color or url(#grad)). */
function fillRef(node: SceneNode, defs: string[]): string {
  const fills = fillsFor(node);
  const top = fills[fills.length - 1];
  return paintToSvg(top, `grad-${node.id}`, defs);
}

/** Drop-shadow filter (into defs) + blend-mode style, as element attributes. */
function effectsAttr(node: SceneNode, defs: string[]): string {
  let out = "";
  const ds = effectsOf(node).find((e) => e.type === "drop-shadow");
  if (ds && ds.type === "drop-shadow") {
    const id = `fx-${node.id}`;
    defs.push(
      `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${ds.offsetX}" dy="${ds.offsetY}" stdDeviation="${ds.blur / 2}" flood-color="${ds.color}" /></filter>`,
    );
    out += ` filter="url(#${id})"`;
  }
  const blend = blendModeCss(node);
  if (blend) out += ` style="mix-blend-mode:${blend}"`;
  return out;
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
  const opacity = `${node.opacity !== 1 ? ` opacity="${node.opacity}"` : ""}${effectsAttr(node, defs)}`;
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
  stroke += pathMarkers(node, defs);
  if (node.subpaths && node.subpaths.length > 1) {
    const d = node.subpaths
      .map((sp) => subpathToD(node.x, node.y, sp.points, sp.closed))
      .join(" ");
    return `<path d="${d}" fill="${fill}" fill-rule="evenodd"${stroke}${opacity}${transform} />`;
  }
  if (node.handles && node.handles.length >= 8 && node.points.length >= 4) {
    const d = handlePathToSvgD(node.points, node.handles, node.closed, node.x, node.y);
    return `<path d="${d}" fill="${fill}"${stroke}${opacity}${transform} />`;
  }
  if (node.smooth && node.points.length >= 6) {
    const d = smoothPathToSvgD(node.points, node.closed, node.x, node.y);
    return `<path d="${d}" fill="${fill}"${stroke}${opacity}${transform} />`;
  }
  const pts: string[] = [];
  for (let i = 0; i < node.points.length; i += 2) {
    pts.push(`${node.x + node.points[i]},${node.y + node.points[i + 1]}`);
  }
  const tag = node.closed ? "polygon" : "polyline";
  return `<${tag} points="${pts.join(" ")}" fill="${fill}"${stroke}${opacity}${transform} />`;
}

/** Build <marker> defs + the marker-start/marker-end attribute string for a path. */
function pathMarkers(node: Extract<SceneNode, { type: "path" }>, defs: string[]): string {
  const s = node.stroke;
  if (!s || node.closed) return "";
  const start = s.markerStart ?? "none";
  const end = s.markerEnd ?? "none";
  if (start === "none" && end === "none") return "";
  let attrs = "";
  const ensure = (type: string): string => {
    const id = `mk-${type}-${node.id}`;
    const shape =
      type === "circle"
        ? `<circle cx="5" cy="5" r="4" fill="${s.color}" />`
        : `<path d="M0,0 L10,5 L0,10 z" fill="${s.color}" />`;
    const box = type === "circle" ? `viewBox="0 0 10 10" refX="5" refY="5"` : `viewBox="0 0 10 10" refX="9" refY="5"`;
    defs.push(`<marker id="${id}" markerWidth="6" markerHeight="6" ${box} orient="auto" markerUnits="strokeWidth">${shape}</marker>`);
    return id;
  };
  if (start !== "none") attrs += ` marker-start="url(#${ensure(start)})"`;
  if (end !== "none") attrs += ` marker-end="url(#${ensure(end)})"`;
  return attrs;
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

  // Masked group: the first mask child becomes a <clipPath>; siblings are clipped.
  const maskIndex = group.children.findIndex((c) => c.isMask && c.visible);
  if (maskIndex >= 0) {
    const maskNode = group.children[maskIndex];
    const clipId = `mask-${group.id}`;
    const clipShape = nodeToSvg({ ...maskNode, isMask: false } as SceneNode, defs);
    const masked = group.children
      .filter((c, i) => c.visible && i !== maskIndex)
      .map((c) => nodeToSvg(c, defs))
      .join("\n    ");
    return `<g transform="translate(${group.x} ${group.y})${rot}"${opacity}><clipPath id="${clipId}">${clipShape}</clipPath><g clip-path="url(#${clipId})">${masked}</g></g>`;
  }

  const children = group.children
    .filter((c) => c.visible)
    .map((c) => nodeToSvg(c, defs))
    .join("\n    ");
  return `<g transform="translate(${group.x} ${group.y})${rot}"${opacity}>${children}</g>`;
}

function textToSvg(node: TextNode, opacity: string, transform: string, defs: string[]): string {
  const weight = node.fontStyle === "bold" ? ' font-weight="bold"' : "";
  const style = node.fontStyle === "italic" ? ' font-style="italic"' : "";
  const deco = node.textDecoration && node.textDecoration !== "none" ? ` text-decoration="${node.textDecoration}"` : "";
  const safe = escapeXml(displayText(node));
  const fill = fillRef(node, defs);
  return `<text x="${node.x}" y="${node.y + node.fontSize}" font-family="${escapeXml(node.fontFamily)}" font-size="${node.fontSize}" fill="${fill}"${weight}${style}${deco}${opacity}${transform}>${safe}</text>`;
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
