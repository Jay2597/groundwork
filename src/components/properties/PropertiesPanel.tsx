import type { ReactNode } from "react";
import { useEditorStore } from "@/store/editorStore";
import type { AlignMode } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { IcChevronRight } from "@/components/ui/Icons";
import {
  activePage,
  isFrame,
  type AutoLayout,
  type BlendMode,
  type ColorStyle,
  type Constraint,
  type Effect,
  type FrameNode,
  type Interaction,
  type LayoutGrid,
  type NodePatch,
  type Paint,
  type PrototypeAction,
  type PrototypeEasing,
  type PrototypeTransition,
  type PrototypeTrigger,
  type SceneNode,
  type SizingMode,
} from "@/types/document";
import { fillsFor } from "@/lib/paint";
import { BLEND_MODES } from "@/lib/effects";
import { variantLabel } from "@/lib/components";
import { textDescendants, toggleableChildren } from "@/lib/componentProps";
import { DEFAULT_INTERACTION } from "@/lib/prototype";
import { measureGap } from "@/lib/inspect";
import { deriveSmoothHandles } from "@/lib/bezierPath";
import { selectionBounds, commonValue, translateSelection, resizeSelection } from "@/lib/multiSelect";
import { findNode } from "@/lib/tree";
import { ColorField, MixedNumberField, NumberField, OpacityField, TextField, makeScrub } from "./PropertyInputs";
import { FramePresets } from "./FramePresets";
import {
  IcAlignBottom,
  IcAlignHCenter,
  IcAlignLeft,
  IcAlignRight,
  IcAlignTop,
  IcAlignVCenter,
  IcBackward,
  IcCorner,
  IcDistributeH,
  IcDistributeV,
  IcExclude,
  IcForward,
  IcIntersect,
  IcSubtract,
  IcToBack,
  IcToFront,
  IcUnion,
} from "@/components/ui/Icons";
import "./properties.css";

const DEFAULT_STROKE = { color: "#1a1a1a", width: 1 };
const DEFAULT_AUTOLAYOUT: AutoLayout = { direction: "row", gap: 12, padding: 16, align: "start" };
const CONSTRAINTS: Constraint[] = ["min", "center", "max", "stretch", "scale"];

export function PropertiesPanel() {
  const document = useEditorStore((s) => s.document);
  const nodes = activePage(document).nodes;
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const tool = useEditorStore((s) => s.tool);
  const updateNode = useEditorStore((s) => s.updateNode);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const groupSelected = useEditorStore((s) => s.groupSelected);
  const ungroupSelected = useEditorStore((s) => s.ungroupSelected);
  const frameSelection = useEditorStore((s) => s.frameSelection);
  const flattenSelected = useEditorStore((s) => s.flattenSelected);
  const booleanSelected = useEditorStore((s) => s.booleanSelected);
  const trueBooleanSelected = useEditorStore((s) => s.trueBooleanSelected);
  const alignSelected = useEditorStore((s) => s.alignSelected);
  const distributeSelected = useEditorStore((s) => s.distributeSelected);
  const reorderSelected = useEditorStore((s) => s.reorderSelected);
  const createComponentFromSelection = useEditorStore((s) => s.createComponentFromSelection);
  const addColorStyle = useEditorStore((s) => s.addColorStyle);
  const colorStyles = document.styles.colors;
  const frames = nodes.filter(isFrame);

  const selected = selectedIds.length === 1 ? findNode(nodes, selectedIds[0]) : undefined;

  if (selectedIds.length > 1) {
    return (
      <aside className="panel r scroll" aria-label="Properties">
        <div className="insp-head">
          <span className="insp-name">{selectedIds.length} selected</span>
          <RightCollapse />
        </div>

        <MultiSelectEditor ids={selectedIds} nodes={nodes} colorStyles={colorStyles} />

        <section className="group">
          <div className="ghead">ALIGN</div>
          <AlignToolbar align={alignSelected} distribute={distributeSelected} canDistribute={selectedIds.length > 2} />
        </section>

        {selectedIds.length === 2 && <DistanceReadout nodes={nodes} ids={selectedIds} />}

        <section className="group">
          <div className="ghead">BOOLEAN</div>
          <BooleanToolbar onOp={booleanSelected} />
          <div className="field-label" style={{ marginTop: 8 }}>True geometry (editable path)</div>
          <BooleanToolbar onOp={trueBooleanSelected} />
        </section>

        <section className="group">
          <div className="ghead">ARRANGE</div>
          <div className="arrange-grid">
            <button className="prop-btn" onClick={groupSelected}>Group</button>
            <button className="prop-btn" onClick={frameSelection}>Frame</button>
            <button className="prop-btn" onClick={createComponentFromSelection}>Component</button>
            <button className="prop-btn" onClick={flattenSelected}>Flatten</button>
            <button className="prop-btn" onClick={duplicateSelected}>Duplicate</button>
          </div>
        </section>

        <div className="prop-actions">
          <button className="prop-btn danger" onClick={deleteSelected}>Delete</button>
        </div>
      </aside>
    );
  }

  if (!selected) {
    if (tool === "frame") return <FramePresets />;
    return <CanvasProperties />;
  }

  const set = (patch: NodePatch) => updateNode(selected.id, patch);
  const isContainerType = selected.type === "group" || selected.type === "boolean";

  return (
    <aside className="panel r scroll" aria-label="Properties">
      <div className="insp-head">
        <span className="insp-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="5" width="16" height="14" rx="2" /></svg>
        </span>
        <span className="insp-name">{selected.name}</span>
        <span className="chip green" style={{ fontSize: "9px", padding: "2px 6px" }}>local</span>
        <RightCollapse />
      </div>

      <section className="group">
        <div className="ghead">TRANSFORM</div>
        <div className="grid2" style={{ marginBottom: 8 }}>
          <NumberField label="X" value={selected.x} onChange={(x) => set({ x })} />
          <NumberField label="Y" value={selected.y} onChange={(y) => set({ y })} />
          <NumberField label="W" value={selected.width} min={1} onChange={(width) => set({ width })} />
          <NumberField label="H" value={selected.height} min={1} onChange={(height) => set({ height })} />
        </div>
        <div className="grid2">
          <NumberField label="∠" value={selected.rotation} onChange={(rotation) => set({ rotation })} />
          {selected.type === "frame" && (
            <IconNumberField icon={<IcCorner />} title="Corner radius" value={selected.cornerRadius ?? 0} min={0} onChange={(cornerRadius) => set({ cornerRadius })} />
          )}
        </div>
        {selected.type === "rect" && <CornerRadiusControl node={selected} set={set} />}
        <SizingControl node={selected} set={set} />
      </section>

      <section className="group">
        <div className="ghead">APPEARANCE</div>
        <OpacityField value={selected.opacity} onChange={(opacity) => set({ opacity: clamp01(opacity) })} />
        <BlendModeControl node={selected} set={set} />
        {selected.type !== "frame" && (
          <label className="check-row" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={Boolean(selected.isMask)} onChange={(e) => set({ isMask: e.target.checked })} />
            <span>Use as mask</span>
            <span className="prop-hint" style={{ margin: 0, fontSize: 10 }}>(clips siblings in a group)</span>
          </label>
        )}
        {selected.type === "boolean" && (
          <div className="seg" style={{ marginTop: 8 }}>
            {(["union", "subtract", "intersect", "exclude"] as const).map((op) => (
              <div key={op} className={selected.op === op ? "on" : ""} onClick={() => set({ op })}>
                {op}
              </div>
            ))}
          </div>
        )}
      </section>

      {!isContainerType && selected.type !== "image" && !(selected.type === "rect" && selected.image) && (
        <FillsSection
          node={selected}
          label={selected.type === "frame" ? "BACKGROUND" : "FILL"}
          set={set}
          colorStyles={colorStyles}
          addColorStyle={addColorStyle}
        />
      )}

      {(selected.type === "image" || (selected.type === "rect" && selected.image)) && (
        <ImageSection node={selected} set={set} />
      )}

      {!isContainerType && selected.type !== "image" && <StrokeSection node={selected} set={set} />}
      {!isContainerType && <EffectsSection node={selected} set={set} />}

      {selected.type === "frame" && (
        <>
          <section className="group">
            <div className="ghead">FRAME</div>
            <div className="seg">
              <div className={selected.clipContent ? "on" : ""} onClick={() => set({ clipContent: true })}>
                Clip content
              </div>
              <div className={!selected.clipContent ? "on" : ""} onClick={() => set({ clipContent: false })}>
                Off
              </div>
            </div>
          </section>
          <AutoLayoutSection frame={selected} set={set} />
          <LayoutGridsSection frame={selected} set={set} />
        </>
      )}

      {selected.type === "text" && <TypographySection node={selected} set={set} />}
      {selected.type === "path" && <PathSection node={selected} set={set} />}

      {selected.type !== "frame" && <ConstraintsSection node={selected} set={set} />}

      {selected.mainComponentId && <ComponentInstanceSection node={selected} />}

      <PrototypeSection node={selected} frames={frames} set={set} />

      <section className="group">
        <div className="ghead">ARRANGE</div>
        <div className="icon-row">
          <IconBtn title="Bring to front" onClick={() => reorderSelected("front")}><IcToFront /></IconBtn>
          <IconBtn title="Bring forward" onClick={() => reorderSelected("forward")}><IcForward /></IconBtn>
          <IconBtn title="Send backward" onClick={() => reorderSelected("backward")}><IcBackward /></IconBtn>
          <IconBtn title="Send to back" onClick={() => reorderSelected("back")}><IcToBack /></IconBtn>
        </div>
      </section>

      <div className="prop-actions">
        {isContainerType && (
          <button className="prop-btn" onClick={ungroupSelected}>Ungroup</button>
        )}
        <button className="prop-btn" onClick={createComponentFromSelection}>Make component</button>
        <button className="prop-btn" onClick={duplicateSelected}>Duplicate</button>
        <button className="prop-btn danger" onClick={deleteSelected}>Delete</button>
      </div>
    </aside>
  );
}

