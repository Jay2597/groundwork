import { useState, type DragEvent as ReactDragEvent } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { activePage, isContainer, type SceneNode } from "@/types/document";
import { IcChevronLeft, IcEye, IcEyeOff, IcLock, IcUnlock } from "@/components/ui/Icons";
import "./layers.css";

const TYPE_ICON: Record<SceneNode["type"], string> = {
  frame: "▤",
  group: "⊞",
  boolean: "◑",
  rect: "▭",
  ellipse: "◯",
  image: "▦",
  path: "✎",
  text: "T",
};

type Tab = "layers" | "assets";

export function LayersPanel() {
  const [tab, setTab] = useState<Tab>("layers");
  const nodes = useEditorStore((s) => activePage(s.document).nodes);

  // Top-most first (reverse of paint order).
  const ordered = [...nodes].reverse();

  const toggleLeft = useUiStore((s) => s.toggleLeft);

  return (
    <aside className="panel l" aria-label="Layers">
      <div className="tabs">
        <button className={`tab${tab === "layers" ? " active" : ""}`} onClick={() => setTab("layers")}>Layers</button>
        <button className={`tab${tab === "assets" ? " active" : ""}`} onClick={() => setTab("assets")}>Assets</button>
        <button className="panel-collapse" onClick={toggleLeft} title="Collapse panel" aria-label="Collapse layers panel">
          <IcChevronLeft />
        </button>
      </div>

      <PagesSection />

      {tab === "layers" ? (
        <>
          <div className="sec-label">LAYERS</div>
          <div className="layers-list scroll">
            {ordered.length === 0 && (
              <p className="layers-empty">No layers yet. Press F for a frame, or R / O / T to draw.</p>
            )}
            {ordered.map((node) => (
              <LayerItem key={node.id} node={node} depth={0} parentId={null} />
            ))}
          </div>
        </>
      ) : (
        <AssetsTab />
      )}

      <div className="panel-foot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9" /></svg>
        Local history · on disk
      </div>
    </aside>
  );
}

