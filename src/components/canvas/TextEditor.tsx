import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { activePage, type TextNode } from "@/types/document";
import { findNode, findSiblings, offsetOf } from "@/lib/tree";
import "./texteditor.css";

/**
 * Inline text editing: an HTML textarea positioned over the canvas via the
 * viewport transform, matching the node's font. Commits on blur / Escape.
 */
export function TextEditor() {
  const editingId = useUiStore((s) => s.editingTextId);
  const setEditingTextId = useUiStore((s) => s.setEditingTextId);
  const document = useEditorStore((s) => s.document);
  const viewport = useEditorStore((s) => s.viewport);
  const updateNode = useEditorStore((s) => s.updateNode);
  const ref = useRef<HTMLTextAreaElement>(null);

  const nodes = activePage(document).nodes;
  const node = editingId ? findNode(nodes, editingId) : undefined;

  useEffect(() => {
    if (node && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node || node.type !== "text") return null;
  const text = node as TextNode;

  // Absolute document position (account for parent frame/group offset).
  const loc = findSiblings(nodes, text.id);
  const parentOffset = loc?.parent ? offsetOf(nodes, loc.parent.id) ?? { x: 0, y: 0 } : { x: 0, y: 0 };
  const absX = parentOffset.x + text.x;
  const absY = parentOffset.y + text.y;
  const { scale, x: vx, y: vy } = viewport;

  const style: React.CSSProperties = {
    left: absX * scale + vx,
    top: absY * scale + vy,
    width: Math.max(text.width, 40) * scale,
    fontSize: text.fontSize * scale,
    fontFamily: text.fontFamily,
    fontWeight: text.fontStyle === "bold" ? 700 : 400,
    fontStyle: text.fontStyle === "italic" ? "italic" : "normal",
    lineHeight: text.lineHeight ?? 1.2,
    letterSpacing: text.letterSpacing ? text.letterSpacing * scale : undefined,
    textAlign: text.align ?? "left",
    color: text.fill,
  };

  return (
    <textarea
      ref={ref}
      className="text-editor"
      style={style}
      value={text.text}
      onChange={(e) => updateNode(text.id, { text: e.target.value })}
      onBlur={() => setEditingTextId(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditingTextId(null);
        }
        e.stopPropagation(); // don't trigger global shortcuts while typing
      }}
    />
  );
}
