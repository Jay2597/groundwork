import type { Interaction, PrototypeEasing, PrototypeTransition, SceneNode } from "@/types/document";

// Prototype interactions resolved for present mode. A node's legacy `link` is
// treated as a single instant click interaction for backward compatibility.

export function interactionsOf(node: SceneNode): Interaction[] {
  if (node.interactions && node.interactions.length) return node.interactions;
  if (node.link) {
    return [{ trigger: "click", target: node.link, transition: "instant", duration: 0, easing: "linear" }];
  }
  return [];
}

/** First click interaction (the hotspot navigation), if any. */
export function clickInteraction(node: SceneNode): Interaction | undefined {
  return interactionsOf(node).find((i) => i.trigger === "click");
}

/** First after-delay interaction (auto-advance), if any. */
export function delayInteraction(node: SceneNode): Interaction | undefined {
  return interactionsOf(node).find((i) => i.trigger === "after-delay");
}

/** Whether a node is an interactive hotspot in present mode. */
export function isHotspot(node: SceneNode): boolean {
  return clickInteraction(node) !== undefined;
}

/** Map an easing token to a CSS timing function. */
export function cssEasing(easing: PrototypeEasing): string {
  switch (easing) {
    case "ease-in":
      return "cubic-bezier(0.42, 0, 1, 1)";
    case "ease-out":
      return "cubic-bezier(0, 0, 0.58, 1)";
    case "ease-in-out":
      return "cubic-bezier(0.42, 0, 0.58, 1)";
    default:
      return "linear";
  }
}

/** The CSS animation name used for a transition (matches present.css keyframes). */
export function transitionAnimation(transition: PrototypeTransition): string | null {
  switch (transition) {
    case "dissolve":
    case "smart-animate":
      return "present-dissolve";
    case "slide-left":
      return "present-slide-left";
    case "slide-right":
      return "present-slide-right";
    default:
      return null;
  }
}

export const DEFAULT_INTERACTION: Omit<Interaction, "target"> = {
  trigger: "click",
  transition: "dissolve",
  duration: 300,
  easing: "ease-out",
};
