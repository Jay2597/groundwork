import type { BlendMode, Effect, SceneNode } from "@/types/document";

// Pure helpers that translate the effect/blend model into Konva props, CSS, and
// SVG — shared by the canvas renderer and exporters. A node's legacy single
// `shadow` is treated as one drop-shadow effect for backward compatibility.

export function effectsOf(node: SceneNode): Effect[] {
  if (node.effects && node.effects.length) return node.effects;
  if (node.shadow) {
    return [{ type: "drop-shadow", color: node.shadow.color, blur: node.shadow.blur, offsetX: node.shadow.offsetX, offsetY: node.shadow.offsetY }];
  }
  return [];
}

/** First drop-shadow as Konva shadow props (Konva supports one shadow per node). */
export function dropShadowKonva(node: SceneNode): Record<string, unknown> {
  const ds = effectsOf(node).find((e) => e.type === "drop-shadow");
  if (!ds || ds.type !== "drop-shadow") return { shadowEnabled: false };
  return {
    shadowColor: ds.color,
    shadowBlur: ds.blur,
    shadowOffsetX: ds.offsetX,
    shadowOffsetY: ds.offsetY,
    shadowEnabled: true,
  };
}

/** Total layer-blur radius (sums any blur effects). */
export function layerBlurRadius(node: SceneNode): number {
  return effectsOf(node).reduce((sum, e) => (e.type === "layer-blur" ? sum + e.radius : sum), 0);
}

/** Konva canvas composite-operation for a blend mode. */
export function blendModeKonva(node: SceneNode): string | undefined {
  const m = node.blendMode;
  if (!m || m === "normal") return undefined;
  return m; // canvas globalCompositeOperation names match CSS blend names
}

/** CSS `box-shadow` for drop + inner shadow effects (inner uses `inset`). */
export function effectsToBoxShadow(node: SceneNode): string | undefined {
  const parts = effectsOf(node)
    .map((e) => {
      if (e.type === "drop-shadow") return `${e.offsetX}px ${e.offsetY}px ${e.blur}px ${e.color}`;
      if (e.type === "inner-shadow") return `inset ${e.offsetX}px ${e.offsetY}px ${e.blur}px ${e.color}`;
      return null;
    })
    .filter((p): p is string => p !== null);
  return parts.length ? parts.join(", ") : undefined;
}

/** CSS `filter: blur()` value when the node has any layer-blur effect. */
export function effectsToCssFilter(node: SceneNode): string | undefined {
  const r = layerBlurRadius(node);
  return r > 0 ? `blur(${r}px)` : undefined;
}

export function blendModeCss(node: SceneNode): string | undefined {
  return node.blendMode && node.blendMode !== "normal" ? node.blendMode : undefined;
}

export const BLEND_MODES: BlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "soft-light",
  "hard-light",
  "difference",
  "exclusion",
];
