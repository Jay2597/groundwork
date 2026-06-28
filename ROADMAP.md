# Groundwork — Roadmap

A local-first, fully client-side design tool. Nothing is saved to a cloud; files
live on the user's device. This roadmap tracks what's built and what's next.

> Status legend: ✅ done · 🔜 next · ⬜ planned

---

## ▶ Pick up here (resume in a new terminal)

**What it is:** the working dir is `C:\Jay Apps\Pigma`. The folder is named "Pigma"
(old codename) but the **product is Groundwork**. Not a git repo.

**Run it:**
```bash
cd "C:\Jay Apps\Pigma"
npm install        # first time only
npm run dev        # dev server (Vite) — open the printed localhost URL
npm run build      # static production build to dist/ (code-split)
npm run typecheck  # tsc --noEmit
npm test           # vitest — pure-module unit tests
```

**Status:** Phases 1–5 are functionally complete; cross-cutting work (tests,
code-split, dead-code cleanup) is in. The only intentionally-deferred item is
**optional local P2P collaboration** (see Phase 5) — it's the one feature that
needs networking and is held back by design.

**🔜 Next ideas:** deeper rich-text editing on-canvas, true geometric boolean
output (current boolean uses canvas compositing), layer-list virtualization for
very large files, and component overrides/sync.

**Key files:** model `src/types/document.ts` (v2: pages, styles, components,
comments) · tree ops `src/lib/tree.ts` · snapping `src/lib/snapping.ts` ·
auto-layout `src/lib/autolayout.ts` · constraints `src/lib/constraints.ts` ·
store `src/store/editorStore.ts` (+ `uiStore`, `prefsStore`, `themeStore`) ·
canvas `src/components/canvas/` · panels `src/components/{layers,properties}` ·
overlays `src/components/{palette,settings,export,present,comments,contextmenu}`.

---

## Foundation (done)

- ✅ Vite + React + TypeScript + Konva + Zustand app, builds to a static site (code-split)
- ✅ Amber Studio design system (near-black + amber, IBM Plex), ported to app tokens
- ✅ Full brand integration (the "Grounded Frame" mark): in-app logo, favicons, PWA icons, OG, `favicon.ico`
- ✅ Self-hosted IBM Plex fonts (no network dependency)
- ✅ On-device persistence: IndexedDB multi-file library + File System Access for `.gwork` files; debounced autosave
- ✅ Document model v2 with **v1→v2 migration** (pages, styles, components, comments)
- ✅ Routing: **Home is the homepage** (`/`), `/editor/:fileId`, `/welcome` (kept, no longer gating)
- ✅ Editor core: rect / ellipse / text tools, select / move / hand, resize + rotate, layers, inspector, undo/redo, duplicate/delete, PNG + SVG export
- ✅ Frames / artboards: node tree, draw or presets, clipping, auto-parent on draw, nested layers, move-together
- ✅ Snapping & smart guides; light/dark theme with persisted toggle

---

## Phase 1 — Editor editing parity ✅

- ✅ Marquee multi-select + group drag-move + multi-resize
- ✅ Grouping / ungrouping (Ctrl+G / Ctrl+Shift+G)
- ✅ Reparent-on-drag (into / out of frames)
- ✅ Snap-on-resize + equal-spacing guides
- ✅ **Strokes & shadows / effects** on shapes (inspector + Konva render + SVG export)
- ✅ **Image fills / place image + drag-drop import** (data-URL, on-device)
- ✅ **Right-click context menus** (canvas + layers) + expanded shortcuts (nudge, copy/cut/paste, select-all, z-order)

## Phase 2 — Files & app shell ✅

- ✅ Real file **thumbnails** on Home (rendered on autosave, content-cropped)
- ✅ **Rename / duplicate** file; **Recent vs All** sections
- ✅ **Command palette (⌘K)** — searchable tools, edits, boolean, export, view
- ✅ **Settings / preferences** (theme, snapping, grid + grid size), persisted on-device
- ✅ **Export panel** — page PNG/SVG, per-frame PNG/SVG, batch "export all frames"
- ✅ **PWA install + offline service worker** (precache + stale-while-revalidate)

## Phase 3 — Design systems ✅

- ✅ **Components / instances** (Assets tab — make component, insert instance)
- ✅ **Color & text styles** (Assets tab + inspector swatch strip + "save style")
- ✅ **Multiple Pages** (Pages list — add / rename / delete / switch)
- ✅ **Auto-layout** (flex frames: row/column, gap, padding, align)

## Phase 4 — Vector & advanced ✅

- ✅ **Pen / path tool** (click vertices, close, finish/cancel) + **boolean operations** (union / subtract / intersect / exclude via isolated canvas compositing)
- ✅ **Constraints / responsive resize** within frames (min/center/max/stretch/scale)
- ✅ **Rich text** (alignment, weight/italic, line-height, letter-spacing)

