import { activePage } from "@/types/document";
import { useEditorStore } from "@/store/editorStore";
import { createImage } from "@/lib/nodeFactory";
import { countNodes, frameAtPoint } from "@/lib/tree";
import { getStage } from "@/lib/stageRegistry";
import { fileToPlacedImage, pickImageFile, type PlacedImage } from "@/lib/image";

/** Place an already-decoded image centered on a document point. */
export function placeImageAt(placed: PlacedImage, docX: number, docY: number): void {
  const store = useEditorStore.getState();
  const nodes = activePage(store.document).nodes;
  const count = countNodes(nodes) + 1;
  const box = {
    x: Math.round(docX - placed.width / 2),
    y: Math.round(docY - placed.height / 2),
    width: placed.width,
    height: placed.height,
  };
  const frame = frameAtPoint(nodes, docX, docY);
  const local = frame ? { ...box, x: box.x - frame.x, y: box.y - frame.y } : box;
  const node = createImage(local, placed.fill, count);
  store.addNode(node, frame?.id);
  store.select([node.id]);
}

/** Center of the visible canvas in document coordinates. */
function viewCenter(): { x: number; y: number } {
  const stage = getStage();
  if (!stage) return { x: 0, y: 0 };
  return stage
    .getAbsoluteTransform()
    .copy()
    .invert()
    .point({ x: stage.width() / 2, y: stage.height() / 2 });
}

/** Pick an image from disk and drop it into the center of the canvas. */
export async function insertImageFromPicker(): Promise<void> {
  const file = await pickImageFile();
  if (!file) return;
  const placed = await fileToPlacedImage(file);
  if (!placed) return;
  const center = viewCenter();
  placeImageAt(placed, center.x, center.y);
}
