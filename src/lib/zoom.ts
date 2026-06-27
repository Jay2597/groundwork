import { activePage, type SceneNode } from "@/types/document";
import { useEditorStore } from "@/store/editorStore";
import { getStage } from "@/lib/stageRegistry";
import { findNode } from "@/lib/tree";

const MIN = 0.05;
const MAX = 16;

function clamp(v: number): number {
  return Math.min(MAX, Math.max(MIN, v));
}

function stageSize(): { w: number; h: number } {
  const stage = getStage();
  return stage ? { w: stage.width(), h: stage.height() } : { w: 1200, h: 800 };
}

/** Set absolute zoom, keeping the stage center fixed. */
export function setZoom(scale: number): void {
  const { viewport, setViewport } = useEditorStore.getState();
  const { w, h } = stageSize();
  const ns = clamp(scale);
  const point = { x: (w / 2 - viewport.x) / viewport.scale, y: (h / 2 - viewport.y) / viewport.scale };
  setViewport({ scale: ns, x: w / 2 - point.x * ns, y: h / 2 - point.y * ns });
}

export function zoomBy(factor: number): void {
  setZoom(useEditorStore.getState().viewport.scale * factor);
}

/** Fit a document-space box into the stage with padding. */
function fitBox(box: { x: number; y: number; width: number; height: number }, pad = 0.85): void {
  const { setViewport } = useEditorStore.getState();
  const { w, h } = stageSize();
  if (box.width <= 0 || box.height <= 0) return;
  const scale = clamp(Math.min(w / box.width, h / box.height) * pad);
  const x = w / 2 - (box.x + box.width / 2) * scale;
  const y = h / 2 - (box.y + box.height / 2) * scale;
  setViewport({ scale, x, y });
}

function boundsOf(nodes: SceneNode[]): { x: number; y: number; width: number; height: number } | null {
  if (nodes.length === 0) return null;
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Reset to 100% centered on content (or canvas). */
export function resetZoom(): void {
  setZoom(1);
}

/** Fit all content (or the canvas if empty) into view. */
export function zoomToFit(): void {
  const { document } = useEditorStore.getState();
  const page = activePage(document);
  const box = boundsOf(page.nodes) ?? { x: 0, y: 0, width: page.canvas.width, height: page.canvas.height };
  fitBox(box);
}

/** Fit the current selection into view. */
export function zoomToSelection(): void {
  const { document, selectedIds } = useEditorStore.getState();
  const nodes = activePage(document).nodes;
  const picked = selectedIds.map((id) => findNode(nodes, id)).filter((n): n is SceneNode => Boolean(n));
  const box = boundsOf(picked);
  if (box) fitBox(box);
  else zoomToFit();
}
