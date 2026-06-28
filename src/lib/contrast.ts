// WCAG color-contrast math. Pure and dependency-free: parse a CSS hex color,
// compute relative luminance, the contrast ratio between two colors, and the
// WCAG conformance level for a given text size.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse #rgb, #rgba, #rrggbb, or #rrggbbaa into 0–255 channels (alpha ignored). */
export function parseHex(hex: string): Rgb | null {
  const m = hex.trim().replace(/^#/, "");
  let r: number;
  let g: number;
  let b: number;
  if (m.length === 3 || m.length === 4) {
    r = parseInt(m[0] + m[0], 16);
    g = parseInt(m[1] + m[1], 16);
    b = parseInt(m[2] + m[2], 16);
  } else if (m.length === 6 || m.length === 8) {
    r = parseInt(m.slice(0, 2), 16);
    g = parseInt(m.slice(2, 4), 16);
    b = parseInt(m.slice(4, 6), 16);
  } else {
    return null;
  }
  if ([r, g, b].some((c) => Number.isNaN(c))) return null;
  return { r, g, b };
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0–1) of an RGB color. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG contrast ratio (1–21) between two hex colors; null if either is unparseable. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

export type WcagLevel = "AAA" | "AA" | "fail";

/** "Large text" per WCAG: >= 24px, or >= 18.66px when bold. */
export function isLargeText(fontSizePx: number, bold: boolean): boolean {
  return fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
}

/** The best WCAG level a ratio achieves for the given text size. */
export function wcagLevel(ratio: number, fontSizePx: number, bold: boolean): WcagLevel {
  const large = isLargeText(fontSizePx, bold);
  const aa = large ? 3 : 4.5;
  const aaa = large ? 4.5 : 7;
  if (ratio >= aaa) return "AAA";
  if (ratio >= aa) return "AA";
  return "fail";
}
