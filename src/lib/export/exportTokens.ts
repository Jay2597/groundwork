import type { GroundworkDocument } from "@/types/document";
import { variableValue } from "@/lib/variables";

// Export the document's design variables and styles as W3C Design Tokens JSON
// (https://www.w3.org/community/design-tokens/) — colors, dimensions, and
// typography — so a codebase can consume them via Style Dictionary etc. Values
// use the active variable mode. Generated entirely on-device.

type TokenValue = string | number | Record<string, string | number>;
interface Token {
  $type: string;
  $value: TokenValue;
}
export type TokenGroup = Record<string, Token | Record<string, Token>>;

function key(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "token"
  );
}

/** Build a W3C design-tokens object from the document's variables + styles. */
export function documentToTokens(doc: GroundworkDocument): Record<string, TokenGroup> {
  const out: Record<string, TokenGroup> = {};
  const color: TokenGroup = {};
  const dimension: TokenGroup = {};
  const typography: TokenGroup = {};

  const vars = doc.variables;
  if (vars) {
    for (const v of vars.variables) {
      const value = variableValue(vars, v.id);
      if (value === undefined) continue;
      if (v.type === "color" && typeof value === "string") {
        color[key(v.name)] = { $type: "color", $value: value };
      } else if (v.type === "number" && typeof value === "number") {
        dimension[key(v.name)] = { $type: "dimension", $value: `${value}px` };
      }
    }
  }

  for (const c of doc.styles.colors) {
    color[key(c.name)] = { $type: "color", $value: c.value };
  }

  for (const t of doc.styles.texts) {
    typography[key(t.name)] = {
      $type: "typography",
      $value: {
        fontFamily: t.fontFamily,
        fontSize: `${t.fontSize}px`,
        fontWeight: t.fontStyle === "bold" ? 700 : 400,
        ...(t.lineHeight ? { lineHeight: t.lineHeight } : {}),
        ...(t.letterSpacing ? { letterSpacing: `${t.letterSpacing}px` } : {}),
      },
    };
  }

  if (Object.keys(color).length) out.color = color;
  if (Object.keys(dimension).length) out.dimension = dimension;
  if (Object.keys(typography).length) out.typography = typography;
  return out;
}

export function tokensJson(doc: GroundworkDocument): string {
  return JSON.stringify(documentToTokens(doc), null, 2);
}

export function downloadTokens(doc: GroundworkDocument): void {
  const blob = new Blob([tokensJson(doc)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name}.tokens.json`;
  a.click();
  URL.revokeObjectURL(url);
}
