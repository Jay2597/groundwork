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
}

/** Drop shadow effect. */
export interface Shadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

/** Bitmap fill — `src` is a data URL stored on-device (never uploaded). */
export interface ImageFill {
  src: string;
  fit: "cover" | "contain" | "fill";
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

/** Boolean operation used to combine shapes into one outline. */
export type BooleanOp = "union" | "subtract" | "intersect" | "exclude";

/** Auto-layout configuration for a frame (a simple flex container). */
export interface AutoLayout {
  direction: "row" | "column";
  gap: number;
  padding: number;
  align: "start" | "center" | "end";
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
  /** Optional drop shadow. */
  shadow?: Shadow;
  /** Resize behaviour inside a parent frame. */
  constraintH?: Constraint;
  constraintV?: Constraint;
  /** Prototype link: id of the frame to navigate to on click in present mode. */
  link?: string;
  /** Reference to a shared color style. */
  fillStyleId?: string;
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
}

export interface DocumentStyles {
  colors: ColorStyle[];
  texts: TextStyle[];
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

/** A page — its own canvas + node tree. Documents hold one or more. */
export interface Page {
  id: string;
  name: string;
  canvas: CanvasSettings;
  nodes: SceneNode[];
  comments: Comment[];
  guides: PageGuide[];
}

export interface GroundworkDocument {
  version: typeof DOCUMENT_VERSION;
  name: string;
  pages: Page[];
  activePageId: string;
  styles: DocumentStyles;
  components: Component[];
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