## Phase 5 — Prototyping & (optional) collaboration

- ✅ **Prototype links** + **present / preview mode** (frame-to-frame hotspots, arrow-key stepping)
- ✅ **Comments / local notes** (pinned to canvas, resolve/delete, stored in the doc)
- ⬜ Optional **local P2P** collaboration (WebRTC) — intentionally deferred: it's the only networked feature and is kept off by design until the data-channel sync model is designed.

---

## Phase 6 — Vector & text maturity ✅

- ✅ **Smooth Bézier paths** (Catmull-Rom → cubic Bézier; `lib/bezier.ts`), rendered + exported as true curves (SVG/CSS); flatten samples curves
- ✅ **Text decoration** (underline / strikethrough), **letter-case** transform, **resize modes** (fixed / auto-width / auto-height)
- ⬜ Deferred (high-risk UX/geometry): interactive on-canvas vertex/handle editing; from-scratch polygon-clipping boolean engine (current composited boolean still works)

## Phase 7 — Auto-layout depth + layout grids ✅

- ✅ **Sizing modes** hug / fill / fixed per axis (`lib/autolayout.ts` `computeAutoLayout` + `reflowHug`)
- ✅ **Per-side padding**, **justify** (start/center/end/space-between)
- ✅ **Layout grids** (columns / rows / uniform grid) overlaid on frames

## Phase 8 — Variables, effects & blend ✅

- ✅ **Variables with modes** (`lib/variables.ts`) — bind a fill to a color variable; switching the active mode re-themes canvas + exports live
- ✅ **Multiple effects** (drop shadow, inner shadow, layer blur) + **blend modes** (`lib/effects.ts`); legacy single-shadow migrates forward
- ✅ Effect-style model scaffolded (`EffectStyle`); save/apply-style UI deferred

## Phase 9 — Components 2.0 ✅

- ✅ **Instance linking** (`mainComponentId`), **swap / reset / detach** (`lib/components.ts`)
- ✅ **Variant sets** — combine components into a set, switch variant on an instance
- ⬜ Deferred: formal named component properties (boolean/text/swap) UI; master-on-canvas editing for full override propagation

## Phase 10 — Prototyping & dev inspect ✅

- ✅ **Triggers** (click, after-delay) + **transitions** (dissolve / slide / smart-animate→dissolve) + **easing** (`lib/prototype.ts`), wired into present mode
- ✅ **Dev inspect** measurement readout (gap + center distance between two selected nodes; `lib/inspect.ts`)
- ⬜ Deferred: overlays, scroll/fixed behaviour, interactive-component prototyping

## Phase 11 — Import & polish ✅

- ✅ **SVG import** → editable vector/shape nodes (`lib/import/importSvg.ts`), grouped at the drop point; falls back to image placement
- ✅ **Math in number inputs** (`lib/mathEval.ts`) — type `120/2`, `8*3`, `(2+3)*4`
- ✅ **Eyedropper** (feature-detected `EyeDropper` API in the color field)

## Phase 12 — Previously-deferred items, now done ✅

- ✅ **Interactive vector editing** — double-click a path to edit; drag anchors, click midpoints to add, alt/right-click to remove (`lib/pathEdit.ts`, `components/canvas/PathEditor.tsx`)
- ✅ **True polygon-clipping booleans** — Greiner–Hormann clipper producing real compound-path geometry; "True geometry" boolean row falls back to the composited boolean on degenerate input (`lib/polybool.ts`, `lib/trueBoolean.ts`)
- ✅ **Shape masking** — a node flagged "Use as mask" clips its group; canvas clip + SVG `clipPath` export (`lib/mask.ts`)
- ✅ **Image crop + tiling** — normalized crop rect + tile fill with scale (`lib/imageCrop.ts`)
- ✅ **Slice / export-region tool** — slice tool draws named export regions exported as PNG/SVG (`SliceRegion`, `regionToSvg`)
- ✅ **Effect-style save/apply** — save a node's effects as a named style; apply from Assets
- ✅ **Component properties** — per-instance text + visibility overrides that survive reset (`lib/componentProps.ts`)
- ✅ **Prototype overlays** — open/close-overlay interaction actions rendered as floating overlays in present mode

---

## Cross-cutting (ongoing)

- ✅ Tests — **Vitest** unit suite for pure modules (`tree`, `snapping`, `constraints`, `autolayout`, `nodeFactory`, document migration); 29 tests green
- ✅ Performance — production bundle **code-split** (app / react / konva chunks); 500 KB warning gone
- 🔜 Performance — memoize node components + virtualize the layers list for very large files
- 🔜 Accessibility — full keyboard nav / focus management on canvas controls
- ✅ Cleanup — removed dead `src/lib/persistence/localDb.ts`

---

## Design references

High-fidelity mockups for every screen live in `design-mockups/screens/`
(open `index.html`). The brand asset package is in `brand/`.
