// Groundwork document model.
//
// The model is intentionally plain JSON so a document can be serialized to a
// `.gwork` file on the user's disk and re-opened with zero server involvement.
// Z-order is implicit in the `nodes` array order (last = top).

export const DOCUMENT_VERSION = 2 as const;

export type LeafType = "rect" | "ellipse" | "text" | "image" | "path";
export type NodeType = LeafType | "frame" | "group" | "boolean";

/** Outline drawn around a shape. */
export interface Stroke {
  color: string;
  width: number;
  /** Line style. Defaults to "solid". */
  style?: "solid" | "dashed" | "dotted";
  /** Stroke position relative to the path. Defaults to "center". */
  position?: "inside" | "center" | "outside";
  cap?: "butt" | "round" | "square";
  join?: "miter" | "round" | "bevel";
  /** Endpoint markers for open paths (none/arrow/triangle/circle). */
  markerStart?: "none" | "arrow" | "triangle" | "circle";
  markerEnd?: "none" | "arrow" | "triangle" | "circle";
}

/** Drop shadow effect. */
export interface Shadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

/** Compositing mode for a layer against what's behind it. */
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "soft-light"
  | "hard-light"
  | "difference"
  | "exclusion";

export interface DropShadowEffect {
  type: "drop-shadow";
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface InnerShadowEffect {
  type: "inner-shadow";
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface BlurEffect {
  type: "layer-blur";
  radius: number;
}

/** A stacked visual effect on a node. */
export type Effect = DropShadowEffect | InnerShadowEffect | BlurEffect;

/** Bitmap fill — `src` is a data URL stored on-device (never uploaded). */
export interface ImageFill {
  src: string;
  fit: "cover" | "contain" | "fill" | "tile";
  /** Crop rectangle in normalized image coords [x, y, w, h] (0–1). */
  crop?: [number, number, number, number];
  /** Tile scale (fraction of natural size) when `fit` is "tile". Defaults to 1. */
  scale?: number;
}

/** A color stop in a gradient (position 0–1). */
export interface GradientStop {
  color: string;
  position: number;
}

export interface SolidPaint {
  type: "solid";
  color: string;
  opacity: number;
  visible: boolean;
}

export interface LinearPaint {
  type: "linear";
  stops: GradientStop[];
  /** Gradient direction in degrees (0 = left→right, 90 = top→bottom). */
  angle: number;
  opacity: number;
  visible: boolean;
}

export interface RadialPaint {
  type: "radial";
  stops: GradientStop[];
  opacity: number;
  visible: boolean;
}

/** A single fill layer. Nodes can stack several (bottom → top). */
export type Paint = SolidPaint | LinearPaint | RadialPaint;

/** How a child reacts when its parent frame is resized. */
export type Constraint = "min" | "max" | "center" | "stretch" | "scale";

/** What kicks off a prototype interaction. */
export type PrototypeTrigger = "click" | "after-delay";
/** How the target frame animates in. */
export type PrototypeTransition = "instant" | "dissolve" | "slide-left" | "slide-right" | "smart-animate";
export type PrototypeEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

/** What an interaction does when fired. */
export type PrototypeAction = "navigate" | "open-overlay" | "close-overlay";

/** A prototype interaction: a trigger that navigates to / overlays a target frame. */
export interface Interaction {
  trigger: PrototypeTrigger;
  /** What to do. Defaults to "navigate". */
  action?: PrototypeAction;
  /** Target frame id (ignored for close-overlay). */
  target: string;
  transition: PrototypeTransition;
  /** Transition duration in ms. */
  duration: number;
  easing: PrototypeEasing;
  /** Delay in ms for the "after-delay" trigger. */
  delay?: number;
}

/** Boolean operation used to combine shapes into one outline. */
export type BooleanOp = "union" | "subtract" | "intersect" | "exclude";

/** Auto-layout configuration for a frame (a simple flex container). */
export interface AutoLayout {
  direction: "row" | "column";
  gap: number;
  /** Uniform padding fallback when per-side values are absent. */
  padding: number;
  /** Per-side padding; each overrides `padding` when present. */
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  /** Cross-axis alignment of children. */
  align: "start" | "center" | "end";
  /** Primary-axis distribution. Defaults to "start". */
  justify?: "start" | "center" | "end" | "space-between";
}

/** How a node sizes itself: a fixed box, hug its content, or fill its parent. */
export type SizingMode = "fixed" | "hug" | "fill";

/** A layout grid overlaid on a frame (columns, rows, or a uniform square grid). */
export interface LayoutGrid {
  type: "columns" | "rows" | "grid";
  /** Number of columns/rows (ignored for "grid"). */
  count: number;
  /** Track thickness for "grid" (square size) or column/row size when not stretching. */
  size: number;
  gutter: number;
  margin: number;
  color: string;
  visible: boolean;
}

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  /** Position relative to the parent frame's origin, or canvas-absolute at top level. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  /** Optional stacked fills (solid/gradient). When present, overrides `fill`. */
  fills?: Paint[];
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Optional outline. */
  stroke?: Stroke;
  /** Optional drop shadow (legacy single-shadow field; superseded by `effects`). */
  shadow?: Shadow;
  /** Stacked effects (drop/inner shadow, blur). Overrides `shadow` when present. */
  effects?: Effect[];
  /** Layer blend mode. Defaults to "normal". */
  blendMode?: BlendMode;
  /** Resize behaviour inside a parent frame. */
  constraintH?: Constraint;
  constraintV?: Constraint;
  /** Auto-layout sizing on each axis. Defaults to "fixed". */
  sizingH?: SizingMode;
  sizingV?: SizingMode;
  /** Prototype link: id of the frame to navigate to on click in present mode. */
  link?: string;
  /** Rich prototype interactions (triggers + transitions). Supersedes `link`. */
  interactions?: Interaction[];
  /** Reference to a shared color style. */
  fillStyleId?: string;
  /** Binds the fill color to a color variable (resolved per active mode). */
  fillVarId?: string;
  /**
   * Binds numeric properties to number variables, keyed by property name
   * (e.g. { cornerRadius: "var-x", opacity: "var-y" }). Resolved per active mode.
   */
  varBindings?: Record<string, string>;
  /** When set, this node is an instance of the given component master. */
  mainComponentId?: string;
  /**
   * Per-instance property overrides, keyed by descendant node name. A string
   * value overrides a text node's text; a boolean overrides a node's visibility.
   * Stored on the instance so they survive a reset-from-master.
   */
  props?: Record<string, string | boolean>;
  /** When true, this node clips its container's other children to its shape. */
  isMask?: boolean;
}

export interface RectNode extends BaseNode {
  type: "rect";
  cornerRadius: number;
  /** Independent corners [topLeft, topRight, bottomRight, bottomLeft]; overrides cornerRadius. */
  cornerRadii?: [number, number, number, number];
  /** When set, the rect is filled with this image instead of a flat color. */
  image?: ImageFill;
}

export interface EllipseNode extends BaseNode {
  type: "ellipse";
}

export interface ImageNode extends BaseNode {
  type: "image";
  image: ImageFill;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: "normal" | "bold" | "italic";
  /** Horizontal alignment. */
  align?: "left" | "center" | "right";
  /** Multiplier on font size. */
  lineHeight?: number;
  letterSpacing?: number;
  /** Reference to a shared text style. */
  textStyleId?: string;
  /** Underline / strikethrough decoration. Defaults to "none". */
  textDecoration?: "none" | "underline" | "line-through";
  /** Letter-case transform applied at render/export. Defaults to "none". */
  textCase?: "none" | "upper" | "lower";
  /** Box behaviour: fixed box, grow with text width, or grow with text height. */
  textResize?: "fixed" | "auto-width" | "auto-height";
}

/** One contour of a (possibly compound) path. */
export interface SubPath {
  /** Flattened [x0, y0, x1, y1, …] in the node's local space. */
  points: number[];
  closed: boolean;
}

/** A free-form vector path drawn with the pen tool. Points are local to (x, y). */
export interface PathNode extends BaseNode {
  type: "path";
  /** Flattened [x0, y0, x1, y1, …] in the node's local space (first contour). */
  points: number[];
  closed: boolean;
  /** When present, the path is a compound shape rendered with the even-odd rule. */
  subpaths?: SubPath[];
  /** When true, anchors are interpreted as a smooth (Catmull-Rom → Bézier) curve. */
  smooth?: boolean;
  /**
   * Explicit per-vertex Bézier handles, four numbers per anchor
   * ([inDX, inDY, outDX, outDY], relative to the anchor). When present, the path
   * renders as cubic Béziers driven by these handles (overrides `smooth`).
   */
  handles?: number[];
  /**
   * When set, this path is a connector between two nodes; its endpoints reflow
   * to the linked nodes' edges whenever they move (resolved at render/export).
   */
  connector?: { from: string; to: string; kind?: "straight" | "elbow" };
}

/** A frame / artboard — a container whose children are positioned relative to it. */
export interface FrameNode extends BaseNode {
  type: "frame";
  clipContent: boolean;
  children: SceneNode[];
  /** Rounded corners on the frame background. */
  cornerRadius?: number;
  /** When set, children are arranged automatically (flex). */
  autoLayout?: AutoLayout;
  /** Layout grids overlaid on the frame (visual guides + snapping). */
  layoutGrids?: LayoutGrid[];
}

/** A group — a container with no background/clip/label; resizing scales its children. */
export interface GroupNode extends BaseNode {
  type: "group";
  children: SceneNode[];
}

/** A boolean combination of shapes, rendered as a single composited outline. */
export interface BooleanNode extends BaseNode {
  type: "boolean";
  op: BooleanOp;
  children: SceneNode[];
}

export type ContainerNode = FrameNode | GroupNode | BooleanNode;
export type SceneNode =
  | RectNode
  | EllipseNode
  | ImageNode
  | TextNode
  | PathNode
  | FrameNode
  | GroupNode
  | BooleanNode;

/** A partial update covering any node field (the union's keys collapse otherwise). */
export type NodePatch = Partial<
  Omit<RectNode, "type"> &
    Omit<EllipseNode, "type"> &
    Omit<ImageNode, "type"> &
    Omit<TextNode, "type"> &
    Omit<PathNode, "type"> &
    Omit<FrameNode, "type"> &
    Omit<GroupNode, "type"> &
    Omit<BooleanNode, "type">
>;

export function isFrame(node: SceneNode): node is FrameNode {
  return node.type === "frame";
}

export function isGroup(node: SceneNode): node is GroupNode {
  return node.type === "group";
}

export function isContainer(node: SceneNode): node is ContainerNode {
  return node.type === "frame" || node.type === "group" || node.type === "boolean";
}

export interface CanvasSettings {
  width: number;
  height: number;
  background: string;
}

/** A named, shared color (a design token). */
export interface ColorStyle {
  id: string;
  name: string;
  value: string;
}

/** A named, shared text style. */
export interface TextStyle {
  id: string;
  name: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: "normal" | "bold" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
}

/** A reusable component master. Instances reference it by id. */
export interface Component {
  id: string;
  name: string;
  /** The master node subtree (positioned from its own 0,0 origin). */
  node: SceneNode;
  /** When part of a component set (variants), the set's shared name. */
  setName?: string;
  /** Variant property values for this member of a set (e.g. { State: "Hover" }). */
  variantProps?: Record<string, string>;
}

/** A named, shared effect set (a reusable elevation/shadow token). */
export interface EffectStyle {
  id: string;
  name: string;
  effects: Effect[];
}

export interface DocumentStyles {
  colors: ColorStyle[];
  texts: TextStyle[];
  effects?: EffectStyle[];
}

export type VariableType = "color" | "number";

/** A design variable whose value can differ per mode (e.g. light / dark). */
export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  /** Value keyed by mode id. */
  valuesByMode: Record<string, string | number>;
}

