import { nanoid } from "nanoid";
import {
  createEmptyDocument,
  type EllipseNode,
  type FrameNode,
  type GroundworkDocument,
  type Paint,
  type RectNode,
  type SceneNode,
  type TextNode,
} from "@/types/document";

// A curated starter design so first-time testers see real content immediately.

const SANS = '"IBM Plex Sans", system-ui, sans-serif';
const id = () => nanoid(8);

function rect(p: Partial<RectNode> & Pick<RectNode, "x" | "y" | "width" | "height">): RectNode {
  return {
    id: id(), type: "rect", name: "Rectangle", rotation: 0, fill: "#ffffff",
    opacity: 1, visible: true, locked: false, cornerRadius: 0, ...p,
  };
}

function text(t: string, p: Partial<TextNode> & Pick<TextNode, "x" | "y" | "width">): TextNode {
  return {
    id: id(), type: "text", name: t.slice(0, 18) || "Text", rotation: 0, fill: "#0d0d0f",
    opacity: 1, visible: true, locked: false, height: (p.fontSize ?? 16) * 1.3,
    text: t, fontSize: 16, fontFamily: SANS, fontStyle: "normal", ...p,
  };
}

function ellipse(p: Partial<EllipseNode> & Pick<EllipseNode, "x" | "y" | "width" | "height">): EllipseNode {
  return {
    id: id(), type: "ellipse", name: "Ellipse", rotation: 0, fill: "#f2a33c",
    opacity: 1, visible: true, locked: false, ...p,
  };
}

const heroGradient: Paint[] = [
  {
    type: "linear",
    angle: 60,
    opacity: 1,
    visible: true,
    stops: [
      { color: "#1a1206", position: 0 },
      { color: "#f2a33c", position: 1 },
    ],
  },
];

const cardShadow = { color: "#0d0d0f22", blur: 24, offsetX: 0, offsetY: 12 };

function card(x: number, y: number, title: string, body: string): SceneNode[] {
  return [
    rect({ x, y, width: 232, height: 150, fill: "#ffffff", cornerRadius: 16, name: `Card — ${title}`, shadow: cardShadow }),
    ellipse({ x: x + 20, y: y + 20, width: 36, height: 36, fill: "#f2a33c", name: "Dot" }),
    text(title, { x: x + 20, y: y + 70, width: 192, fontSize: 18, fontStyle: "bold" }),
    text(body, { x: x + 20, y: y + 98, width: 192, fontSize: 13, fill: "#5a5a5e", lineHeight: 1.4 }),
  ];
}

export function createSampleDocument(): GroundworkDocument {
  const doc = createEmptyDocument("Sample — Groundwork");
  const page = doc.pages[0];
  page.canvas = { width: 1200, height: 900, background: "#ece9e1" };

  const frame: FrameNode = {
    id: id(), type: "frame", name: "Welcome", x: 160, y: 120, width: 800, height: 560,
    rotation: 0, fill: "#ffffff", opacity: 1, visible: true, locked: false,
    clipContent: true, cornerRadius: 20,
    children: [
      // hero band
      rect({ x: 0, y: 0, width: 800, height: 220, fills: heroGradient, name: "Hero" }),
      text("Groundwork", { x: 40, y: 56, width: 600, fontSize: 52, fontStyle: "bold", fill: "#ffffff" }),
      text("A local-first design tool. Your files never leave your device.", {
        x: 40, y: 128, width: 560, fontSize: 18, fill: "#ffffffcc",
      }),
      // CTA button
      rect({ x: 40, y: 250, width: 180, height: 48, fill: "#f2a33c", cornerRadius: 10, name: "Button" }),
      text("Get started →", { x: 40, y: 264, width: 180, fontSize: 16, fontStyle: "bold", fill: "#1a1206", align: "center" }),
      // feature cards
      ...card(40, 330, "Private", "Everything stays in your browser."),
      ...card(292, 330, "Fast", "Canvas powered by Konva."),
      ...card(544, 330, "Open", "Export to SVG, PNG, HTML/CSS."),
    ],
  };

  page.nodes = [frame];
  return doc;
}
