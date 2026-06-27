import type Konva from "konva";

// Tiny registry so non-canvas UI (e.g. the export menu) can reach the live
// Konva stage for raster export without prop-drilling a ref through the tree.

let currentStage: Konva.Stage | null = null;

export function registerStage(stage: Konva.Stage | null): void {
  currentStage = stage;
}

export function getStage(): Konva.Stage | null {
  return currentStage;
}
