import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import "./contextmenu.css";

interface Item {
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
}

/** Right-click menu for the canvas and layers. Closes on any outside click / Escape. */
export function ContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const close = useUiStore((s) => s.closeContextMenu);

  const store = useEditorStore;

  useEffect(() => {
    if (!menu.open) return;
    const onDown = () => close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu.open, close]);

  if (!menu.open) return null;

  const s = store.getState();
  const hasSelection = s.selectedIds.length > 0;
  const hasClipboard = s.clipboard.length > 0;

  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  const nodeItems: Item[] = [
    { label: "Copy", shortcut: "Ctrl+C", onClick: run(s.copySelected) },
    { label: "Duplicate", shortcut: "Ctrl+D", onClick: run(s.duplicateSelected) },
    { label: "Paste", shortcut: "Ctrl+V", onClick: run(s.paste) },
    { label: "Bring to front", shortcut: "]", onClick: run(() => s.reorderSelected("front")) },
    { label: "Send to back", shortcut: "[", onClick: run(() => s.reorderSelected("back")) },
    { label: "Group", shortcut: "Ctrl+G", onClick: run(s.groupSelected) },
    { label: "Make component", onClick: run(s.createComponentFromSelection) },
    { label: "Delete", shortcut: "Del", onClick: run(s.deleteSelected), danger: true },
  ];

  const canvasItems: Item[] = [
    { label: "Paste", shortcut: "Ctrl+V", onClick: run(s.paste) },
    { label: "Select all", shortcut: "Ctrl+A", onClick: run(s.selectAll) },
  ];

  const items = (menu.target === "node" && hasSelection ? nodeItems : canvasItems).filter(
    (it) => it.label !== "Paste" || hasClipboard,
  );

  return (
    <div
      className="ctx-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <button
          key={it.label}
          role="menuitem"
          className={`ctx-item${it.danger ? " danger" : ""}`}
          onClick={it.onClick}
        >
          <span>{it.label}</span>
          {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
