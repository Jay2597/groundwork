import { create } from "zustand";
import {
  activePage,
  createEmptyDocument,
  createEmptyPage,
  isContainer,
  isGroup,
  type CanvasSettings,
  type ColorStyle,
  type Comment,
  type Component,
  type Effect,
  type EffectStyle,
  type GroundworkDocument,
  type NodePatch,
  type PageGuide,
  type SceneNode,
  type SliceRegion,
  type TextStyle,
} from "@/types/document";
import type { BooleanOp } from "@/types/document";
import type { Tool, Viewport } from "@/types/editor";
import {
  booleanNodes,
  componentFromNode,
  duplicateNode,
  frameFromNodes,
  groupNodes,
  instanceFromComponent,
} from "@/lib/nodeFactory";
import { flattenNodes } from "@/lib/flatten";
import { nanoid } from "nanoid";
import { reflowHug } from "@/lib/autolayout";
import { trueBooleanPath } from "@/lib/trueBoolean";
import { connectorPoints } from "@/lib/connectors";
import { createVariableCollection, newVariable } from "@/lib/variables";
import { rebuildInstance } from "@/lib/components";
import {
  appendChild,
  countNodes,
  findNode,
  findSiblings,
  insertNode,
  offsetOf,
  removeNodesById,
  setContainerChildren,
  updateNodeById,
} from "@/lib/tree";

const HISTORY_LIMIT = 50;

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

interface EditorState {
  document: GroundworkDocument;
  selectedIds: string[];
  tool: Tool;
  viewport: Viewport;
  fileHandle?: FileSystemFileHandle;
  /** Id of the library file currently open in the editor (drives autosave). */
  currentFileId?: string;
  past: GroundworkDocument[];
  future: GroundworkDocument[];
  /** Internal clipboard for copy / paste (not the OS clipboard). */
  clipboard: SceneNode[];