export interface VariableMode {
  id: string;
  name: string;
}

/** The document's variables and the modes they vary across. */
export interface VariableCollection {
  modes: VariableMode[];
  activeModeId: string;
  variables: Variable[];
}

/** A pinned local note on the canvas (never leaves the device). */
export interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: number;
}

/** A ruler guide line. axis "x" is a vertical line at document x = pos. */
export interface PageGuide {
  id: string;
  axis: "x" | "y";
  pos: number;
}

/** A named export region (a slice). Independent of the node tree. */
export interface SliceRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A page — its own canvas + node tree. Documents hold one or more. */
export interface Page {
  id: string;
  name: string;
  canvas: CanvasSettings;
  nodes: SceneNode[];
  comments: Comment[];
  guides: PageGuide[];
  slices?: SliceRegion[];
}

export interface GroundworkDocument {
  version: typeof DOCUMENT_VERSION;
  name: string;
  pages: Page[];
  activePageId: string;
  styles: DocumentStyles;
  components: Component[];
  /** Optional design variables with modes. */
  variables?: VariableCollection;
}

let pageCounter = 0;

export function createEmptyPage(name = "Page 1"): Page {
  pageCounter += 1;
  return {
    id: `page-${Date.now().toString(36)}-${pageCounter}`,
    name,
    canvas: { width: 1440, height: 1024, background: "#ffffff" },
    nodes: [],
    comments: [],
    guides: [],
  };
}

