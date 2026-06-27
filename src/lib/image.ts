import type { ImageFill } from "@/types/document";

/** Max placed-image dimension so huge photos don't dwarf the canvas. */
const MAX_PLACED = 800;

export interface PlacedImage {
  fill: ImageFill;
  width: number;
  height: number;
}

const isSvg = (file: File) => file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

/** Read a dropped/picked image (incl. SVG) into a data URL + natural dimensions. */
export async function fileToPlacedImage(file: File): Promise<PlacedImage | null> {
  if (!file.type.startsWith("image/") && !isSvg(file)) return null;

  if (isSvg(file)) {
    const text = await file.text();
    const { width, height } = parseSvgSize(text);
    const src = `data:image/svg+xml;utf8,${encodeURIComponent(text)}`;
    const scale = Math.min(1, MAX_PLACED / Math.max(width, height));
    return { fill: { src, fit: "contain" }, width: Math.round(width * scale), height: Math.round(height * scale) };
  }

  const src = await readAsDataUrl(file);
  let { width, height } = await measure(src);
  if (!width || !height) {
    width = 300;
    height = 200;
  }
  const scale = Math.min(1, MAX_PLACED / Math.max(width, height));
  return { fill: { src, fit: "cover" }, width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Best-effort intrinsic size of an SVG from width/height or viewBox. */
function parseSvgSize(svg: string): { width: number; height: number } {
  const widthMatch = svg.match(/<svg[^>]*\bwidth="([\d.]+)/i);
  const heightMatch = svg.match(/<svg[^>]*\bheight="([\d.]+)/i);
  if (widthMatch && heightMatch) {
    return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
  }
  const vb = svg.match(/viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)\s*"/i);
  if (vb) return { width: Number(vb[1]), height: Number(vb[2]) };
  return { width: 300, height: 200 };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(file);
  });
}

function measure(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("That image couldn't be decoded."));
    img.src = src;
  });
}

/** Open a file picker and return the first chosen image (or null if cancelled). */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.svg";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
