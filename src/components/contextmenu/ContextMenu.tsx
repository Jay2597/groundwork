import { useEffect, useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { activePage, isContainer } from "@/types/document";
import { findNode } from "@/lib/tree";
import "./contextmenu.css";

interface Item {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  danger?: boolean;
  children?: Item[];
}

/** Right-click menu for the canvas and layers. Selection-aware, with submenus. */
export function ContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const close = useUiStore((s) => s.closeContextMenu);
  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    if (!menu.open) return;
    setOpenSub(null);
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

  const s = useEditorStore.getState();
  const ids = s.selectedIds;
  const hasClipboard = s.clipboard.length > 0;
  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  const items = buildItems(menu.target, ids, hasClipboard, s, run);

  return (
    <div
      className="ctx-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((it, i) =>
        it.label === "—" ? (
          <div key={`sep-${i}`} className="ctx-sep" />
        ) : it.children ? (
          <div
            key={it.label}
            className="ctx-item has-sub"
            onMouseEnter={() => setOpenSub(it.label)}
            onMouseLeave={() => setOpenSub((c) => (c === it.label ? null : c))}
          >
            <span>{it.label}</span>
            <span className="ctx-arrow">›</span>
            {openSub === it.label && (
              <div className="ctx-submenu" role="menu">
                {it.children.map((c, ci) =>
                  c.label === "—" ? (
                    <div key={`s-${ci}`} className="ctx-sep" />
                  ) : (
                    <button key={c.label} role="menuitem" className="ctx-item" onClick={c.onClick}>
                      <span>{c.label}</span>
                      {c.shortcut && <span className="ctx-shortcut">{c.shortcut}</span>}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            key={it.label}
            role="menuitem"
            className={`ctx-item${it.danger ? " danger" : ""}`}
            onClick={it.onClick}
          >
            <span>{it.label}</span>
            {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}

const SEP: Item = { label: "—" };

function buildItems(
  target: "canvas" | "node",
  ids: string[],
  hasClipboard: boolean,
  s: ReturnType<typeof useEditorStore.getState>,
  run: (fn: () => void) => () => void,
): Item[] {
  if (target === "canvas" || ids.length === 0) {
    const items: Item[] = [{ label: "Select all", shortcut: "Ctrl+A", onClick: run(s.selectAll) }];
    if (hasClipboard) items.unshift({ label: "Paste", shortcut: "Ctrl+V", onClick: run(s.paste) });
    return items;
  }

  const booleanSub: Item = {
    label: "Boolean",
    children: [
      { label: "Union", onClick: run(() => s.booleanSelected("union")) },
      { label: "Subtract", onClick: run(() => s.booleanSelected("subtract")) },
      { label: "Intersect", onClick: run(() => s.booleanSelected("intersect")) },
      { label: "Exclude", onClick: run(() => s.booleanSelected("exclude")) },
    ],
  };
  const alignSub: Item = {
    label: "Align",
    children: [
      { label: "Left", onClick: run(() => s.alignSelected("left")) },
      { label: "Horizontal centers", onClick: run(() => s.alignSelected("hcenter")) },
      { label: "Right", onClick: run(() => s.alignSelected("right")) },
      { label: "Top", onClick: run(() => s.alignSelected("top")) },
      { label: "Vertical centers", onClick: run(() => s.alignSelected("vcenter")) },
      { label: "Bottom", onClick: run(() => s.alignSelected("bottom")) },
      SEP,
      { label: "Distribute horizontally", onClick: run(() => s.distributeSelected("h")) },
      { label: "Distribute vertically", onClick: run(() => s.distributeSelected("v")) },
    ],
  };

  if (ids.length > 1) {
    return [
      { label: "Copy", shortcut: "Ctrl+C", onClick: run(s.copySelected) },
      { label: "Duplicate", shortcut: "Ctrl+D", onClick: run(s.duplicateSelected) },
      SEP,
      { label: "Group selection", shortcut: "Ctrl+G", onClick: run(s.groupSelected) },
      { label: "Frame selection", shortcut: "Ctrl+Alt+G", onClick: run(s.frameSelection) },
      { label: "Create component", onClick: run(s.createComponentFromSelection) },
      booleanSub,
      { label: "Flatten", shortcut: "Ctrl+E", onClick: run(s.flattenSelected) },
      alignSub,
      SEP,
      { label: "Delete", shortcut: "Del", onClick: run(s.deleteSelected), danger: true },
    ];
  }

  // Single selection
  const node = findNode(activePage(s.document).nodes, ids[0]);
  const container = node ? isContainer(node) : false;
  const items: Item[] = [
    { label: "Copy", shortcut: "Ctrl+C", onClick: run(s.copySelected) },
    { label: "Duplicate", shortcut: "Ctrl+D", onClick: run(s.duplicateSelected) },
  ];
  if (hasClipboard) items.push({ label: "Paste", shortcut: "Ctrl+V", onClick: run(s.paste) });
  items.push(
    SEP,
    { label: "Bring to front", shortcut: "]", onClick: run(() => s.reorderSelected("front")) },
    { label: "Send to back", shortcut: "[", onClick: run(() => s.reorderSelected("back")) },
    SEP,
    { label: "Create component", onClick: run(s.createComponentFromSelection) },
  );
  if (container) items.push({ label: "Ungroup", shortcut: "Ctrl+Shift+G", onClick: run(s.ungroupSelected) });
  if (node && (node.type === "boolean" || node.type === "group")) {
    items.push({ label: "Flatten", shortcut: "Ctrl+E", onClick: run(s.flattenSelected) });
  }
  items.push(SEP, { label: "Delete", shortcut: "Del", onClick: run(s.deleteSelected), danger: true });
  return items;
}
