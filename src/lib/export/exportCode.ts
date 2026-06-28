import {
  activePage,
  type BooleanNode,
  type GroundworkDocument,
  type PathNode,
  type SceneNode,
} from "@/types/document";
import { fillsFor, fillsToCss, paintToSvg } from "@/lib/paint";
import { smoothPathToSvgD } from "@/lib/bezier";
import { displayText } from "@/lib/text";
import { effectsToBoxShadow, effectsToCssFilter, blendModeCss } from "@/lib/effects";
import { applyVariables } from "@/lib/variables";
import { applyInstanceProps } from "@/lib/componentProps";

// Generate clean, framework-free HTML + CSS from the scene — a local "Dev Mode".
// Box-like nodes become absolutely-positioned divs (auto-layout frames become
// flexbox); paths and boolean shapes become accurate inline SVG. All on-device.

export interface GeneratedCode {
  html: string;
  css: string;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function className(node: SceneNode): string {
  const base =
    node.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || node.type;
  return `${base}-${node.id.slice(0, 4)}`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Position / size / transform / opacity — no fill, border or shadow. */
function boxStyle(node: SceneNode, positioned: boolean): string[] {
  const s: string[] = [];
  if (positioned) {
    s.push("position: absolute");
    s.push(`left: ${round(node.x)}px`);
    s.push(`top: ${round(node.y)}px`);
  }
  s.push(`width: ${round(node.width)}px`);
  s.push(`height: ${round(node.height)}px`);
  if (node.rotation) s.push(`transform: rotate(${round(node.rotation)}deg)`);
  if (node.opacity !== 1) s.push(`opacity: ${round(node.opacity)}`);
  return s;
}

/** Border (stroke) + effects (shadows, blur) + blend mode for box-like nodes. */
function effectStyle(node: SceneNode): string[] {
  const s: string[] = [];
  if (node.stroke) {
    const lineStyle = node.stroke.style === "dashed" ? "dashed" : node.stroke.style === "dotted" ? "dotted" : "solid";
    s.push(`border: ${round(node.stroke.width)}px ${lineStyle} ${node.stroke.color}`);
  }
  const boxShadow = effectsToBoxShadow(node);
  if (boxShadow) s.push(`box-shadow: ${boxShadow}`);
  const filter = effectsToCssFilter(node);
  if (filter) s.push(`filter: ${filter}`);
  const blend = blendModeCss(node);
  if (blend) s.push(`mix-blend-mode: ${blend}`);
  return s;
}

function alignToFlex(align: "start" | "center" | "end"): string {
  return align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center";
}

function justifyToFlex(justify: "start" | "center" | "end" | "space-between" | undefined): string {
  if (justify === "center") return "center";
  if (justify === "end") return "flex-end";
  if (justify === "space-between") return "space-between";
  return "flex-start";
}

interface Built {
  html: string[];
  rules: string[];
}

/** SVG element for a boolean operand, in the boolean node's local space. */
function operandEl(child: SceneNode, fill: string, extra = ""): string {
  if (child.type === "ellipse") {
    return `<ellipse cx="${round(child.x + child.width / 2)}" cy="${round(child.y + child.height / 2)}" rx="${round(child.width / 2)}" ry="${round(child.height / 2)}" fill="${fill}" ${extra}/>`;
  }
  if (child.type === "path") {
    const pts: string[] = [];
    for (let i = 0; i < child.points.length; i += 2) {
      pts.push(`${round(child.x + child.points[i])},${round(child.y + child.points[i + 1])}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${fill}" ${extra}/>`;
  }
  const rx = child.type === "rect" && child.cornerRadius ? ` rx="${round(child.cornerRadius)}"` : "";
  return `<rect x="${round(child.x)}" y="${round(child.y)}" width="${round(child.width)}" height="${round(child.height)}"${rx} fill="${fill}" ${extra}/>`;
}

/** Inner SVG markup for a boolean node (mask/clip-based, faithful to the ops). */
function booleanInner(node: BooleanNode): string {
  const id = `b-${node.id}`;
  const fill = node.fill;
  const [first, ...rest] = node.children;
  if (!first) return "";

  if (node.op === "union") {
    return node.children.map((c) => operandEl(c, fill)).join("");
  }

  if (node.op === "subtract") {
    const mask = `<mask id="${id}">${operandEl(first, "#fff")}${rest.map((c) => operandEl(c, "#000")).join("")}</mask>`;
    return `<defs>${mask}</defs>${operandEl(first, fill, `mask="url(#${id})"`)}`;
  }

  if (node.op === "intersect") {
    const clips = rest
      .map((c, i) => `<clipPath id="${id}-${i}">${operandEl(c, "#000")}</clipPath>`)
      .join("");
    let inner = operandEl(first, fill);
    rest.forEach((_c, i) => {
      inner = `<g clip-path="url(#${id}-${i})">${inner}</g>`;
    });
    return `<defs>${clips}</defs>${inner}`;
  }

  // exclude (XOR): exact for two operands; union fallback for more.
  if (node.children.length === 2) {
    const b = rest[0];
    const clip = `<clipPath id="${id}-c">${operandEl(first, "#000")}</clipPath>`;
    const mask = `<mask id="${id}">${operandEl(first, "#fff")}${operandEl(b, "#fff")}<g clip-path="url(#${id}-c)">${operandEl(b, "#000")}</g></mask>`;
    return `<defs>${clip}${mask}</defs><rect x="0" y="0" width="${round(node.width)}" height="${round(node.height)}" fill="${fill}" mask="url(#${id})"/>`;
  }
  return node.children.map((c) => operandEl(c, fill)).join("");
}

function svgWrap(node: SceneNode, inner: string): string {
  return `<svg width="100%" height="100%" viewBox="0 0 ${round(node.width)} ${round(node.height)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function pathInner(node: PathNode): string {
  const pts: string[] = [];
  for (let i = 0; i < node.points.length; i += 2) {
    pts.push(`${round(node.points[i])},${round(node.points[i + 1])}`);
  }
  const tag = node.closed ? "polygon" : "polyline";
  const defs: string[] = [];
  const paints = fillsFor(node);
  const fill = node.closed ? paintToSvg(paints[paints.length - 1], `pg-${node.id}`, defs) : "none";
  const defsBlock = defs.length ? `<defs>${defs.join("")}</defs>` : "";
  const stroke = node.stroke
    ? ` stroke="${node.stroke.color}" stroke-width="${round(node.stroke.width)}"`
    : "";
  if (node.subpaths && node.subpaths.length > 1) {
    const d = node.subpaths
      .map((sp) => {
        const p = sp.points;
        if (p.length < 2) return "";
        let seg = `M${round(p[0])},${round(p[1])}`;
        for (let i = 2; i < p.length; i += 2) seg += ` L${round(p[i])},${round(p[i + 1])}`;
        return sp.closed ? `${seg} Z` : seg;
      })
      .join(" ");
    return `${defsBlock}<path d="${d}" fill="${fill}" fill-rule="evenodd"${stroke} />`;
  }
  if (node.smooth && node.points.length >= 6) {
    const d = smoothPathToSvgD(node.points, node.closed);
    return `${defsBlock}<path d="${d}" fill="${fill}"${stroke} />`;
  }
  return `${defsBlock}<${tag} points="${pts.join(" ")}" fill="${fill}"${stroke} />`;
}

/** Recursively build HTML + CSS rules for a node. */
function build(node: SceneNode, positioned: boolean, indent: number): Built {
  if (!node.visible) return { html: [], rules: [] };
  const cls = className(node);
  const pad = "  ".repeat(indent);
  const rules: string[] = [];

  // Paths & booleans render as inline SVG inside a positioned wrapper.
  if (node.type === "path" || node.type === "boolean") {
    const style = [...boxStyle(node, positioned)];
    rules.push(`.${cls} {\n  ${style.join(";\n  ")};\n}`);
    const inner = node.type === "path" ? pathInner(node) : booleanInner(node);
    return { html: [`${pad}<div class="${cls}">${svgWrap(node, inner)}</div>`], rules };
  }

  const style = [...boxStyle(node, positioned), ...effectStyle(node)];

  if (node.type === "text") {
    const top = fillsFor(node)[fillsFor(node).length - 1];
    if (top.type === "solid") {
      style.push(`color: ${top.color}`);
    } else {
      // gradient text via background-clip
      style.push(`background: ${fillsToCss(node)}`);
      style.push("-webkit-background-clip: text");
      style.push("background-clip: text");
      style.push("color: transparent");
    }
    style.push(`font-family: ${node.fontFamily}`);
    style.push(`font-size: ${round(node.fontSize)}px`);
    if (node.fontStyle === "bold") style.push("font-weight: 700");
    if (node.fontStyle === "italic") style.push("font-style: italic");
    if (node.align) style.push(`text-align: ${node.align}`);
    if (node.lineHeight) style.push(`line-height: ${node.lineHeight}`);
    if (node.letterSpacing) style.push(`letter-spacing: ${round(node.letterSpacing)}px`);
    if (node.textDecoration && node.textDecoration !== "none") style.push(`text-decoration: ${node.textDecoration}`);
    rules.push(`.${cls} {\n  ${style.join(";\n  ")};\n}`);
    return { html: [`${pad}<p class="${cls}">${escapeHtml(displayText(node))}</p>`], rules };
  }

  if (node.type === "image") {
    if (node.image.fit === "tile") {
      style.push(`background: url(${node.image.src}) repeat`);
      rules.push(`.${cls} {\n  ${style.join(";\n  ")};\n}`);
      return { html: [`${pad}<div class="${cls}"></div>`], rules };
    }
    style.push(`object-fit: ${node.image.fit === "contain" ? "contain" : "cover"}`);
    rules.push(`.${cls} {\n  ${style.join(";\n  ")};\n}`);
    return {
      html: [`${pad}<img class="${cls}" src="${node.image.src}" alt="${escapeHtml(node.name)}" />`],
      rules,
    };
  }

  if (node.type === "ellipse") {
    style.push(`background: ${fillsToCss(node)}`);
    style.push("border-radius: 50%");
    rules.push(`.${cls} {\n  ${style.join(";\n  ")};\n}`);
    return { html: [`${pad}<div class="${cls}"></div>`], rules };
  }

  if (node.type === "rect") {
    if (node.image) {
      style.push(node.image.fit === "tile" ? `background: url(${node.image.src}) repeat` : `background: center / cover url(${node.image.src})`);
    } else style.push(`background: ${fillsToCss(node)}`);
    if (node.cornerRadii) {
      const [tl, tr, br, bl] = node.cornerRadii;
      style.push(`border-radius: ${round(tl)}px ${round(tr)}px ${round(br)}px ${round(bl)}px`);
    } else if (node.cornerRadius) {
      style.push(`border-radius: ${round(node.cornerRadius)}px`);
    }
    rules.push(`.${cls} {\n  ${style.join(";\n  ")};\n}`);
    return { html: [`${pad}<div class="${cls}"></div>`], rules };
  }

  // frame / group containers
  let childPositioned = true;
  if (node.type === "frame") {
    style.push(`background: ${fillsToCss(node)}`);
    if (node.cornerRadius) style.push(`border-radius: ${round(node.cornerRadius)}px`);
    if (node.clipContent) style.push("overflow: hidden");
    if (node.autoLayout) {
      const a = node.autoLayout;
      style.push("display: flex");
      style.push(`flex-direction: ${a.direction}`);
      style.push(`gap: ${round(a.gap)}px`);
      const pt = a.paddingTop ?? a.padding;
      const pr = a.paddingRight ?? a.padding;
      const pb = a.paddingBottom ?? a.padding;
      const pl = a.paddingLeft ?? a.padding;
      style.push(`padding: ${round(pt)}px ${round(pr)}px ${round(pb)}px ${round(pl)}px`);
      style.push(`align-items: ${alignToFlex(a.align)}`);
      style.push(`justify-content: ${justifyToFlex(a.justify)}`);
      childPositioned = false;
    } else if (!positioned) {
      style.push("position: relative");
    }
  }

  rules.push(`.${cls} {\n  ${style.join(";\n  ")};\n}`);

  const children = node.children;
  if (children.length === 0) return { html: [`${pad}<div class="${cls}"></div>`], rules };

  const inner: string[] = [];
  for (const child of children) {
    const built = build(child, childPositioned, indent + 1);
    inner.push(...built.html);
    rules.push(...built.rules);
  }
  return { html: [`${pad}<div class="${cls}">`, ...inner, `${pad}</div>`], rules };
}

/** Generate HTML + CSS for a single node (placed at its own origin). */
export function nodeToCode(node: SceneNode): GeneratedCode {
  const built = build({ ...node, x: 0, y: 0 } as SceneNode, false, 0);
  return { html: built.html.join("\n"), css: built.rules.join("\n\n") };
}

/** Generate HTML + CSS for a whole page, wrapped in a sized canvas container. */
export function pageToCode(doc: GroundworkDocument): GeneratedCode {
  const page = activePage(doc);
  const { width, height, background } = page.canvas;
  const rules: string[] = [
    `.canvas {\n  position: relative;\n  width: ${width}px;\n  height: ${height}px;\n  background: ${background};\n  overflow: hidden;\n}`,
  ];
  const inner: string[] = [];
  for (const node of applyInstanceProps(applyVariables(page.nodes, doc.variables))) {
    const built = build(node, true, 1);
    inner.push(...built.html);
    rules.push(...built.rules);
  }
  return { html: [`<div class="canvas">`, ...inner, `</div>`].join("\n"), css: rules.join("\n\n") };
}

/** Code for the current selection, or the whole page when nothing is selected. */
export function selectionToCode(
  doc: GroundworkDocument,
  selected: SceneNode | undefined,
): GeneratedCode {
  return selected ? nodeToCode(selected) : pageToCode(doc);
}

/** A complete standalone HTML document with the page CSS inlined. */
export function fullHtmlDocument(doc: GroundworkDocument): string {
  const { html, css } = pageToCode(doc);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: grid; place-items: center; min-height: 100vh; background: #f3f3f4; }
${css.replace(/^/gm, "    ")}
  </style>
</head>
<body>
${html.replace(/^/gm, "  ")}
</body>
</html>`;
}

/** Download the whole page as a standalone .html file. */
export function downloadHtmlDocument(doc: GroundworkDocument): void {
  const blob = new Blob([fullHtmlDocument(doc)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
