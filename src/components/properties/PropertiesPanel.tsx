import type { ReactNode } from "react";
import { useEditorStore } from "@/store/editorStore";
import type { AlignMode } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { IcChevronRight } from "@/components/ui/Icons";
import {
  activePage,
  isFrame,
  type AutoLayout,
  type ColorStyle,
  type Constraint,
  type FrameNode,
  type NodePatch,
  type Paint,
  type SceneNode,
} from "@/types/document";
import { fillsFor } from "@/lib/paint";
import { findNode } from "@/lib/tree";
import { ColorField, NumberField, OpacityField, TextField, makeScrub } from "./PropertyInputs";
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

const DEFAULT_SHADOW = { color: "#00000040", blur: 8, offsetX: 0, offsetY: 4 };
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
  const booleanSelected = useEditorStore((s) => s.booleanSelected);
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

        <section className="group">
          <div className="ghead">ALIGN</div>
          <AlignToolbar align={alignSelected} distribute={distributeSelected} canDistribute={selectedIds.length > 2} />
        </section>

        <section className="group">
          <div className="ghead">BOOLEAN</div>
          <BooleanToolbar onOp={booleanSelected} />
        </section>

        <div className="prop-actions">
          <button className="prop-btn" onClick={groupSelected}>Group</button>
          <button className="prop-btn" onClick={duplicateSelected}>Duplicate</button>
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
      </section>

      <section className="group">
        <div className="ghead">APPEARANCE</div>
        <OpacityField value={selected.opacity} onChange={(opacity) => set({ opacity: clamp01(opacity) })} />
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
        </>
      )}

      {selected.type === "text" && <TypographySection node={selected} set={set} />}

      {selected.type !== "frame" && <ConstraintsSection node={selected} set={set} />}

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

function EffectsSection({ node, set }: SectionProps) {
  const shadow = node.shadow;
  return (
    <section className="group">
      <div className="ghead">
        EFFECTS
        <button
          className="ghead-add"
          title={shadow ? "Remove shadow" : "Add drop shadow"}
          onClick={() => set({ shadow: shadow ? undefined : { ...DEFAULT_SHADOW } })}
        >
          {shadow ? "−" : "+"}
        </button>
      </div>
      {shadow && (
        <>
          <div className="row" style={{ marginBottom: 8 }}>
            <ColorField label="Color" value={shadow.color} onChange={(color) => set({ shadow: { ...shadow, color } })} />
          </div>
          <div className="grid2">
            <NumberField label="Blur" value={shadow.blur} min={0} onChange={(blur) => set({ shadow: { ...shadow, blur } })} />
            <NumberField label="X" value={shadow.offsetX} onChange={(offsetX) => set({ shadow: { ...shadow, offsetX } })} />
            <NumberField label="Y" value={shadow.offsetY} onChange={(offsetY) => set({ shadow: { ...shadow, offsetY } })} />
          </div>
        </>
      )}
    </section>
  );
}

function ImageSection({ node, set }: SectionProps) {
  const image = node.type === "image" ? node.image : node.type === "rect" ? node.image : undefined;
  if (!image) return null;
  const fits = ["cover", "contain", "fill"] as const;
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
    </section>
  );
}

function TypographySection({ node, set }: SectionProps) {
  if (node.type !== "text") return null;
  const aligns = ["left", "center", "right"] as const;
  const styles = ["normal", "bold", "italic"] as const;
  return (
    <section className="group">
      <div className="ghead">TYPOGRAPHY</div>
      <TextField label="Aa" value={node.text} onChange={(text) => set({ text })} />
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
    </section>
  );
}

function AutoLayoutSection({ frame, set }: { frame: FrameNode; set: (p: NodePatch) => void }) {
  const al = frame.autoLayout;
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
            <NumberField label="Pad" value={al.padding} min={0} onChange={(padding) => set({ autoLayout: { ...al, padding } })} />
          </div>
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
  return (
    <section className="group">
      <div className="ghead">PROTOTYPE</div>
      <label className="field field-stack">
        <span>On click → go to frame</span>
        <select
          value={node.link ?? ""}
          onChange={(e) => set({ link: e.target.value || undefined })}
        >
          <option value="">None</option>
          {targets.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </label>
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
      <p className="prop-hint">Select a layer to edit its properties.</p>
    </aside>
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
