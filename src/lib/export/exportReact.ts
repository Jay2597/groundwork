import {
  activePage,
  type GroundworkDocument,
  type SceneNode,
} from "@/types/document";
import { applyVariables } from "@/lib/variables";
import { applyInstanceProps } from "@/lib/componentProps";

// Generate a React component that uses Tailwind utility classes (with arbitrary
// values, e.g. w-[120px] bg-[#f2a33c]). Box-like nodes map cleanly; vector
// paths/booleans render as a sized placeholder (use SVG export for those). Pure
// and framework-free — all computed on-device.

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function alignToTw(align: "start" | "center" | "end"): string {
  return align === "start" ? "items-start" : align === "end" ? "items-end" : "items-center";
}

function justifyToTw(j: "start" | "center" | "end" | "space-between" | undefined): string {
  if (j === "center") return "justify-center";
  if (j === "end") return "justify-end";
  if (j === "space-between") return "justify-between";
  return "justify-start";
}

/** Tailwind utility classes for one node. `positioned` adds absolute placement. */
export function tailwindClasses(node: SceneNode, positioned: boolean): string {
  const c: string[] = [];
  if (positioned) c.push("absolute", `left-[${round(node.x)}px]`, `top-[${round(node.y)}px]`);
  c.push(`w-[${round(node.width)}px]`, `h-[${round(node.height)}px]`);
  if (node.rotation) c.push(`rotate-[${round(node.rotation)}deg]`);
  if (node.opacity !== 1) c.push(`opacity-[${round(node.opacity)}]`);

  const fill = typeof node.fill === "string" ? node.fill : null;

  if (node.type === "ellipse") {
    if (fill) c.push(`bg-[${fill}]`);
    c.push("rounded-full");
  } else if (node.type === "rect") {
    if (node.image) c.push("bg-cover bg-center");
    else if (fill) c.push(`bg-[${fill}]`);
    if (node.cornerRadius) c.push(`rounded-[${round(node.cornerRadius)}px]`);
  } else if (node.type === "text") {
    if (fill) c.push(`text-[${fill}]`);
    c.push(`text-[${round(node.fontSize)}px]`);
    if (node.fontStyle === "bold") c.push("font-bold");
    if (node.fontStyle === "italic") c.push("italic");
    if (node.align === "center") c.push("text-center");
    else if (node.align === "right") c.push("text-right");
  } else if (node.type === "frame") {
    if (fill) c.push(`bg-[${fill}]`);
    if (node.cornerRadius) c.push(`rounded-[${round(node.cornerRadius)}px]`);
    if (node.clipContent) c.push("overflow-hidden");
    if (node.autoLayout) {
      const a = node.autoLayout;
      c.push("flex", a.direction === "row" ? "flex-row" : "flex-col");
      c.push(`gap-[${round(a.gap)}px]`, `p-[${round(a.padding)}px]`, alignToTw(a.align), justifyToTw(a.justify));
    } else if (!positioned) {
      c.push("relative");
    }
  } else if (node.type === "group" || node.type === "boolean" || node.type === "path") {
    if (!positioned) c.push("relative");
  }

  if (node.stroke) c.push(`border-[${round(node.stroke.width)}px]`, `border-[${node.stroke.color}]`);
  return c.join(" ");
}

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
}

function emit(node: SceneNode, positioned: boolean, indent: number): string[] {
  if (!node.visible) return [];
  const pad = "  ".repeat(indent);
  const cls = tailwindClasses(node, positioned);

  if (node.type === "text") {
    return [`${pad}<p className="${cls}">${esc(node.text)}</p>`];
  }
  if (node.type === "image") {
    return [`${pad}<img className="${cls}" src="${node.image.src}" alt="" />`];
  }
  if (node.type === "path" || node.type === "boolean") {
    return [`${pad}<div className="${cls}">{/* vector — use SVG export */}</div>`];
  }
  if (node.type === "rect" || node.type === "ellipse") {
    const style = node.type === "rect" && node.image ? ` style={{ backgroundImage: \`url(\${"${node.image.src}"})\` }}` : "";
    return [`${pad}<div className="${cls}"${style} />`];
  }

  // frame / group containers
  const childPositioned = node.type === "frame" ? !node.autoLayout : true;
  const children = node.children;
  if (children.length === 0) return [`${pad}<div className="${cls}" />`];
  const inner = children.flatMap((c) => emit(c, childPositioned, indent + 1));
  return [`${pad}<div className="${cls}">`, ...inner, `${pad}</div>`];
}

/** Generate a React component (Tailwind classes) for the whole active page. */
export function pageToReact(doc: GroundworkDocument): string {
  const page = activePage(doc);
  const nodes = applyInstanceProps(applyVariables(page.nodes, doc.variables));
  const { width, height, background } = page.canvas;
  const body = nodes.flatMap((n) => emit(n, true, 3));
  const compName = (doc.name || "Design").replace(/[^a-zA-Z0-9]/g, "") || "Design";
  return `export function ${compName}() {
  return (
    <div className="relative w-[${width}px] h-[${height}px] bg-[${background}] overflow-hidden">
${body.join("\n")}
    </div>
  );
}
`;
}

/** Generate a React component for a single node (placed at its own origin). */
export function nodeToReact(node: SceneNode): string {
  const body = emit({ ...node, x: 0, y: 0 } as SceneNode, false, 2);
  const compName = node.name.replace(/[^a-zA-Z0-9]/g, "") || "Node";
  return `export function ${compName || "Node"}() {
  return (
${body.join("\n")}
  );
}
`;
}

export function selectionToReact(doc: GroundworkDocument, selected: SceneNode | undefined): string {
  return selected ? nodeToReact(selected) : pageToReact(doc);
}
