// Editor-only state shapes (not persisted with the document).

export type Tool = "select" | "hand" | "frame" | "rect" | "ellipse" | "text" | "pen";

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export interface DraftShape {
  type: "frame" | "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
}