  // selection + tool
  setTool: (tool: Tool) => void;
  setViewport: (viewport: Viewport) => void;
  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // mutations
  addNode: (node: SceneNode, parentId?: string) => void;
  updateNode: (id: string, patch: NodePatch) => void;
  updateNodes: (ids: string[], patch: NodePatch) => void;
  updateNodesBatch: (updates: { id: string; patch: NodePatch }[]) => void;
  updateNodesPositions: (updates: { id: string; x: number; y: number }[]) => void;
  reparentNode: (id: string, newParentId: string | null, x: number, y: number) => void;
  moveNode: (id: string, newParentId: string | null, beforeId: string | null) => void;
  updateCanvas: (patch: Partial<CanvasSettings>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  frameSelection: () => void;
  booleanSelected: (op: BooleanOp) => void;
  flattenSelected: () => void;
  trueBooleanSelected: (op: BooleanOp) => void;
  connectSelection: (kind?: "straight" | "elbow") => void;
  reorderSelected: (direction: "front" | "back" | "forward" | "backward") => void;
  alignSelected: (mode: AlignMode) => void;
  distributeSelected: (axis: "h" | "v") => void;
  nudgeSelected: (dx: number, dy: number) => void;
  renameDocument: (name: string) => void;

  // clipboard
  copySelected: () => void;
  cutSelected: () => void;
  paste: () => void;

  // pages
  addPage: () => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  setActivePage: (id: string) => void;

  // styles
  addColorStyle: (name: string, value: string) => void;
  deleteColorStyle: (id: string) => void;
  addTextStyle: (name: string, base: Omit<TextStyle, "id" | "name">) => void;
  deleteTextStyle: (id: string) => void;
  addEffectStyle: (name: string, effects: Effect[]) => void;
  applyEffectStyle: (id: string) => void;
  deleteEffectStyle: (id: string) => void;

  // variables / modes
  addColorVariable: (name: string, value: string) => void;
  addNumberVariable: (name: string, value: number) => void;
  bindNodeVar: (nodeId: string, prop: string, varId: string | undefined) => void;
  setVariableValue: (varId: string, modeId: string, value: string | number) => void;
  renameVariable: (varId: string, name: string) => void;
  deleteVariable: (varId: string) => void;
  addVariableMode: (name: string) => void;
  setActiveMode: (modeId: string) => void;
  deleteVariableMode: (modeId: string) => void;
  bindFillVariable: (nodeId: string, varId: string | undefined) => void;

  // components
  createComponentFromSelection: () => void;
  insertInstance: (componentId: string) => void;
  deleteComponent: (id: string) => void;
  swapInstance: (nodeId: string, componentId: string) => void;
  resetInstance: (nodeId: string) => void;
  detachInstance: (nodeId: string) => void;
  combineAsVariants: (componentIds: string[], setName: string) => void;
  setInstanceProp: (nodeId: string, key: string, value: string | boolean | undefined) => void;

  // comments
  addComment: (x: number, y: number) => string;
  updateComment: (id: string, patch: Partial<{ text: string; resolved: boolean }>) => void;
  deleteComment: (id: string) => void;

  // guides
  addGuide: (axis: "x" | "y", pos: number) => void;
  updateGuide: (id: string, pos: number) => void;
  removeGuide: (id: string) => void;

  // slices (export regions)
  addSlice: (rect: { x: number; y: number; width: number; height: number }) => void;
  renameSlice: (id: string, name: string) => void;
  removeSlice: (id: string) => void;

  // history
  undo: () => void;
  redo: () => void;

  // document lifecycle
  loadDocument: (doc: GroundworkDocument, handle?: FileSystemFileHandle) => void;
  newDocument: () => void;
  setFileHandle: (handle?: FileSystemFileHandle) => void;
  setCurrentFile: (id?: string) => void;
}

/** Replace the active page's nodes immutably. */
function withNodes(doc: GroundworkDocument, nodes: SceneNode[]): GroundworkDocument {
  return {
    ...doc,
    pages: doc.pages.map((p) => (p.id === doc.activePageId ? { ...p, nodes } : p)),
  };
}

/** Update the active page's comments immutably (not tracked in undo history). */
function withComments(
  doc: GroundworkDocument,
  fn: (comments: Comment[]) => Comment[],
): GroundworkDocument {
  return {
    ...doc,
    pages: doc.pages.map((p) =>
      p.id === doc.activePageId ? { ...p, comments: fn(p.comments) } : p,
    ),
  };
}

/** Update the active page's guides immutably (not tracked in undo history). */
function withGuides(
  doc: GroundworkDocument,
  fn: (guides: PageGuide[]) => PageGuide[],
): GroundworkDocument {
  return {
    ...doc,
    pages: doc.pages.map((p) =>
      p.id === doc.activePageId ? { ...p, guides: fn(p.guides) } : p,
    ),
  };
}

/** Update the active page's slices immutably. */
function withSlices(
  doc: GroundworkDocument,
  fn: (slices: SliceRegion[]) => SliceRegion[],
): GroundworkDocument {
  return {
    ...doc,
    pages: doc.pages.map((p) =>
      p.id === doc.activePageId ? { ...p, slices: fn(p.slices ?? []) } : p,
    ),
  };
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** Snapshot current document into history before a committing change. */
  function withHistory(
    state: EditorState,
    nextDocument: GroundworkDocument,
  ): Partial<EditorState> {
    const past = [...state.past, state.document].slice(-HISTORY_LIMIT);
    return { document: nextDocument, past, future: [] };
  }

  /** Commit a new node array for the active page, with history. */
  function commitNodes(state: EditorState, nodes: SceneNode[]): Partial<EditorState> {
    return withHistory(state, withNodes(state.document, reflowHug(nodes)));
  }

  function currentNodes(state: EditorState): SceneNode[] {
    return activePage(state.document).nodes;
  }

  /** The currently-selected nodes, resolved from the active page (nested-aware). */
  function pickedSelected(state: EditorState): SceneNode[] {
    const nodes = currentNodes(state);
    return state.selectedIds
      .map((id) => findNode(nodes, id))
      .filter((n): n is SceneNode => Boolean(n));
  }

  return {
    document: createEmptyDocument(),
    selectedIds: [],
    tool: "select",
    viewport: { scale: 1, x: 0, y: 0 },
    fileHandle: undefined,
    currentFileId: undefined,
    past: [],
    future: [],
    clipboard: [],

    setTool: (tool) => set({ tool }),
    setViewport: (viewport) => set({ viewport }),

    select: (ids) => set({ selectedIds: ids }),
    toggleSelect: (id) =>
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      })),
    clearSelection: () => set({ selectedIds: [] }),
    selectAll: () =>
      set((state) => ({ selectedIds: currentNodes(state).map((n) => n.id) })),

    addNode: (node, parentId) =>
      set((state) => {
        const nodes = parentId
          ? appendChild(currentNodes(state), parentId, node)
          : [...currentNodes(state), node];
        return commitNodes(state, nodes);
      }),

    updateNode: (id, patch) =>
      set((state) => commitNodes(state, updateNodeById(currentNodes(state), id, patch))),

    updateNodes: (ids, patch) =>
      set((state) => {
        let nodes = currentNodes(state);
        for (const id of ids) nodes = updateNodeById(nodes, id, patch);
        return commitNodes(state, nodes);
      }),

    updateNodesBatch: (updates) =>
      set((state) => {
        let nodes = currentNodes(state);
        for (const u of updates) nodes = updateNodeById(nodes, u.id, u.patch);
        return commitNodes(state, nodes);
      }),

    updateNodesPositions: (updates) =>
      set((state) => {
        let nodes = currentNodes(state);
        for (const u of updates) nodes = updateNodeById(nodes, u.id, { x: u.x, y: u.y });
        return commitNodes(state, nodes);
      }),

    reparentNode: (id, newParentId, x, y) =>
      set((state) => {
        const node = findNode(currentNodes(state), id);
        if (!node) return {};
        const moved = { ...node, x, y } as SceneNode;
        let nodes = removeNodesById(currentNodes(state), new Set([id]));
        nodes = newParentId ? appendChild(nodes, newParentId, moved) : [...nodes, moved];
        return commitNodes(state, nodes);
      }),

    moveNode: (id, newParentId, beforeId) =>
      set((state) => {
        const nodes = currentNodes(state);
        const node = findNode(nodes, id);
        if (!node || newParentId === id) return {};
        // Can't drop a container into itself or one of its descendants.
        if (newParentId && findNode([node], newParentId)) return {};
        if (newParentId) {
          const target = findNode(nodes, newParentId);
          if (!target || !isContainer(target)) return {};
        }

        // Preserve visual position across a reparent.
        const loc = findSiblings(nodes, id);
        const oldOffset = loc?.parent ? offsetOf(nodes, loc.parent.id) ?? { x: 0, y: 0 } : { x: 0, y: 0 };
        const newOffset = newParentId ? offsetOf(nodes, newParentId) ?? { x: 0, y: 0 } : { x: 0, y: 0 };
        const moved = {
          ...node,
          x: node.x + oldOffset.x - newOffset.x,
          y: node.y + oldOffset.y - newOffset.y,
        } as SceneNode;

        let next = removeNodesById(nodes, new Set([id]));
        next = insertNode(next, newParentId, moved, beforeId);
        return commitNodes(state, next);
      }),

    updateCanvas: (patch) =>
      set((state) =>
        withHistory(state, {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.document.activePageId
              ? { ...p, canvas: { ...p.canvas, ...patch } }
              : p,
          ),
        }),
      ),

    deleteSelected: () =>
      set((state) => {
        if (state.selectedIds.length === 0) return {};
        const selected = new Set(state.selectedIds);
        return {
          ...commitNodes(state, removeNodesById(currentNodes(state), selected)),
          selectedIds: [],
        };
      }),

    duplicateSelected: () =>
      set((state) => {
        if (state.selectedIds.length === 0) return {};
        let nodes = currentNodes(state);
        let counter = countNodes(nodes);
        const newIds: string[] = [];

        for (const id of state.selectedIds) {
          const node = findNode(nodes, id);
          if (!node) continue;
          counter += 1;
          const clone = duplicateNode(node, counter);
          newIds.push(clone.id);
          const loc = findSiblings(nodes, id);
          nodes = loc?.parent ? appendChild(nodes, loc.parent.id, clone) : [...nodes, clone];
        }
        if (newIds.length === 0) return {};
        return { ...commitNodes(state, nodes), selectedIds: newIds };
      }),

    groupSelected: () =>
      set((state) => {
        const sel = new Set(state.selectedIds);
        const nodes = currentNodes(state);
        // Group only sibling top-level selections (v1).
        const picked = nodes.filter((n) => sel.has(n.id));
        if (picked.length < 2) return {};
        const group = groupNodes(picked, countNodes(nodes) + 1);
        const rest = nodes.filter((n) => !sel.has(n.id));
        return {
          ...commitNodes(state, [...rest, group]),
          selectedIds: [group.id],
        };
      }),

    ungroupSelected: () =>
      set((state) => {
        const sel = new Set(state.selectedIds);
        let changed = false;
        const freed: string[] = [];
        const out: SceneNode[] = [];
        for (const node of currentNodes(state)) {
          if (sel.has(node.id) && (isGroup(node) || node.type === "boolean")) {
            changed = true;
            for (const child of node.children) {
              out.push({ ...child, x: child.x + node.x, y: child.y + node.y });
              freed.push(child.id);
            }
          } else {
            out.push(node);
          }
        }
        if (!changed) return {};
        return { ...commitNodes(state, out), selectedIds: freed };
      }),

    frameSelection: () =>
      set((state) => {
        const sel = new Set(state.selectedIds);
        const nodes = currentNodes(state);
        const picked = nodes.filter((n) => sel.has(n.id));
        if (picked.length === 0) return {};
        const frame = frameFromNodes(picked, countNodes(nodes) + 1);
        const rest = nodes.filter((n) => !sel.has(n.id));
        return { ...commitNodes(state, [...rest, frame]), selectedIds: [frame.id] };
      }),

    booleanSelected: (op) =>
      set((state) => {
        const sel = new Set(state.selectedIds);
        const nodes = currentNodes(state);
        const picked = nodes.filter((n) => sel.has(n.id));
        if (picked.length < 2) return {};
        const node = booleanNodes(picked, op, countNodes(nodes) + 1);
        const rest = nodes.filter((n) => !sel.has(n.id));
        return { ...commitNodes(state, [...rest, node]), selectedIds: [node.id] };
      }),

    trueBooleanSelected: (op) =>
      set((state) => {
        const sel = new Set(state.selectedIds);
        const nodes = currentNodes(state);
        const picked = nodes.filter((n) => sel.has(n.id));
        if (picked.length < 2) return {};
        // Real polygon geometry; fall back to the composited boolean if degenerate.
        const node = trueBooleanPath(picked, op, countNodes(nodes) + 1) ?? booleanNodes(picked, op, countNodes(nodes) + 1);
        const rest = nodes.filter((n) => !sel.has(n.id));
        return { ...commitNodes(state, [...rest, node]), selectedIds: [node.id] };
      }),

    flattenSelected: () =>
      set((state) => {
        const sel = new Set(state.selectedIds);
        const nodes = currentNodes(state);
        const picked = nodes.filter((n) => sel.has(n.id));
        if (picked.length === 0) return {};
        const path = flattenNodes(picked, countNodes(nodes) + 1);
        if (!path) return {};
        const rest = nodes.filter((n) => !sel.has(n.id));
        return { ...commitNodes(state, [...rest, path]), selectedIds: [path.id] };
      }),

    connectSelection: (kind = "straight") =>
      set((state) => {
        if (state.selectedIds.length !== 2) return {};
        const [from, to] = state.selectedIds;
        const nodes = currentNodes(state);
        const a = findNode(nodes, from);
        const b = findNode(nodes, to);
        if (!a || !b) return {};
        const points = connectorPoints(
          { x: a.x, y: a.y, width: a.width, height: a.height },
          { x: b.x, y: b.y, width: b.width, height: b.height },
          kind,
        );
        const connector: SceneNode = {
          id: nanoid(8),
          type: "path",
          name: `Connector ${countNodes(nodes) + 1}`,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          fill: "#000000",
          opacity: 1,
          visible: true,
          locked: false,
          points,
          closed: false,
          stroke: { color: "#6a6a72", width: 2, markerEnd: "arrow" },
          connector: { from, to, kind },
        };
        return { ...commitNodes(state, [...nodes, connector]), selectedIds: [connector.id] };
      }),

    reorderSelected: (direction) =>
      set((state) => {
        if (state.selectedIds.length === 0) return {};
        const nodes = currentNodes(state);
        const loc = findSiblings(nodes, state.selectedIds[0]);
        if (!loc) return {};
        const selected = new Set(state.selectedIds);
        const reordered = reorderSiblings(loc.siblings, selected, direction);
        const next = loc.parent
          ? setContainerChildren(nodes, loc.parent.id, reordered)
          : reordered;
        return commitNodes(state, next);
      }),

    alignSelected: (mode) =>
      set((state) => {
        const picked = pickedSelected(state);
        if (picked.length < 2) return {};
        const minX = Math.min(...picked.map((n) => n.x));
        const maxX = Math.max(...picked.map((n) => n.x + n.width));
        const minY = Math.min(...picked.map((n) => n.y));
        const maxY = Math.max(...picked.map((n) => n.y + n.height));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        let nodes = currentNodes(state);
        for (const n of picked) {
          const patch: NodePatch = {};
          if (mode === "left") patch.x = minX;
          else if (mode === "right") patch.x = maxX - n.width;
          else if (mode === "hcenter") patch.x = cx - n.width / 2;
          else if (mode === "top") patch.y = minY;
          else if (mode === "bottom") patch.y = maxY - n.height;
          else if (mode === "vcenter") patch.y = cy - n.height / 2;
          nodes = updateNodeById(nodes, n.id, patch);
        }
        return commitNodes(state, nodes);
      }),

    distributeSelected: (axis) =>
      set((state) => {
        const picked = pickedSelected(state);
        if (picked.length < 3) return {};
        const horizontal = axis === "h";
        const sorted = [...picked].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
        const size = (n: SceneNode) => (horizontal ? n.width : n.height);
        const start = horizontal ? sorted[0].x : sorted[0].y;
        const last = sorted[sorted.length - 1];
        const end = horizontal ? last.x + last.width : last.y + last.height;
        const totalSize = sorted.reduce((s, n) => s + size(n), 0);
        const gap = (end - start - totalSize) / (sorted.length - 1);

        let nodes = currentNodes(state);
        let cursor = start;
        for (const n of sorted) {
          const patch: NodePatch = horizontal ? { x: cursor } : { y: cursor };
          nodes = updateNodeById(nodes, n.id, patch);
          cursor += size(n) + gap;
        }
        return commitNodes(state, nodes);
      }),

    nudgeSelected: (dx, dy) =>
      set((state) => {
        if (state.selectedIds.length === 0) return {};
        let nodes = currentNodes(state);
        for (const id of state.selectedIds) {
          const node = findNode(nodes, id);
          if (!node) continue;
          nodes = updateNodeById(nodes, id, { x: node.x + dx, y: node.y + dy });
        }
        return commitNodes(state, nodes);
      }),

    renameDocument: (name) =>
      set((state) => ({ document: { ...state.document, name } })),

    copySelected: () =>
      set((state) => {
        const nodes = currentNodes(state);
        const picked = state.selectedIds
          .map((id) => findNode(nodes, id))
          .filter((n): n is SceneNode => Boolean(n));
        return { clipboard: picked };
      }),

    cutSelected: () => {
      get().copySelected();
      get().deleteSelected();
    },

    paste: () =>
      set((state) => {
        if (state.clipboard.length === 0) return {};
        let nodes = currentNodes(state);
        let counter = countNodes(nodes);
        const newIds: string[] = [];
        for (const item of state.clipboard) {
          counter += 1;
          const clone = duplicateNode(item, counter);
          newIds.push(clone.id);
          nodes = [...nodes, clone];
        }
        return { ...commitNodes(state, nodes), selectedIds: newIds };
      }),

    addPage: () =>
      set((state) => {
        const page = createEmptyPage(`Page ${state.document.pages.length + 1}`);
        return {
          ...withHistory(state, {
            ...state.document,
            pages: [...state.document.pages, page],
            activePageId: page.id,
          }),
          selectedIds: [],
        };
      }),

    deletePage: (id) =>
      set((state) => {
        if (state.document.pages.length <= 1) return {};
        const pages = state.document.pages.filter((p) => p.id !== id);
        const activePageId =
          state.document.activePageId === id ? pages[0].id : state.document.activePageId;
        return {
          ...withHistory(state, { ...state.document, pages, activePageId }),
          selectedIds: [],
        };
      }),

    renamePage: (id, name) =>
      set((state) => ({
        document: {
          ...state.document,
          pages: state.document.pages.map((p) => (p.id === id ? { ...p, name } : p)),
        },
      })),

    setActivePage: (id) =>
      set((state) => ({
        document: { ...state.document, activePageId: id },
        selectedIds: [],
      })),

    addColorStyle: (name, value) =>
      set((state) => {
        const style: ColorStyle = { id: `cs-${Date.now().toString(36)}`, name, value };
        return withHistory(state, {
          ...state.document,
          styles: { ...state.document.styles, colors: [...state.document.styles.colors, style] },
        });
      }),

    deleteColorStyle: (id) =>
      set((state) =>
        withHistory(state, {
          ...state.document,
          styles: {
            ...state.document.styles,
            colors: state.document.styles.colors.filter((c) => c.id !== id),
          },
        }),
      ),

    addTextStyle: (name, base) =>
      set((state) => {
        const style: TextStyle = { id: `ts-${Date.now().toString(36)}`, name, ...base };
        return withHistory(state, {
          ...state.document,
          styles: { ...state.document.styles, texts: [...state.document.styles.texts, style] },
        });
      }),

    deleteTextStyle: (id) =>
      set((state) =>
        withHistory(state, {
          ...state.document,
          styles: {
            ...state.document.styles,
            texts: state.document.styles.texts.filter((t) => t.id !== id),
          },
        }),
      ),

    addEffectStyle: (name, effects) =>
      set((state) => {
        const style: EffectStyle = { id: `es-${Date.now().toString(36)}`, name, effects };
        const styles = state.document.styles;
        return withHistory(state, {
          ...state.document,
          styles: { ...styles, effects: [...(styles.effects ?? []), style] },
        });
      }),

    applyEffectStyle: (id) =>
      set((state) => {
        const style = state.document.styles.effects?.find((e) => e.id === id);
        if (!style || state.selectedIds.length === 0) return {};
        let nodes = currentNodes(state);
        for (const sid of state.selectedIds) {
          nodes = updateNodeById(nodes, sid, { effects: style.effects.map((e) => ({ ...e })), shadow: undefined });
        }
        return commitNodes(state, nodes);
      }),

    deleteEffectStyle: (id) =>
      set((state) =>
        withHistory(state, {
          ...state.document,
          styles: { ...state.document.styles, effects: (state.document.styles.effects ?? []).filter((e) => e.id !== id) },
        }),
      ),

    addColorVariable: (name, value) =>
      set((state) => {
        const coll = state.document.variables ?? createVariableCollection();
        const variable = newVariable("color", name, coll.modes.map((m) => m.id), value);
        return withHistory(state, {
          ...state.document,
          variables: { ...coll, variables: [...coll.variables, variable] },
        });
      }),

    addNumberVariable: (name, value) =>
      set((state) => {
        const coll = state.document.variables ?? createVariableCollection();
        const variable = newVariable("number", name, coll.modes.map((m) => m.id), value);
        return withHistory(state, {
          ...state.document,
          variables: { ...coll, variables: [...coll.variables, variable] },
        });
      }),

    bindNodeVar: (nodeId, prop, varId) =>
      set((state) => {
        const node = findNode(currentNodes(state), nodeId);
        if (!node) return {};
        const bindings = { ...(node.varBindings ?? {}) };
        if (varId) bindings[prop] = varId;
        else delete bindings[prop];
        const next = Object.keys(bindings).length ? bindings : undefined;
        return commitNodes(state, updateNodeById(currentNodes(state), nodeId, { varBindings: next }));
      }),

    setVariableValue: (varId, modeId, value) =>
      set((state) => {
        const coll = state.document.variables;
        if (!coll) return {};
        return withHistory(state, {
          ...state.document,
          variables: {
            ...coll,
            variables: coll.variables.map((v) =>
              v.id === varId ? { ...v, valuesByMode: { ...v.valuesByMode, [modeId]: value } } : v,
            ),
          },
        });
      }),

    renameVariable: (varId, name) =>
      set((state) => {
        const coll = state.document.variables;
        if (!coll) return {};
        return withHistory(state, {
          ...state.document,
          variables: { ...coll, variables: coll.variables.map((v) => (v.id === varId ? { ...v, name } : v)) },
        });
      }),

    deleteVariable: (varId) =>
      set((state) => {
        const coll = state.document.variables;
        if (!coll) return {};
        return withHistory(state, {
          ...state.document,
          variables: { ...coll, variables: coll.variables.filter((v) => v.id !== varId) },
        });
      }),

    addVariableMode: (name) =>
      set((state) => {
        const coll = state.document.variables ?? createVariableCollection();
        const mode = { id: `mode-${Date.now().toString(36)}`, name };
        // Seed the new mode from the active mode's values.
        const variables = coll.variables.map((v) => ({
          ...v,
          valuesByMode: { ...v.valuesByMode, [mode.id]: v.valuesByMode[coll.activeModeId] },
        }));
        return withHistory(state, {
          ...state.document,
          variables: { ...coll, modes: [...coll.modes, mode], variables },
        });
      }),

    setActiveMode: (modeId) =>
      set((state) => {
        const coll = state.document.variables;
        if (!coll) return {};
        return withHistory(state, { ...state.document, variables: { ...coll, activeModeId: modeId } });
      }),

    deleteVariableMode: (modeId) =>
      set((state) => {
        const coll = state.document.variables;
        if (!coll || coll.modes.length <= 1) return {};
        const modes = coll.modes.filter((m) => m.id !== modeId);
        const activeModeId = coll.activeModeId === modeId ? modes[0].id : coll.activeModeId;
        return withHistory(state, { ...state.document, variables: { ...coll, modes, activeModeId } });
      }),

    bindFillVariable: (nodeId, varId) =>
      set((state) => commitNodes(state, updateNodeById(currentNodes(state), nodeId, { fillVarId: varId }))),

    createComponentFromSelection: () =>
      set((state) => {
        if (state.selectedIds.length === 0) return {};
        let nodes = currentNodes(state);
        let source: SceneNode | undefined;
        let selectedId: string;

        if (state.selectedIds.length === 1) {
          source = findNode(nodes, state.selectedIds[0]);
          selectedId = state.selectedIds[0];
        } else {
          // Wrap a multi-selection in a group, then componentize the group.
          const sel = new Set(state.selectedIds);
          const picked = nodes.filter((n) => sel.has(n.id));
          if (picked.length < 2) return {};
          const group = groupNodes(picked, countNodes(nodes) + 1);
          nodes = [...nodes.filter((n) => !sel.has(n.id)), group];
          source = group;
          selectedId = group.id;
        }
        if (!source) return {};

        const component: Component = componentFromNode(source, state.document.components.length + 1);
        const nextDoc = withNodes(state.document, nodes);
        return {
          ...withHistory(state, { ...nextDoc, components: [...nextDoc.components, component] }),
          selectedIds: [selectedId],
        };
      }),

    insertInstance: (componentId) =>
      set((state) => {
        const component = state.document.components.find((c) => c.id === componentId);
        if (!component) return {};
        const instance = instanceFromComponent(component, countNodes(currentNodes(state)) + 1);
        return {
          ...commitNodes(state, [...currentNodes(state), instance]),
          selectedIds: [instance.id],
        };
      }),

    deleteComponent: (id) =>
      set((state) =>
        withHistory(state, {
          ...state.document,
          components: state.document.components.filter((c) => c.id !== id),
        }),
      ),

    swapInstance: (nodeId, componentId) =>
      set((state) => {
        const component = state.document.components.find((c) => c.id === componentId);
        const node = findNode(currentNodes(state), nodeId);
        if (!component || !node) return {};
        const rebuilt = rebuildInstance(node, component.node, componentId);
        return commitNodes(state, updateNodeById(currentNodes(state), nodeId, rebuilt as NodePatch));
      }),

    resetInstance: (nodeId) =>
      set((state) => {
        const node = findNode(currentNodes(state), nodeId);
        if (!node?.mainComponentId) return {};
        const component = state.document.components.find((c) => c.id === node.mainComponentId);
        if (!component) return {};
        const rebuilt = rebuildInstance(node, component.node, component.id);
        return commitNodes(state, updateNodeById(currentNodes(state), nodeId, rebuilt as NodePatch));
      }),

    detachInstance: (nodeId) =>
      set((state) => {
        const node = findNode(currentNodes(state), nodeId);
        if (!node?.mainComponentId) return {};
        return commitNodes(state, updateNodeById(currentNodes(state), nodeId, { mainComponentId: undefined }));
      }),

    setInstanceProp: (nodeId, key, value) =>
      set((state) => {
        const node = findNode(currentNodes(state), nodeId);
        if (!node) return {};
        const props = { ...(node.props ?? {}) };
        if (value === undefined) delete props[key];
        else props[key] = value;
        const nextProps = Object.keys(props).length ? props : undefined;
        return commitNodes(state, updateNodeById(currentNodes(state), nodeId, { props: nextProps }));
      }),

    combineAsVariants: (componentIds, setName) =>
      set((state) => {
        const ids = new Set(componentIds);
        const components = state.document.components.map((c, i) =>
          ids.has(c.id)
            ? { ...c, setName, variantProps: c.variantProps ?? { Variant: String(i + 1) } }
            : c,
        );
        return withHistory(state, { ...state.document, components });
      }),

    addComment: (x, y) => {
      const comment: Comment = {
        id: `cm-${Date.now().toString(36)}`,
        x,
        y,
        text: "",
        resolved: false,
        createdAt: Date.now(),
      };
      set((state) => ({ document: withComments(state.document, (c) => [...c, comment]) }));
      return comment.id;
    },

    updateComment: (id, patch) =>
      set((state) => ({
        document: withComments(state.document, (c) =>
          c.map((cm) => (cm.id === id ? { ...cm, ...patch } : cm)),
        ),
      })),

    deleteComment: (id) =>
      set((state) => ({
        document: withComments(state.document, (c) => c.filter((cm) => cm.id !== id)),
      })),

    addGuide: (axis, pos) => {
      const guide: PageGuide = { id: `gd-${Date.now().toString(36)}`, axis, pos: Math.round(pos) };
      set((state) => ({ document: withGuides(state.document, (g) => [...g, guide]) }));
    },

    updateGuide: (id, pos) =>
      set((state) => ({
        document: withGuides(state.document, (g) =>
          g.map((gd) => (gd.id === id ? { ...gd, pos: Math.round(pos) } : gd)),
        ),
      })),

    removeGuide: (id) =>
      set((state) => ({
        document: withGuides(state.document, (g) => g.filter((gd) => gd.id !== id)),
      })),

    addSlice: (rect) =>
      set((state) => {
        const count = (activePage(state.document).slices?.length ?? 0) + 1;
        const slice: SliceRegion = {
          id: `sl-${Date.now().toString(36)}`,
          name: `Slice ${count}`,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        };
        return { document: withSlices(state.document, (s) => [...s, slice]) };
      }),

    renameSlice: (id, name) =>
      set((state) => ({
        document: withSlices(state.document, (s) => s.map((sl) => (sl.id === id ? { ...sl, name } : sl))),
      })),

    removeSlice: (id) =>
      set((state) => ({
        document: withSlices(state.document, (s) => s.filter((sl) => sl.id !== id)),
      })),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return {};
        const previous = state.past[state.past.length - 1];
        return {
          document: previous,
          past: state.past.slice(0, -1),
          future: [state.document, ...state.future].slice(0, HISTORY_LIMIT),
          selectedIds: [],
        };
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return {};
        const nextDoc = state.future[0];
        return {
          document: nextDoc,
          past: [...state.past, state.document].slice(-HISTORY_LIMIT),
          future: state.future.slice(1),
          selectedIds: [],
        };
      }),

    loadDocument: (doc, handle) =>
      set({
        document: doc,
        fileHandle: handle,
        selectedIds: [],
        past: [],
        future: [],
      }),

    newDocument: () =>
      set({
        document: createEmptyDocument(),
        fileHandle: undefined,
        selectedIds: [],
        past: [],
        future: [],
      }),

    setFileHandle: (handle) => set({ fileHandle: handle }),
    setCurrentFile: (id) => set({ currentFileId: id }),
  };
});

