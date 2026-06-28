import { nanoid } from "nanoid";
import {
  createEmptyDocument,
  type FrameNode,
  type GroundworkDocument,
  type RectNode,
  type SceneNode,
  type TextNode,
} from "@/types/document";

// Built-in starter documents. Each builder is pure (returns a fresh document),
// so they're easy to unit-test and to instantiate from the Home screen.

const BASE = { rotation: 0, opacity: 1, visible: true, locked: false };

function rect(x: number, y: number, w: number, h: number, fill: string, radius = 0): RectNode {
  return { ...BASE, id: nanoid(8), type: "rect", name: "Rect", x, y, width: w, height: h, fill, cornerRadius: radius };
}

function text(x: number, y: number, w: number, content: string, size: number, fill = "#0d0d0f"): TextNode {
  return {
    ...BASE, id: nanoid(8), type: "text", name: content.slice(0, 16) || "Text",
    x, y, width: w, height: size * 1.4, fill, text: content, fontSize: size,
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontStyle: "normal",
  };
}

function frame(name: string, x: number, y: number, w: number, h: number, children: SceneNode[], fill = "#ffffff"): FrameNode {
  return { ...BASE, id: nanoid(8), type: "frame", name, x, y, width: w, height: h, fill, clipContent: true, children };
}

function doc(name: string, nodes: SceneNode[], canvasBg = "#f3f3f4"): GroundworkDocument {
  const d = createEmptyDocument(name);
  d.pages[0].nodes = nodes;
  d.pages[0].canvas = { ...d.pages[0].canvas, background: canvasBg };
  return d;
}

function buildWireframe(): GroundworkDocument {
  const children: SceneNode[] = [
    rect(0, 0, 1440, 72, "#ffffff"),
    text(40, 26, 200, "Logo", 20),
    rect(1140, 20, 260, 32, "#e7e7ea", 6),
    rect(80, 140, 760, 360, "#e7e7ea", 12),
    text(80, 540, 760, "Section heading", 28),
    rect(80, 600, 360, 200, "#e7e7ea", 12),
    rect(480, 600, 360, 200, "#e7e7ea", 12),
    rect(920, 140, 440, 660, "#eeeef0", 12),
  ];
  return doc("Wireframe", [frame("Desktop", 80, 80, 1440, 1024, children)]);
}

function buildSocial(): GroundworkDocument {
  return doc("Social media", [
    frame("Instagram post", 80, 80, 1080, 1080, [text(80, 80, 920, "Post 1080×1080", 48)], "#f2a33c"),
    frame("Instagram story", 1240, 80, 1080, 1920, [text(80, 80, 920, "Story 1080×1920", 48)], "#0d0d0f"),
    frame("Twitter / X", 2400, 80, 1200, 675, [text(60, 60, 1080, "Card 1200×675", 44)], "#1d1f24"),
  ]);
}

function buildMobile(): GroundworkDocument {
  const children: SceneNode[] = [
    rect(0, 0, 390, 50, "#ffffff"),
    text(20, 16, 200, "9:41", 15),
    text(20, 80, 350, "Good morning", 28),
    rect(20, 140, 350, 120, "#f2a33c", 16),
    rect(20, 284, 168, 120, "#e7e7ea", 16),
    rect(202, 284, 168, 120, "#e7e7ea", 16),
    rect(0, 784, 390, 60, "#ffffff"),
  ];
  return doc("Mobile app", [frame("iPhone 14", 80, 80, 390, 844, children)]);
}

function buildUiKit(): GroundworkDocument {
  const children: SceneNode[] = [
    text(40, 40, 400, "Buttons", 24),
    rect(40, 90, 160, 48, "#f2a33c", 10),
    text(70, 104, 120, "Primary", 16, "#0d0d0f"),
    rect(220, 90, 160, 48, "#e7e7ea", 10),
    text(250, 104, 120, "Secondary", 16),
    text(40, 180, 400, "Card", 24),
    rect(40, 230, 340, 200, "#ffffff", 16),
  ];
  return doc("UI kit", [frame("Components", 80, 80, 800, 600, children, "#f7f7f8")]);
}

export interface Template {
  id: string;
  name: string;
  description: string;
  build: () => GroundworkDocument;
}

export const TEMPLATES: Template[] = [
  { id: "wireframe", name: "Wireframe", description: "Desktop layout scaffold", build: buildWireframe },
  { id: "social", name: "Social media", description: "IG post, story & X card", build: buildSocial },
  { id: "mobile", name: "Mobile app", description: "iPhone screen starter", build: buildMobile },
  { id: "ui-kit", name: "UI kit", description: "Buttons & a card", build: buildUiKit },
];
