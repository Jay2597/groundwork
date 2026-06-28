import { describe, expect, test } from "vitest";
import { documentToTokens } from "./exportTokens";
import { createEmptyDocument } from "@/types/document";
import { createVariableCollection, newVariable } from "@/lib/variables";

function doc() {
  const d = createEmptyDocument("T");
  const coll = createVariableCollection();
  const mode = coll.modes[0].id;
  coll.variables.push(newVariable("color", "Brand Primary", [mode], "#f2a33c"));
  coll.variables.push(newVariable("number", "Space M", [mode], 16));
  d.variables = coll;
  d.styles.colors.push({ id: "c1", name: "Accent", value: "#ff0000" });
  d.styles.texts.push({ id: "t1", name: "Heading", fontSize: 24, fontFamily: "IBM Plex Sans", fontStyle: "bold", lineHeight: 1.2 });
  return d;
}

describe("documentToTokens", () => {
  test("exports color variables as color tokens", () => {
    const tokens = documentToTokens(doc());
    expect(tokens.color["brand-primary"]).toEqual({ $type: "color", $value: "#f2a33c" });
  });

  test("exports number variables as dimension tokens with px", () => {
    const tokens = documentToTokens(doc());
    expect(tokens.dimension["space-m"]).toEqual({ $type: "dimension", $value: "16px" });
  });

  test("exports color styles", () => {
    const tokens = documentToTokens(doc());
    expect(tokens.color["accent"]).toEqual({ $type: "color", $value: "#ff0000" });
  });

  test("exports text styles as typography tokens", () => {
    const tokens = documentToTokens(doc());
    expect(tokens.typography["heading"]).toMatchObject({
      $type: "typography",
      $value: { fontFamily: "IBM Plex Sans", fontSize: "24px", fontWeight: 700, lineHeight: 1.2 },
    });
  });

  test("omits empty groups", () => {
    const tokens = documentToTokens(createEmptyDocument("empty"));
    expect(tokens.color).toBeUndefined();
    expect(tokens.dimension).toBeUndefined();
  });
});