/** Reorder selected nodes within their sibling list. */
function reorderSiblings(
  siblings: SceneNode[],
  selected: Set<string>,
  direction: "front" | "back" | "forward" | "backward",
): SceneNode[] {
  if (direction === "front") {
    return [
      ...siblings.filter((n) => !selected.has(n.id)),
      ...siblings.filter((n) => selected.has(n.id)),
    ];
  }
  if (direction === "back") {
    return [
      ...siblings.filter((n) => selected.has(n.id)),
      ...siblings.filter((n) => !selected.has(n.id)),
    ];
  }
  return shiftByOne(siblings, selected, direction);
}

/** Move selected nodes one step forward/backward in z-order. */
function shiftByOne(
  nodes: SceneNode[],
  selected: Set<string>,
  direction: "forward" | "backward",
): SceneNode[] {
  const result = [...nodes];
  const indices = result
    .map((n, i) => (selected.has(n.id) ? i : -1))
    .filter((i) => i >= 0);
  const ordered = direction === "forward" ? indices.reverse() : indices;

  for (const i of ordered) {
    const target = direction === "forward" ? i + 1 : i - 1;
    if (target < 0 || target >= result.length || selected.has(result[target].id)) {
      continue;
    }
    [result[i], result[target]] = [result[target], result[i]];
  }
  return result;
}
