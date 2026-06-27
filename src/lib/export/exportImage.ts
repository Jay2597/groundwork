import type Konva from "konva";
import type { SceneNode } from "@/types/document";
import type { Viewport } from "@/types/editor";

// Raster export straight from the Konva stage — runs entirely on the client.

type Stage = Konva.Stage;

const THUMB_MAX = 320;

interface ExportOptions {
  pixelRatio?: number;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  fileName?: string;
}

export function exportStageAsImage(
  stage: Stage,
  options: ExportOptions = {},
): void {
  const {
    pixelRatio = 2,
    mimeType = "image/png",
    fileName = "groundwork-export",
  } = options;

  const ext = mimeType.split("/")[1];
  const dataUrl = stage.toDataURL({ pixelRatio, mimeType });
  triggerDownload(dataUrl, `${fileName}.${ext}`);
}

/** Export a document-space rectangle (e.g. a frame) as a PNG download. */
export function exportRegionAsImage(
  stage: Stage,
  docBox: { x: number; y: number; width: number; height: number },
  viewport: Viewport,
  fileName: string,
  pixelRatio = 2,
): void {
  const { scale, x: vx, y: vy } = viewport;
  const crop = {
    x: docBox.x * scale + vx,
    y: docBox.y * scale + vy,
    width: docBox.width * scale,
    height: docBox.height * scale,
  };
  // Normalize so the PNG renders at 1:1 document pixels × pixelRatio.
  const dataUrl = stage.toDataURL({ ...crop, pixelRatio: (pixelRatio / scale), mimeType: "image/png" });
  triggerDownload(dataUrl, `${fileName}.png`);
}

function triggerDownload(href: string, name: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

/**
 * Capture a small PNG preview of a page's content for the Home browser.
 * Returns undefined when the page is empty. Crops to the content bounds so the
 * thumbnail is independent of the current zoom / pan.
 */
export function captureThumbnail(
  stage: Stage,
  nodes: SceneNode[],
  viewport: Viewport,
): string | undefined {
  if (nodes.length === 0) return undefined;
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  const docW = Math.max(1, maxX - minX);
  const docH = Math.max(1, maxY - minY);

  const { scale, x: vx, y: vy } = viewport;
  const crop = {
    x: minX * scale + vx,
    y: minY * scale + vy,
    width: docW * scale,
    height: docH * scale,
  };
  const pixelRatio = Math.min(1, THUMB_MAX / Math.max(docW, docH) / scale);

  try {
    return stage.toDataURL({ ...crop, pixelRatio, mimeType: "image/png" });
  } catch {
    return undefined;
  }
}