function PagesSection() {
  const pages = useEditorStore((s) => s.document.pages);
  const activeId = useEditorStore((s) => s.document.activePageId);
  const setActivePage = useEditorStore((s) => s.setActivePage);
  const addPage = useEditorStore((s) => s.addPage);
  const deletePage = useEditorStore((s) => s.deletePage);
  const renamePage = useEditorStore((s) => s.renamePage);
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <>
      <div className="sec-label">
        PAGES
        <button className="sec-add" title="Add page" aria-label="Add page" onClick={addPage}>+</button>
      </div>
      <div className="pages-list">
        {pages.map((p) => (
          <div
            key={p.id}
            className={`page-item${p.id === activeId ? " active" : ""}`}
            onClick={() => setActivePage(p.id)}
            onDoubleClick={() => setRenaming(p.id)}
          >
            <span className="page-dot" />
            {renaming === p.id ? (
              <input
                className="page-rename"
                autoFocus
                defaultValue={p.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => { renamePage(p.id, e.target.value.trim() || p.name); setRenaming(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { renamePage(p.id, e.currentTarget.value.trim() || p.name); setRenaming(null); }
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <span className="page-name">{p.name}</span>
            )}
            {pages.length > 1 && (
              <button
                className="page-del"
                title="Delete page"
                aria-label={`Delete ${p.name}`}
                onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function AssetsTab() {
  const components = useEditorStore((s) => s.document.components);
  const colors = useEditorStore((s) => s.document.styles.colors);
  const texts = useEditorStore((s) => s.document.styles.texts);
  const insertInstance = useEditorStore((s) => s.insertInstance);
  const deleteComponent = useEditorStore((s) => s.deleteComponent);
  const deleteColorStyle = useEditorStore((s) => s.deleteColorStyle);
  const deleteTextStyle = useEditorStore((s) => s.deleteTextStyle);
  const updateNode = useEditorStore((s) => s.updateNode);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  function applyColor(value: string) {
    for (const id of selectedIds) updateNode(id, { fill: value });
  }

  return (
    <div className="assets scroll">
      <div className="sec-label">COMPONENTS</div>
      {components.length === 0 ? (
        <p className="layers-empty">Select a layer and choose “Make component”.</p>
      ) : (
        <div className="asset-grid">
          {components.map((c) => (
            <div key={c.id} className="asset-chip" onClick={() => insertInstance(c.id)} title={`Insert ${c.name}`}>
              <span className="asset-glyph">◈</span>
              <span className="asset-name">{c.name}</span>
              <button className="asset-del" aria-label={`Delete ${c.name}`} onClick={(e) => { e.stopPropagation(); deleteComponent(c.id); }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="sec-label">COLOR STYLES</div>
      {colors.length === 0 ? (
        <p className="layers-empty">No color styles yet.</p>
      ) : (
        <div className="swatch-list">
          {colors.map((c) => (
            <div key={c.id} className="swatch-row" onClick={() => applyColor(c.value)} title={`Apply ${c.name}`}>
              <span className="swatch" style={{ background: c.value }} />
              <span className="swatch-name">{c.name}</span>
              <button className="asset-del" aria-label={`Delete ${c.name}`} onClick={(e) => { e.stopPropagation(); deleteColorStyle(c.id); }}>×</button>
            </div>
          ))}
        </div>
      )}

      {texts.length > 0 && (
        <>
          <div className="sec-label">TEXT STYLES</div>
          <div className="swatch-list">
            {texts.map((t) => (
              <div key={t.id} className="swatch-row" title={t.name}>
                <span className="swatch-name" style={{ fontWeight: t.fontStyle === "bold" ? 700 : 400 }}>{t.name}</span>
                <span className="swatch-dim">{t.fontSize}px</span>
                <button className="asset-del" aria-label={`Delete ${t.name}`} onClick={() => deleteTextStyle(t.id)}>×</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LayerItem({ node, depth, parentId }: { node: SceneNode; depth: number; parentId: string | null }) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const updateNode = useEditorStore((s) => s.updateNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const [drop, setDrop] = useState<"before" | "inside" | null>(null);

  const active = selectedIds.includes(node.id);
  const container = isContainer(node);

  function onDragOver(e: ReactDragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientY - rect.top) / rect.height;
    setDrop(container && rel > 0.3 && rel < 0.85 ? "inside" : "before");
  }

  function onDrop(e: ReactDragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const dragId = e.dataTransfer.getData("text/layer-id");
    setDrop(null);
    if (!dragId || dragId === node.id) return;
    if (drop === "inside") moveNode(dragId, node.id, null);
    else moveNode(dragId, parentId, node.id);
  }

  return (
    <>
      <div
        className={`layer${active ? " active" : ""}${node.locked ? " locked" : ""}${drop ? ` drop-${drop}` : ""}`}
        style={{ paddingLeft: 8 + depth * 18 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/layer-id", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={onDragOver}
        onDragLeave={() => setDrop(null)}
        onDrop={onDrop}
        onClick={(e) => (e.shiftKey ? toggleSelect(node.id) : select([node.id]))}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!selectedIds.includes(node.id)) select([node.id]);
          openContextMenu(e.clientX, e.clientY, "node");
        }}
      >
        <span className="layer-icon" aria-hidden>{TYPE_ICON[node.type]}</span>
        <span className="layer-name">{node.name}</span>
        <button
          className={`layer-toggle${node.locked ? " shown" : ""}`}
          title={node.locked ? "Unlock" : "Lock"}
          aria-label={node.locked ? "Unlock layer" : "Lock layer"}
          aria-pressed={node.locked}
          onClick={(e) => {
            e.stopPropagation();
            updateNode(node.id, { locked: !node.locked });
          }}
        >
          {node.locked ? <IcLock /> : <IcUnlock />}
        </button>
        <button
          className={`layer-toggle${!node.visible ? " shown" : ""}`}
          title={node.visible ? "Hide" : "Show"}
          aria-label={node.visible ? "Hide layer" : "Show layer"}
          aria-pressed={!node.visible}
          onClick={(e) => {
            e.stopPropagation();
            updateNode(node.id, { visible: !node.visible });
          }}
        >
          {node.visible ? <IcEye /> : <IcEyeOff />}
        </button>
      </div>

      {isContainer(node) &&
        [...node.children]
          .reverse()
          .map((child) => <LayerItem key={child.id} node={child} depth={depth + 1} parentId={node.id} />)}
    </>
  );
}