export function createEmptyDocument(name = "Untitled"): GroundworkDocument {
  const page = createEmptyPage();
  return {
    version: DOCUMENT_VERSION,
    name,
    pages: [page],
    activePageId: page.id,
    styles: { colors: [], texts: [] },
    components: [],
  };
}

/** Resolve the active page (falls back to the first page). */
export function activePage(doc: GroundworkDocument): Page {
  return doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
}

/**
 * Validate an unknown blob (e.g. an imported file) before trusting it, and
 * migrate older (v1) documents forward. Never trust external data.
 */
export function isGroundworkDocument(value: unknown): value is GroundworkDocument {
  if (typeof value !== "object" || value === null) return false;
  const doc = value as Record<string, unknown>;
  if (typeof doc.version !== "number" || typeof doc.name !== "string") return false;
  // v2 shape
  if (Array.isArray(doc.pages) && typeof doc.activePageId === "string") return true;
  // v1 shape (canvas + nodes) is still recognizable; migration happens on load.
  return typeof doc.canvas === "object" && doc.canvas !== null && Array.isArray(doc.nodes);
}

/** Bring any recognized (v1 or v2) document up to the current shape. */
export function migrateDocument(value: GroundworkDocument | LegacyDocument): GroundworkDocument {
  const v = value as unknown as Record<string, unknown>;
  if (Array.isArray(v.pages)) {
    const doc = value as GroundworkDocument;
    return {
      version: DOCUMENT_VERSION,
      name: doc.name,
      pages: doc.pages.map((p) => ({ ...p, comments: p.comments ?? [], guides: p.guides ?? [] })),
      activePageId: doc.activePageId ?? doc.pages[0]?.id,
      styles: doc.styles ?? { colors: [], texts: [] },
      components: doc.components ?? [],
    };
  }
  // Migrate v1 → v2: wrap canvas + nodes in a single page.
  const legacy = value as LegacyDocument;
  const page: Page = {
    id: createEmptyPage().id,
    name: "Page 1",
    canvas: legacy.canvas,
    nodes: legacy.nodes,
    comments: [],
    guides: [],
  };
  return {
    version: DOCUMENT_VERSION,
    name: legacy.name,
    pages: [page],
    activePageId: page.id,
    styles: { colors: [], texts: [] },
    components: [],
  };
}

/** The pre-pages document shape, kept only for migration. */
export interface LegacyDocument {
  version: number;
  name: string;
  canvas: CanvasSettings;
  nodes: SceneNode[];
}
