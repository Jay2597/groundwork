import { isContainer, type Page, type SceneNode } from "@/types/document";
import { contrastRatio, wcagLevel } from "@/lib/contrast";

// Design-lint engine: scans a page and reports quality issues — low text
// contrast (WCAG), tiny fonts, undersized interactive targets, and sub-pixel
// geometry. Pure: returns a list of issues the UI renders and links to nodes.

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  id: string;
  nodeId: string;
  nodeName: string;
  rule: string;
  severity: LintSeverity;
  message: string;
}

const MIN_FONT_PX = 10;
const MIN_TAP_PX = 24;

/** The top solid fill color of a node, or null if it has no solid fill. */
function solidFill(node: SceneNode): string | null {
  const fills = node.fills?.filter((f) => f.visible);
  if (fills && fills.length) {
    const top = fills[fills.length - 1];
    if (top.type === "solid") return top.color;
    return null; // gradient/image background — skip contrast
  }
  return typeof node.fill === "string" ? node.fill : null;
}

function isInteractive(node: SceneNode): boolean {
  return Boolean(node.link) || Boolean(node.interactions && node.interactions.length);
}

function hasFraction(...values: number[]): boolean {
  return values.some((v) => Math.abs(v - Math.round(v)) > 1e-6);
}

/** Lint a page, returning all issues found (parent fill flows down as background). */
export function lintPage(page: Page): LintIssue[] {
  const issues: LintIssue[] = [];
  let counter = 0;
  const push = (node: SceneNode, rule: string, severity: LintSeverity, message: string) => {
    issues.push({ id: `lint-${counter++}`, nodeId: node.id, nodeName: node.name, rule, severity, message });
  };

  function visit(node: SceneNode, background: string): void {
    if (!node.visible) return;

    if (hasFraction(node.x, node.y, node.width, node.height)) {
      push(node, "sub-pixel", "info", "Sub-pixel position or size — may render blurry.");
    }

    if (isInteractive(node) && (node.width < MIN_TAP_PX || node.height < MIN_TAP_PX)) {
      push(node, "tap-target", "warning", `Interactive target is smaller than ${MIN_TAP_PX}px.`);
    }

    if (node.type === "text") {
      if (node.fontSize < MIN_FONT_PX) {
        push(node, "tiny-font", "warning", `Font size ${node.fontSize}px is below ${MIN_FONT_PX}px.`);
      }
      const fg = solidFill(node);
      if (fg) {
        const ratio = contrastRatio(fg, background);
        if (ratio !== null) {
          const level = wcagLevel(ratio, node.fontSize, node.fontStyle === "bold");
          if (level === "fail") {
            push(node, "contrast", "error", `Low contrast ${ratio}:1 against its background (fails WCAG AA).`);
          }
        }
      }
    }

    if (isContainer(node)) {
      // A frame's own solid fill becomes the background for its children.
      const childBg = node.type === "frame" ? (solidFill(node) ?? background) : background;
      for (const child of node.children) visit(child, childBg);
    }
  }

  const pageBg = page.canvas.background;
  for (const node of page.nodes) visit(node, pageBg);
  return issues;
}

/** Counts of issues by severity, for the panel header. */
export function lintCounts(issues: LintIssue[]): Record<LintSeverity, number> {
  return issues.reduce(
    (acc, i) => {
      acc[i.severity]++;
      return acc;
    },
    { error: 0, warning: 0, info: 0 } as Record<LintSeverity, number>,
  );
}
