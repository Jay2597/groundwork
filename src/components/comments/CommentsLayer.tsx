import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { activePage } from "@/types/document";
import "./comments.css";

/**
 * HTML overlay of pinned local notes, positioned over the canvas via the
 * current viewport transform. Notes live in the document, on-device only.
 */
export function CommentsLayer() {
  const comments = useEditorStore((s) => activePage(s.document).comments);
  const viewport = useEditorStore((s) => s.viewport);
  const updateComment = useEditorStore((s) => s.updateComment);
  const deleteComment = useEditorStore((s) => s.deleteComment);
  const commentMode = useUiStore((s) => s.commentMode);
  const [openId, setOpenId] = useState<string | null>(null);

  if (comments.length === 0 && !commentMode) return null;

  return (
    <div className={`comments-layer${commentMode ? " active" : ""}`}>
      {comments.map((c) => {
        const left = c.x * viewport.scale + viewport.x;
        const top = c.y * viewport.scale + viewport.y;
        const isOpen = openId === c.id;
        return (
          <div key={c.id} className="comment" style={{ left, top }}>
            <button
              className={`comment-pin${c.resolved ? " resolved" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenId(isOpen ? null : c.id);
              }}
              title={c.text || "Empty note"}
            >
              {c.resolved ? "✓" : "💬"}
            </button>
            {isOpen && (
              <div className="comment-pop" onClick={(e) => e.stopPropagation()}>
                <textarea
                  autoFocus
                  className="comment-text"
                  placeholder="Write a note…"
                  value={c.text}
                  onChange={(e) => updateComment(c.id, { text: e.target.value })}
                />
                <div className="comment-actions">
                  <button onClick={() => updateComment(c.id, { resolved: !c.resolved })}>
                    {c.resolved ? "Reopen" : "Resolve"}
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      deleteComment(c.id);
                      setOpenId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