interface SectionProps {
  node: SceneNode;
  set: (patch: NodePatch) => void;
}

function StrokeSection({ node, set }: SectionProps) {
  const stroke = node.stroke;
  return (
    <section className="group">
      <div className="ghead">
        STROKE
        <button
          className="ghead-add"
          title={stroke ? "Remove stroke" : "Add stroke"}
          onClick={() => set({ stroke: stroke ? undefined : { ...DEFAULT_STROKE } })}
        >
          {stroke ? "−" : "+"}
        </button>
      </div>
      {stroke && (
        <>
          <div className="row" style={{ marginBottom: 8 }}>
            <ColorField label="Color" value={stroke.color} onChange={(color) => set({ stroke: { ...stroke, color } })} />
          </div>
          <div className="grid2" style={{ marginBottom: 8 }}>
            <NumberField label="W" value={stroke.width} min={0} step={0.5} onChange={(width) => set({ stroke: { ...stroke, width } })} />
          </div>
          <div className="seg" style={{ marginBottom: 8 }}>
            {(["solid", "dashed", "dotted"] as const).map((s) => (
              <div key={s} className={(stroke.style ?? "solid") === s ? "on" : ""} onClick={() => set({ stroke: { ...stroke, style: s } })}>
                {s}
              </div>
            ))}
          </div>
          <div className="seg">
            {(["inside", "center", "outside"] as const).map((p) => (
              <div key={p} className={(stroke.position ?? "center") === p ? "on" : ""} onClick={() => set({ stroke: { ...stroke, position: p } })}>
                {p}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function setIdx(t: [number, number, number, number], i: number, v: number): [number, number, number, number] {
  const next = [...t] as [number, number, number, number];
  next[i] = Math.max(0, v);
  return next;
}

function CornerRadiusControl({ node, set }: { node: Extract<SceneNode, { type: "rect" }>; set: (p: NodePatch) => void }) {
  const per = node.cornerRadii;
  if (!per) {
    return (
      <div className="grid2" style={{ marginTop: 8 }}>
        <IconNumberField icon={<IcCorner />} title="Corner radius" value={node.cornerRadius} min={0} onChange={(cornerRadius) => set({ cornerRadius })} />
        <button
          className="prop-btn tiny"
          title="Independent corners"
          onClick={() => set({ cornerRadii: [node.cornerRadius, node.cornerRadius, node.cornerRadius, node.cornerRadius] })}
        >
          ⌟ Each corner
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="grid2" style={{ marginTop: 8 }}>
        <NumberField label="◜" value={per[0]} min={0} onChange={(v) => set({ cornerRadii: setIdx(per, 0, v) })} />
        <NumberField label="◝" value={per[1]} min={0} onChange={(v) => set({ cornerRadii: setIdx(per, 1, v) })} />
        <NumberField label="◟" value={per[3]} min={0} onChange={(v) => set({ cornerRadii: setIdx(per, 3, v) })} />
        <NumberField label="◞" value={per[2]} min={0} onChange={(v) => set({ cornerRadii: setIdx(per, 2, v) })} />
      </div>
      <button className="prop-btn tiny" style={{ marginTop: 8 }} onClick={() => set({ cornerRadii: undefined })}>
        Uniform radius
      </button>
    </>
  );
}

const DEFAULT_DROP: Effect = { type: "drop-shadow", color: "#00000040", blur: 8, offsetX: 0, offsetY: 4 };

/** Read a node's effects, lifting a legacy `shadow` into the effects array. */
function effectsList(node: SceneNode): Effect[] {
  if (node.effects && node.effects.length) return node.effects;
  if (node.shadow) return [{ type: "drop-shadow", ...node.shadow }];
  return [];
}

function EffectsSection({ node, set }: SectionProps) {
  const addEffectStyle = useEditorStore((s) => s.addEffectStyle);
  const effectStyles = useEditorStore((s) => s.document.styles.effects ?? []);
  const effects = effectsList(node);
  const update = (next: Effect[]) => set({ effects: next, shadow: undefined });
  const setEffect = (i: number, e: Effect) => update(effects.map((x, idx) => (idx === i ? e : x)));
  const remove = (i: number) => update(effects.filter((_, idx) => idx !== i));
  return (
    <section className="group">
      <div className="ghead">
        EFFECTS
        <button className="ghead-add" title="Add effect" onClick={() => update([...effects, { ...DEFAULT_DROP }])}>+</button>
      </div>
      {effects.map((effect, i) => (
        <div key={i} className="paint-row">
          <div className="paint-head">
            <div className="seg paint-type">
              {(["drop-shadow", "inner-shadow", "layer-blur"] as const).map((t) => (
                <div
                  key={t}
                  className={effect.type === t ? "on" : ""}
                  title={t}
                  onClick={() => setEffect(i, convertEffect(effect, t))}
                >
                  {t === "drop-shadow" ? "Drop" : t === "inner-shadow" ? "Inner" : "Blur"}
                </div>
              ))}
            </div>
            <button className="paint-del" title="Remove effect" onClick={() => remove(i)}>−</button>
          </div>
          {effect.type === "layer-blur" ? (
            <div className="grid2" style={{ marginTop: 6 }}>
              <NumberField label="Radius" value={effect.radius} min={0} onChange={(radius) => setEffect(i, { ...effect, radius })} />
            </div>
          ) : (
            <>
              <div className="row" style={{ margin: "6px 0" }}>
                <ColorField label="Color" value={effect.color} onChange={(color) => setEffect(i, { ...effect, color })} />
              </div>
              <div className="grid2">
                <NumberField label="Blur" value={effect.blur} min={0} onChange={(blur) => setEffect(i, { ...effect, blur })} />
                <NumberField label="X" value={effect.offsetX} onChange={(offsetX) => setEffect(i, { ...effect, offsetX })} />
                <NumberField label="Y" value={effect.offsetY} onChange={(offsetY) => setEffect(i, { ...effect, offsetY })} />
              </div>
            </>
          )}
        </div>
      ))}
      {effects.length > 0 && (
        <button
          className="prop-btn tiny"
          style={{ marginTop: 6 }}
          onClick={() => addEffectStyle(`Effect ${effectStyles.length + 1}`, effects.map((e) => ({ ...e })))}
        >
          Save effect style
        </button>
      )}
    </section>
  );
}

/** Convert one effect to another type, preserving shared fields. */
function convertEffect(effect: Effect, type: Effect["type"]): Effect {
  if (effect.type === type) return effect;
  if (type === "layer-blur") {
    const radius = effect.type === "layer-blur" ? effect.radius : effect.blur;
    return { type: "layer-blur", radius };
  }
  const base = effect.type === "layer-blur"
    ? { color: "#00000040", blur: effect.radius, offsetX: 0, offsetY: 4 }
    : { color: effect.color, blur: effect.blur, offsetX: effect.offsetX, offsetY: effect.offsetY };
  return { type, ...base };
}

function BlendModeControl({ node, set }: SectionProps) {
  return (
    <label className="field" style={{ marginTop: 8 }} title="Blend mode">
      <span>Blend</span>
      <select value={node.blendMode ?? "normal"} onChange={(e) => set({ blendMode: e.target.value as BlendMode })}>
        {BLEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </label>
  );
}

function ImageSection({ node, set }: SectionProps) {
  const image = node.type === "image" ? node.image : node.type === "rect" ? node.image : undefined;
  if (!image) return null;
  const fits = ["cover", "contain", "fill", "tile"] as const;
  const crop = image.crop ?? [0, 0, 1, 1];
  const setCrop = (i: number, pct: number) => {
    const next = [...crop] as [number, number, number, number];
    next[i] = Math.min(1, Math.max(0, pct / 100));
    set({ image: { ...image, crop: next } });
  };
  return (
    <section className="group">
      <div className="ghead">IMAGE</div>
      <div className="seg">
        {fits.map((fit) => (
          <div key={fit} className={image.fit === fit ? "on" : ""} onClick={() => set({ image: { ...image, fit } })}>
            {fit}
          </div>
        ))}
      </div>
      {image.fit === "tile" && (
        <div className="grid2" style={{ marginTop: 8 }}>
          <NumberField label="Scale" value={image.scale ?? 1} min={0.05} step={0.05} onChange={(scale) => set({ image: { ...image, scale } })} />
        </div>
      )}
      {image.fit !== "tile" && (
        <>
          <div className="field-label" style={{ marginTop: 8 }}>Crop %</div>
          <div className="grid2">
            <NumberField label="X" value={Math.round(crop[0] * 100)} min={0} onChange={(v) => setCrop(0, v)} />
            <NumberField label="Y" value={Math.round(crop[1] * 100)} min={0} onChange={(v) => setCrop(1, v)} />
            <NumberField label="W" value={Math.round(crop[2] * 100)} min={1} onChange={(v) => setCrop(2, v)} />
            <NumberField label="H" value={Math.round(crop[3] * 100)} min={1} onChange={(v) => setCrop(3, v)} />
          </div>
          {image.crop && (
            <button className="prop-btn tiny" style={{ marginTop: 6 }} onClick={() => set({ image: { ...image, crop: undefined } })}>
              Reset crop
            </button>
          )}
        </>
      )}
    </section>
  );
}

const FONTS: { label: string; value: string }[] = [
  { label: "IBM Plex Sans", value: '"IBM Plex Sans", system-ui, sans-serif' },
  { label: "IBM Plex Mono", value: '"IBM Plex Mono", ui-monospace, monospace' },
  { label: "System UI", value: "system-ui, sans-serif" },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Monospace", value: 'ui-monospace, "Courier New", monospace' },
];

function TypographySection({ node, set }: SectionProps) {
  if (node.type !== "text") return null;
  const aligns = ["left", "center", "right"] as const;
  const styles = ["normal", "bold", "italic"] as const;
  const knownFont = FONTS.some((f) => f.value === node.fontFamily);
  return (
    <section className="group">
      <div className="ghead">TYPOGRAPHY</div>
      <TextField label="Aa" value={node.text} onChange={(text) => set({ text })} />
      <label className="field" style={{ marginTop: 8 }} title="Font family">
        <span>Font</span>
        <select value={node.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
          {!knownFont && <option value={node.fontFamily}>Current</option>}
          {FONTS.map((f) => (
            <option key={f.label} value={f.value}>{f.label}</option>
          ))}
        </select>
      </label>
      <div className="grid2" style={{ marginTop: 8 }}>
        <NumberField label="Sz" value={node.fontSize} min={1} onChange={(fontSize) => set({ fontSize })} />
        <NumberField label="LH" value={node.lineHeight ?? 1} min={0.5} step={0.1} onChange={(lineHeight) => set({ lineHeight })} />
        <NumberField label="LS" value={node.letterSpacing ?? 0} step={0.5} onChange={(letterSpacing) => set({ letterSpacing })} />
      </div>
      <div className="seg" style={{ marginTop: 8 }}>
        {styles.map((s) => (
          <div key={s} className={node.fontStyle === s ? "on" : ""} onClick={() => set({ fontStyle: s })}>
            {s === "normal" ? "Aa" : s === "bold" ? "B" : "I"}
          </div>
        ))}
      </div>
      <div className="seg" style={{ marginTop: 8 }}>
        {aligns.map((a) => (
          <div key={a} className={(node.align ?? "left") === a ? "on" : ""} onClick={() => set({ align: a })}>
            {a}
          </div>
        ))}
      </div>
      <div className="field-label" style={{ marginTop: 8 }}>Decoration</div>
      <div className="seg">
        {(["none", "underline", "line-through"] as const).map((d) => (
          <div key={d} className={(node.textDecoration ?? "none") === d ? "on" : ""} onClick={() => set({ textDecoration: d })} title={d}>
            {d === "none" ? "—" : d === "underline" ? "U̲" : "S̶"}
          </div>
        ))}
      </div>
      <div className="field-label" style={{ marginTop: 8 }}>Case</div>
      <div className="seg">
        {(["none", "upper", "lower"] as const).map((c) => (
          <div key={c} className={(node.textCase ?? "none") === c ? "on" : ""} onClick={() => set({ textCase: c })} title={c}>
            {c === "none" ? "Aa" : c === "upper" ? "AG" : "ag"}
          </div>
        ))}
      </div>
      <div className="field-label" style={{ marginTop: 8 }}>Resize</div>
      <div className="seg">
        {(["fixed", "auto-width", "auto-height"] as const).map((r) => (
          <div key={r} className={(node.textResize ?? "fixed") === r ? "on" : ""} onClick={() => set({ textResize: r })} title={r}>
            {r === "fixed" ? "Fixed" : r === "auto-width" ? "Auto W" : "Auto H"}
          </div>
        ))}
      </div>
    </section>
  );
}

function PathSection({ node, set }: SectionProps) {
  const setEditingPathId = useUiStore((s) => s.setEditingPathId);
  const editingPathId = useUiStore((s) => s.editingPathId);
  if (node.type !== "path") return null;
  const editing = editingPathId === node.id;
  return (
    <section className="group">
      <div className="ghead">PATH</div>
      <div className="seg">
        <div className={!node.smooth ? "on" : ""} onClick={() => set({ smooth: false })}>Straight</div>
        <div className={node.smooth ? "on" : ""} onClick={() => set({ smooth: true })}>Smooth</div>
      </div>
      <div className="seg" style={{ marginTop: 8 }}>
        <div className={node.closed ? "on" : ""} onClick={() => set({ closed: true })}>Closed</div>
        <div className={!node.closed ? "on" : ""} onClick={() => set({ closed: false })}>Open</div>
      </div>
      <div className="seg" style={{ marginTop: 8 }}>
        <div
          className={node.handles && node.handles.length ? "on" : ""}
          title="Add editable Bézier control handles (seeded from the current curve)"
          onClick={() => set({ handles: deriveSmoothHandles(node.points, node.closed), smooth: false })}
        >
          Curve handles
        </div>
        <div
          className={!node.handles || !node.handles.length ? "on" : ""}
          title="Remove handles (sharp corners)"
          onClick={() => set({ handles: undefined })}
        >
          Corners
        </div>
      </div>
      <button
        className="prop-btn"
        style={{ marginTop: 8, width: "100%" }}
        onClick={() => setEditingPathId(editing ? null : node.id)}
      >
        {editing ? "Done editing" : "Edit points"}
      </button>
      <p className="prop-hint" style={{ margin: "6px 0 0", fontSize: 10 }}>
        Double-click to edit · drag anchors & control dots · alt-drag a handle to break the tangent · click midpoints to add · alt/right-click to remove
      </p>
    </section>
  );
}

function AutoLayoutSection({ frame, set }: { frame: FrameNode; set: (p: NodePatch) => void }) {
  const al = frame.autoLayout;
  const perSide = al && (al.paddingTop !== undefined || al.paddingRight !== undefined || al.paddingBottom !== undefined || al.paddingLeft !== undefined);
  return (
    <section className="group">
      <div className="ghead">
        AUTO LAYOUT
        <button
          className="ghead-add"
          title={al ? "Remove auto layout" : "Add auto layout"}
          onClick={() => set({ autoLayout: al ? undefined : { ...DEFAULT_AUTOLAYOUT } })}
        >
          {al ? "−" : "+"}
        </button>
      </div>
      {al && (
        <>
          <div className="seg" style={{ marginBottom: 8 }}>
            <div className={al.direction === "row" ? "on" : ""} onClick={() => set({ autoLayout: { ...al, direction: "row" } })}>Row</div>
            <div className={al.direction === "column" ? "on" : ""} onClick={() => set({ autoLayout: { ...al, direction: "column" } })}>Column</div>
          </div>
          <div className="grid2" style={{ marginBottom: 8 }}>
            <NumberField label="Gap" value={al.gap} min={0} onChange={(gap) => set({ autoLayout: { ...al, gap } })} />
            {!perSide && (
              <NumberField label="Pad" value={al.padding} min={0} onChange={(padding) => set({ autoLayout: { ...al, padding } })} />
            )}
          </div>
          {perSide && (
            <div className="grid2" style={{ marginBottom: 8 }}>
              <NumberField label="↑" value={al.paddingTop ?? al.padding} min={0} onChange={(v) => set({ autoLayout: { ...al, paddingTop: v } })} />
              <NumberField label="→" value={al.paddingRight ?? al.padding} min={0} onChange={(v) => set({ autoLayout: { ...al, paddingRight: v } })} />
              <NumberField label="↓" value={al.paddingBottom ?? al.padding} min={0} onChange={(v) => set({ autoLayout: { ...al, paddingBottom: v } })} />
              <NumberField label="←" value={al.paddingLeft ?? al.padding} min={0} onChange={(v) => set({ autoLayout: { ...al, paddingLeft: v } })} />
            </div>
          )}
          <button
            className="prop-btn tiny"
            style={{ marginBottom: 8 }}
            onClick={() =>
              set({
                autoLayout: perSide
                  ? { ...al, paddingTop: undefined, paddingRight: undefined, paddingBottom: undefined, paddingLeft: undefined }
                  : { ...al, paddingTop: al.padding, paddingRight: al.padding, paddingBottom: al.padding, paddingLeft: al.padding },
              })
            }
          >
            {perSide ? "Uniform padding" : "Padding per side"}
          </button>
          <div className="field-label">Distribute</div>
          <div className="seg" style={{ marginBottom: 8 }}>
            {(["start", "center", "end", "space-between"] as const).map((j) => (
              <div key={j} className={(al.justify ?? "start") === j ? "on" : ""} onClick={() => set({ autoLayout: { ...al, justify: j } })} title={j}>
                {j === "space-between" ? "↔" : j}
              </div>
            ))}
          </div>
          <div className="field-label">Align</div>
          <div className="seg">
            {(["start", "center", "end"] as const).map((a) => (
              <div key={a} className={al.align === a ? "on" : ""} onClick={() => set({ autoLayout: { ...al, align: a } })}>{a}</div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const DEFAULT_GRID: LayoutGrid = { type: "columns", count: 12, size: 8, gutter: 16, margin: 24, color: "#f2a33c", visible: true };

function LayoutGridsSection({ frame, set }: { frame: FrameNode; set: (p: NodePatch) => void }) {
  const grids = frame.layoutGrids ?? [];
  const update = (next: LayoutGrid[]) => set({ layoutGrids: next.length ? next : undefined });
  const setGrid = (i: number, g: LayoutGrid) => update(grids.map((x, idx) => (idx === i ? g : x)));
  return (
    <section className="group">
      <div className="ghead">
        LAYOUT GRID
        <button className="ghead-add" title="Add layout grid" onClick={() => update([...grids, { ...DEFAULT_GRID }])}>+</button>
      </div>
      {grids.map((grid, i) => (
        <div key={i} className="paint-row">
          <div className="paint-head">
            <div className="seg paint-type">
              {(["columns", "rows", "grid"] as const).map((t) => (
                <div key={t} className={grid.type === t ? "on" : ""} onClick={() => setGrid(i, { ...grid, type: t })}>
                  {t === "columns" ? "Cols" : t === "rows" ? "Rows" : "Grid"}
                </div>
              ))}
            </div>
            <button className="paint-del" title="Remove grid" onClick={() => update(grids.filter((_, idx) => idx !== i))}>−</button>
          </div>
          {grid.type === "grid" ? (
            <div className="grid2" style={{ marginTop: 6 }}>
              <NumberField label="Size" value={grid.size} min={1} onChange={(size) => setGrid(i, { ...grid, size })} />
              <ColorField label="Color" value={grid.color} onChange={(color) => setGrid(i, { ...grid, color })} />
            </div>
          ) : (
            <>
              <div className="grid2" style={{ marginTop: 6 }}>
                <NumberField label="Count" value={grid.count} min={1} onChange={(count) => setGrid(i, { ...grid, count })} />
                <NumberField label="Gutter" value={grid.gutter} min={0} onChange={(gutter) => setGrid(i, { ...grid, gutter })} />
                <NumberField label="Margin" value={grid.margin} min={0} onChange={(margin) => setGrid(i, { ...grid, margin })} />
              </div>
              <ColorField label="Color" value={grid.color} onChange={(color) => setGrid(i, { ...grid, color })} />
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function SizingControl({ node, set }: { node: SceneNode; set: (p: NodePatch) => void }) {
  const modes: SizingMode[] = ["fixed", "hug", "fill"];
  const canHug = node.type === "frame" && Boolean(node.autoLayout);
  const avail = (m: SizingMode) => (m === "hug" ? canHug : true);
  return (
    <div className="grid2" style={{ marginTop: 8 }}>
      <label className="field" title="Horizontal sizing">
        <span>↔</span>
        <select value={node.sizingH ?? "fixed"} onChange={(e) => set({ sizingH: e.target.value as SizingMode })}>
          {modes.filter(avail).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="field" title="Vertical sizing">
        <span>↕</span>
        <select value={node.sizingV ?? "fixed"} onChange={(e) => set({ sizingV: e.target.value as SizingMode })}>
          {modes.filter(avail).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
    </div>
  );
}

function ConstraintsSection({ node, set }: SectionProps) {
  return (
    <section className="group">
      <div className="ghead">CONSTRAINTS</div>
      <div className="grid2">
        <label className="field">
          <span>H</span>
          <select value={node.constraintH ?? "min"} onChange={(e) => set({ constraintH: e.target.value as Constraint })}>
            {CONSTRAINTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>V</span>
          <select value={node.constraintV ?? "min"} onChange={(e) => set({ constraintV: e.target.value as Constraint })}>
            {CONSTRAINTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function MultiSelectEditor({ ids, nodes, colorStyles }: { ids: string[]; nodes: SceneNode[]; colorStyles: ColorStyle[] }) {
  const updateNodes = useEditorStore((s) => s.updateNodes);
  const updateNodesBatch = useEditorStore((s) => s.updateNodesBatch);
  const addColorStyle = useEditorStore((s) => s.addColorStyle);

  const picked = ids.map((id) => findNode(nodes, id)).filter((n): n is SceneNode => Boolean(n));
  if (picked.length < 2) return null;

  const bounds = selectionBounds(picked);
  const toBatch = (updated: SceneNode[]) => updateNodesBatch(updated.map((n) => ({ id: n.id, patch: n as NodePatch })));

  const opacity = commonValue(picked, "opacity");
  const rotation = commonValue(picked, "rotation");
  const blend = (commonValue(picked, "blendMode") as BlendMode | undefined) ?? "normal";
  const fillCommon = commonValue(picked, "fill");
  const firstFill = typeof fillCommon === "string" ? fillCommon : (picked[0].fill as string);
  const radiusNodes = picked.filter((n) => n.type === "rect" || n.type === "frame") as Extract<SceneNode, { type: "rect" | "frame" }>[];
  const radii = radiusNodes.map((n) => n.cornerRadius ?? 0);
  const commonRadius = radii.length && radii.every((r) => r === radii[0]) ? radii[0] : undefined;

  return (
    <>
      <section className="group">
        <div className="ghead">TRANSFORM · BOUNDS</div>
        <div className="grid2" style={{ marginBottom: 8 }}>
          <MixedNumberField label="X" value={Math.round(bounds.x)} onChange={(x) => toBatch(translateSelection(picked, x - bounds.x, 0))} />
          <MixedNumberField label="Y" value={Math.round(bounds.y)} onChange={(y) => toBatch(translateSelection(picked, 0, y - bounds.y))} />
          <MixedNumberField label="W" value={Math.round(bounds.width)} min={1} onChange={(w) => toBatch(resizeSelection(picked, bounds, w, bounds.height))} />
          <MixedNumberField label="H" value={Math.round(bounds.height)} min={1} onChange={(h) => toBatch(resizeSelection(picked, bounds, bounds.width, h))} />
        </div>
        <div className="grid2">
          <MixedNumberField label="∠" value={rotation} onChange={(r) => updateNodes(ids, { rotation: r })} />
          {radiusNodes.length > 0 && (
            <MixedNumberField label="⌜" value={commonRadius} min={0} onChange={(cornerRadius) => updateNodes(ids, { cornerRadius })} />
          )}
        </div>
      </section>

      <section className="group">
        <div className="ghead">APPEARANCE</div>
        <OpacityField value={opacity ?? 1} onChange={(o) => updateNodes(ids, { opacity: clamp01(o) })} />
        <label className="field" style={{ marginTop: 8 }} title="Blend mode">
          <span>Blend</span>
          <select value={blend} onChange={(e) => updateNodes(ids, { blendMode: e.target.value as BlendMode })}>
            {BLEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <div style={{ marginTop: 8 }}>
          <ColorField label="Fill" value={firstFill} onChange={(fill) => updateNodes(ids, { fill, fills: undefined })} />
        </div>
        {colorStyles.length > 0 && (
          <div className="swatch-strip" style={{ marginTop: 8 }}>
            {colorStyles.map((c) => (
              <button
                key={c.id}
                className="swatch-mini"
                style={{ background: c.value }}
                title={`Apply ${c.name}`}
                aria-label={`Apply ${c.name}`}
                onClick={() => updateNodes(ids, { fill: c.value, fills: undefined })}
              />
            ))}
          </div>
        )}
        <button className="prop-btn tiny" style={{ marginTop: 8 }} onClick={() => addColorStyle(`Color ${colorStyles.length + 1}`, firstFill)}>
          Save style
        </button>
      </section>
    </>
  );
}

function DistanceReadout({ nodes, ids }: { nodes: SceneNode[]; ids: string[] }) {
  const a = findNode(nodes, ids[0]);
  const b = findNode(nodes, ids[1]);
  if (!a || !b) return null;
  const gap = measureGap(a, b);
  return (
    <section className="group">
      <div className="ghead">MEASURE</div>
      <div className="measure-grid">
        <span>↔ {Math.round(gap.horizontal)}</span>
        <span>↕ {Math.round(gap.vertical)}</span>
        <span>⤢ {Math.round(gap.distance)}</span>
      </div>
    </section>
  );
}

function ComponentInstanceSection({ node }: { node: SceneNode }) {
  const components = useEditorStore((s) => s.document.components);
  const swapInstance = useEditorStore((s) => s.swapInstance);
  const resetInstance = useEditorStore((s) => s.resetInstance);
  const detachInstance = useEditorStore((s) => s.detachInstance);
  const setInstanceProp = useEditorStore((s) => s.setInstanceProp);

  const main = components.find((c) => c.id === node.mainComponentId);
  const siblings = main?.setName ? components.filter((c) => c.setName === main.setName) : [];
  const props = node.props ?? {};
  const textProps = textDescendants(node);
  const childToggles = toggleableChildren(node);

  return (
    <section className="group">
      <div className="ghead">INSTANCE</div>
      <label className="field field-stack">
        <span>Component</span>
        <select value={node.mainComponentId ?? ""} onChange={(e) => swapInstance(node.id, e.target.value)}>
          {components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      {siblings.length > 1 && (
        <label className="field field-stack" style={{ marginTop: 8 }}>
          <span>Variant</span>
          <select value={node.mainComponentId ?? ""} onChange={(e) => swapInstance(node.id, e.target.value)}>
            {siblings.map((c) => (
              <option key={c.id} value={c.id}>{variantLabel(c)}</option>
            ))}
          </select>
        </label>
      )}

      {textProps.length > 0 && (
        <>
          <div className="field-label" style={{ marginTop: 8 }}>Text properties</div>
          {textProps.map((tp) => (
            <label key={tp.name} className="field field-stack" style={{ marginBottom: 6 }}>
              <span>{tp.name}</span>
              <input
                type="text"
                value={typeof props[tp.name] === "string" ? (props[tp.name] as string) : tp.value}
                onChange={(e) => setInstanceProp(node.id, tp.name, e.target.value)}
              />
            </label>
          ))}
        </>
      )}

      {childToggles.length > 0 && (
        <>
          <div className="field-label" style={{ marginTop: 8 }}>Show / hide</div>
          {childToggles.map((c) => (
            <label key={c.name} className="check-row" style={{ marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={typeof props[c.name] === "boolean" ? (props[c.name] as boolean) : c.visible}
                onChange={(e) => setInstanceProp(node.id, c.name, e.target.checked)}
              />
              <span>{c.name}</span>
            </label>
          ))}
        </>
      )}

      <div className="prop-actions" style={{ marginTop: 8 }}>
        <button className="prop-btn" onClick={() => resetInstance(node.id)}>Reset</button>
        <button className="prop-btn" onClick={() => detachInstance(node.id)}>Detach</button>
      </div>
    </section>
  );
}

function PrototypeSection({
  node,
  frames,
  set,
}: {
  node: SceneNode;
  frames: FrameNode[];
  set: (p: NodePatch) => void;
}) {
  const targets = frames.filter((f) => f.id !== node.id);
  // Resolve the current interaction (rich interactions, else legacy link).
  const current: Interaction | undefined =
    node.interactions?.[0] ??
    (node.link ? { trigger: "click", target: node.link, transition: "instant", duration: 0, easing: "linear" } : undefined);

  const setInteraction = (patch: Partial<Interaction>) => {
    if (!current) return;
    const next: Interaction = { ...current, ...patch };
    set({ interactions: [next], link: undefined });
  };

  const setTarget = (target: string) => {
    if (!target) {
      set({ interactions: undefined, link: undefined });
      return;
    }
    const base: Interaction = current ?? { target, ...DEFAULT_INTERACTION };
    set({ interactions: [{ ...base, target }], link: undefined });
  };

  return (
    <section className="group">
      <div className="ghead">PROTOTYPE</div>
      <label className="field field-stack">
        <span>Navigate to frame</span>
        <select value={current?.target ?? ""} onChange={(e) => setTarget(e.target.value)}>
          <option value="">None</option>
          {targets.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </label>
      {current && (
        <>
          <label className="field field-stack" style={{ marginTop: 8 }}>
            <span>Action</span>
            <select value={current.action ?? "navigate"} onChange={(e) => setInteraction({ action: e.target.value as PrototypeAction })}>
              <option value="navigate">Navigate to</option>
              <option value="open-overlay">Open overlay</option>
              <option value="close-overlay">Close overlay</option>
            </select>
          </label>
          <label className="field field-stack" style={{ marginTop: 8 }}>
            <span>Trigger</span>
            <select value={current.trigger} onChange={(e) => setInteraction({ trigger: e.target.value as PrototypeTrigger })}>
              <option value="click">On click</option>
              <option value="after-delay">After delay</option>
            </select>
          </label>
          {current.trigger === "after-delay" && (
            <div className="grid2" style={{ marginTop: 8 }}>
              <NumberField label="ms" value={current.delay ?? 1500} min={0} step={100} onChange={(delay) => setInteraction({ delay })} />
            </div>
          )}
          <label className="field field-stack" style={{ marginTop: 8 }}>
            <span>Animation</span>
            <select value={current.transition} onChange={(e) => setInteraction({ transition: e.target.value as PrototypeTransition })}>
              <option value="instant">Instant</option>
              <option value="dissolve">Dissolve</option>
              <option value="slide-left">Slide left</option>
              <option value="slide-right">Slide right</option>
              <option value="smart-animate">Smart animate</option>
            </select>
          </label>
          {current.transition !== "instant" && (
            <div className="grid2" style={{ marginTop: 8 }}>
              <NumberField label="ms" value={current.duration} min={0} step={50} onChange={(duration) => setInteraction({ duration })} />
              <label className="field" title="Easing">
                <span>Ease</span>
                <select value={current.easing} onChange={(e) => setInteraction({ easing: e.target.value as PrototypeEasing })}>
                  <option value="linear">linear</option>
                  <option value="ease-in">ease-in</option>
                  <option value="ease-out">ease-out</option>
                  <option value="ease-in-out">ease-in-out</option>
                </select>
              </label>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const DEFAULT_STOPS = [
  { color: "#f2a33c", position: 0 },
  { color: "#0d0d0f", position: 1 },
];

/** Convert a paint to a new type, preserving color/stops where possible. */
function convertPaint(paint: Paint, type: Paint["type"]): Paint {
  if (type === paint.type) return paint;
  if (type === "solid") {
    const color = paint.type === "solid" ? paint.color : (paint.stops[0]?.color ?? "#000000");
    return { type: "solid", color, opacity: paint.opacity, visible: true };
  }
  const stops = paint.type === "solid" ? [{ color: paint.color, position: 0 }, { color: "#ffffff", position: 1 }] : paint.stops;
  if (type === "linear") return { type: "linear", stops, angle: paint.type === "linear" ? paint.angle : 90, opacity: paint.opacity, visible: true };
  return { type: "radial", stops, opacity: paint.opacity, visible: true };
}

interface FillsSectionProps {
  node: SceneNode;
  label: string;
  set: (patch: NodePatch) => void;
  colorStyles: ColorStyle[];
  addColorStyle: (name: string, value: string) => void;
}

function FillsSection({ node, label, set, colorStyles, addColorStyle }: FillsSectionProps) {
  const variables = useEditorStore((s) => s.document.variables);
  const bindFillVariable = useEditorStore((s) => s.bindFillVariable);
  const colorVars = variables?.variables.filter((v) => v.type === "color") ?? [];
  const fills: Paint[] = node.fills && node.fills.length ? node.fills : fillsFor(node);
  const update = (next: Paint[]) => set({ fills: next });
  const setPaint = (i: number, p: Paint) => update(fills.map((f, idx) => (idx === i ? p : f)));
  const addFill = () => update([...fills, { type: "solid", color: "#888888", opacity: 1, visible: true }]);
  const removeFill = (i: number) => {
    const next = fills.filter((_, idx) => idx !== i);
    if (next.length) update(next);
    else set({ fills: undefined });
  };
  const topColor = fills[fills.length - 1]?.type === "solid" ? (fills[fills.length - 1] as { color: string }).color : node.fill;

  return (
    <section className="group">
      <div className="ghead">
        {label}
        <button className="ghead-add" title="Add fill" onClick={addFill}>+</button>
      </div>
      {fills.map((paint, i) => (
        <PaintRow
          key={i}
          paint={paint}
          onChange={(p) => setPaint(i, p)}
          onRemove={() => removeFill(i)}
          canRemove={fills.length > 1}
        />
      ))}
      <div className="style-row">
        {colorStyles.length > 0 && (
          <div className="swatch-strip">
            {colorStyles.map((c) => (
              <button
                key={c.id}
                className="swatch-mini"
                style={{ background: c.value }}
                title={`Apply ${c.name}`}
                aria-label={`Apply ${c.name}`}
                onClick={() => set({ fill: c.value, fills: undefined })}
              />
            ))}
          </div>
        )}
        <button className="prop-btn tiny" onClick={() => addColorStyle(`Color ${colorStyles.length + 1}`, topColor)}>
          Save style
        </button>
      </div>
      {colorVars.length > 0 && (
        <label className="field" style={{ marginTop: 8 }} title="Bind fill to a variable">
          <span>Var</span>
          <select value={node.fillVarId ?? ""} onChange={(e) => bindFillVariable(node.id, e.target.value || undefined)}>
            <option value="">Unbound</option>
            {colorVars.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}

function PaintRow({
  paint,
  onChange,
  onRemove,
  canRemove,
}: {
  paint: Paint;
  onChange: (p: Paint) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="paint-row">
      <div className="paint-head">
        <div className="seg paint-type">
          {(["solid", "linear", "radial"] as const).map((t) => (
            <div key={t} className={paint.type === t ? "on" : ""} onClick={() => onChange(convertPaint(paint, t))} title={t}>
              {t === "solid" ? "Solid" : t === "linear" ? "Linear" : "Radial"}
            </div>
          ))}
        </div>
        {canRemove && (
          <button className="paint-del" title="Remove fill" aria-label="Remove fill" onClick={onRemove}>−</button>
        )}
      </div>
      {paint.type === "solid" ? (
        <ColorField label="Color" value={paint.color} onChange={(color) => onChange({ ...paint, color })} />
      ) : (
        <GradientEditor paint={paint} onChange={onChange} />
      )}
    </div>
  );
}

function GradientEditor({
  paint,
  onChange,
}: {
  paint: Extract<Paint, { type: "linear" | "radial" }>;
  onChange: (p: Paint) => void;
}) {
  const stops = paint.stops.length ? paint.stops : DEFAULT_STOPS;
  const setStop = (i: number, color: string) =>
    onChange({ ...paint, stops: stops.map((s, idx) => (idx === i ? { ...s, color } : s)) });
  const setPos = (i: number, position: number) =>
    onChange({ ...paint, stops: stops.map((s, idx) => (idx === i ? { ...s, position: Math.min(1, Math.max(0, position / 100)) } : s)) });
  const addStop = () => onChange({ ...paint, stops: [...stops, { color: "#ffffff", position: 0.5 }] });
  const removeStop = (i: number) => stops.length > 2 && onChange({ ...paint, stops: stops.filter((_, idx) => idx !== i) });

  return (
    <div className="gradient-editor">
      <div
        className="gradient-preview"
        style={{ background: previewCss(paint, stops) }}
      />
      {paint.type === "linear" && (
        <NumberField label="∠" value={paint.angle} onChange={(angle) => onChange({ ...paint, angle })} />
      )}
      <div className="gradient-stops">
        {stops.map((s, i) => (
          <div key={i} className="gradient-stop">
            <input type="color" className="color-dot" value={s.color} onChange={(e) => setStop(i, e.target.value)} aria-label={`Stop ${i + 1} color`} />
            <input
              type="number"
              className="stop-pos"
              value={Math.round(s.position * 100)}
              min={0}
              max={100}
              onChange={(e) => setPos(i, Number(e.target.value))}
              aria-label={`Stop ${i + 1} position`}
            />
            <span className="stop-pct">%</span>
            {stops.length > 2 && (
              <button className="paint-del" title="Remove stop" onClick={() => removeStop(i)}>−</button>
            )}
          </div>
        ))}
        <button className="prop-btn tiny" onClick={addStop}>Add stop</button>
      </div>
    </div>
  );
}

function previewCss(paint: Extract<Paint, { type: "linear" | "radial" }>, stops: { color: string; position: number }[]): string {
  const list = [...stops].sort((a, b) => a.position - b.position).map((s) => `${s.color} ${Math.round(s.position * 100)}%`).join(", ");
  return paint.type === "linear" ? `linear-gradient(${paint.angle + 90}deg, ${list})` : `radial-gradient(circle, ${list})`;
}

function RightCollapse() {
  const toggleRight = useUiStore((s) => s.toggleRight);
  return (
    <button className="panel-collapse" onClick={toggleRight} title="Collapse panel" aria-label="Collapse properties panel">
      <IcChevronRight />
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`icon-btn-sq${active ? " active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function IconNumberField({
  icon,
  title,
  value,
  min,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field" title={title}>
      <span className="field-ic field-scrub" aria-hidden onPointerDown={makeScrub(value, 1, onChange, min)}>{icon}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
      />
    </label>
  );
}

function AlignToolbar({
  align,
  distribute,
  canDistribute,
}: {
  align: (m: AlignMode) => void;
  distribute: (a: "h" | "v") => void;
  canDistribute: boolean;
}) {
  return (
    <div className="align-bar">
      <IconBtn title="Align left" onClick={() => align("left")}><IcAlignLeft /></IconBtn>
      <IconBtn title="Align horizontal centers" onClick={() => align("hcenter")}><IcAlignHCenter /></IconBtn>
      <IconBtn title="Align right" onClick={() => align("right")}><IcAlignRight /></IconBtn>
      <span className="align-sep" />
      <IconBtn title="Align top" onClick={() => align("top")}><IcAlignTop /></IconBtn>
      <IconBtn title="Align vertical centers" onClick={() => align("vcenter")}><IcAlignVCenter /></IconBtn>
      <IconBtn title="Align bottom" onClick={() => align("bottom")}><IcAlignBottom /></IconBtn>
      <span className="align-sep" />
      <IconBtn title="Distribute horizontally" disabled={!canDistribute} onClick={() => distribute("h")}><IcDistributeH /></IconBtn>
      <IconBtn title="Distribute vertically" disabled={!canDistribute} onClick={() => distribute("v")}><IcDistributeV /></IconBtn>
    </div>
  );
}

function BooleanToolbar({ onOp }: { onOp: (op: "union" | "subtract" | "intersect" | "exclude") => void }) {
  return (
    <div className="icon-row">
      <IconBtn title="Union" onClick={() => onOp("union")}><IcUnion /></IconBtn>
      <IconBtn title="Subtract" onClick={() => onOp("subtract")}><IcSubtract /></IconBtn>
      <IconBtn title="Intersect" onClick={() => onOp("intersect")}><IcIntersect /></IconBtn>
      <IconBtn title="Exclude" onClick={() => onOp("exclude")}><IcExclude /></IconBtn>
    </div>
  );
}

function CanvasProperties() {
  const canvas = useEditorStore((s) => activePage(s.document).canvas);
  const updateCanvas = useEditorStore((s) => s.updateCanvas);

  return (
    <aside className="panel r scroll" aria-label="Canvas properties">
      <div className="insp-head">
        <span className="insp-name">Canvas</span>
        <RightCollapse />
      </div>
      <section className="group">
        <div className="ghead">FRAME</div>
        <div className="grid2" style={{ marginBottom: 8 }}>
          <NumberField label="W" value={canvas.width} min={1} onChange={(width) => updateCanvas({ width })} />
          <NumberField label="H" value={canvas.height} min={1} onChange={(height) => updateCanvas({ height })} />
        </div>
        <ColorField label="Background" value={canvas.background} onChange={(background) => updateCanvas({ background })} />
      </section>
      <VariablesSection />
      <p className="prop-hint">Select a layer to edit its properties.</p>
    </aside>
  );
}

function VariablesSection() {
  const variables = useEditorStore((s) => s.document.variables);
  const addColorVariable = useEditorStore((s) => s.addColorVariable);
  const setVariableValue = useEditorStore((s) => s.setVariableValue);
  const deleteVariable = useEditorStore((s) => s.deleteVariable);
  const addVariableMode = useEditorStore((s) => s.addVariableMode);
  const setActiveMode = useEditorStore((s) => s.setActiveMode);

  const modes = variables?.modes ?? [];
  const active = variables?.activeModeId;

  return (
    <section className="group">
      <div className="ghead">
        VARIABLES
        <button
          className="ghead-add"
          title="Add color variable"
          onClick={() => addColorVariable(`Color ${(variables?.variables.length ?? 0) + 1}`, "#f2a33c")}
        >
          +
        </button>
      </div>
      {modes.length > 0 && (
        <div className="field-row" style={{ marginBottom: 8 }}>
          <label className="field" title="Active mode" style={{ flex: 1 }}>
            <span>Mode</span>
            <select value={active} onChange={(e) => setActiveMode(e.target.value)}>
              {modes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <button className="prop-btn tiny" title="Add mode" onClick={() => addVariableMode(`Mode ${modes.length + 1}`)}>+ Mode</button>
        </div>
      )}
      {variables?.variables.map((v) => (
        <div key={v.id} className="var-row">
          <input
            type="color"
            className="color-dot"
            value={typeof v.valuesByMode[active ?? ""] === "string" ? (v.valuesByMode[active ?? ""] as string) : "#000000"}
            onChange={(e) => active && setVariableValue(v.id, active, e.target.value)}
            aria-label={`${v.name} value`}
          />
          <span className="var-name">{v.name}</span>
          <button className="paint-del" title="Delete variable" onClick={() => deleteVariable(v.id)}>−</button>
        </div>
      ))}
      {(!variables || variables.variables.length === 0) && (
        <p className="prop-hint" style={{ margin: 0 }}>Add a variable to theme fills across modes.</p>
      )}
    </section>
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
