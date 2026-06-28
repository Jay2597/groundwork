import type { TextNode } from "@/types/document";

/** Apply a text node's letter-case transform to its raw text. */
export function displayText(node: TextNode): string {
  switch (node.textCase) {
    case "upper":
      return node.text.toUpperCase();
    case "lower":
      return node.text.toLowerCase();
    default:
      return node.text;
  }
}

/** Map our decoration value to a CSS `text-decoration-line` value. */
export function decorationCss(node: TextNode): string | undefined {
  if (!node.textDecoration || node.textDecoration === "none") return undefined;
  return node.textDecoration;
}
