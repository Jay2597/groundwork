import { describe, expect, test } from "vitest";
import { regionToSvg } from "./exportSvg";
import { createEmptyDocument, type RectNode } from "@/types/document";

function docWithRect(): ReturnType<typeof createEmptyDocument> {
  const doc = createEmptyDocument("T");
  const rect: RectNode = {
    id: "r",
    type: "rect",
    name: "r",
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    rotation: 0,
    fill: "#ff0000",
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
  };
  doc.pages[0].nodes = [rect];
  return doc;
}

describe("regionToSvg", () => {
  test("sets the viewBox to the slice region", () => {
    const svg = regionToSvg(docWithRect(), { x: 40, y: 40, width: 80, height: 80 });
    expect(svg).toContain('viewBox="40 40 80 80"');
    expect(svg).toContain('width="80"');
    expect(svg).toContain('height="80"');
  });

  test("includes node geometry inside the region", () => {
    const svg = regionToSvg(docWithRect(), { x: 0, y: 0, width: 200, height: 200 });
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain("<rect");
  });

  test("rounds fractional sizes", () => {
    const svg = regionToSvg(docWithRect(), { x: 0, y: 0, width: 99.6, height: 50.2 });
    expect(svg).toContain('width="100"');
    expect(svg).toContain('height="50"');
  });
});
