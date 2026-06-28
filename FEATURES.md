# Groundwork — Features

A detailed tour of everything **Groundwork** can do. Groundwork is a **local-first,
100% client-side design tool** — a Figma-style editor that runs entirely in your
browser. There is no server, no account, and no cloud: your design files never
leave your machine.

**Live:** https://jay2597.github.io/groundwork/

> **Privacy in one line:** your design content never leaves your device. The only
> optional outbound request is anonymous, content-free usage analytics (off
> unless explicitly configured at build time — see [Privacy & analytics](#privacy--analytics)).

---

## Table of contents

- [The canvas](#the-canvas)
- [Tools](#tools)
- [Shapes & objects](#shapes--objects)
- [Vector editing & the pen](#vector-editing--the-pen)
- [Boolean operations](#boolean-operations)
- [Text](#text)
- [Fills: solid, gradient & image](#fills-solid-gradient--image)
- [Strokes](#strokes)
- [Effects & blend modes](#effects--blend-modes)
- [Auto-layout](#auto-layout)
- [Layout grids](#layout-grids)
- [Constraints (responsive resize)](#constraints-responsive-resize)
- [Multi-select editing](#multi-select-editing)
- [Masking](#masking)
- [Components & instances](#components--instances)
- [Styles](#styles)
- [Variables & modes (theming)](#variables--modes-theming)
- [Pages](#pages)
- [Prototyping & present mode](#prototyping--present-mode)
- [Comments](#comments)
- [Dev mode: inspect, measure & code](#dev-mode-inspect-measure--code)
- [Export](#export)
- [Slices (export regions)](#slices-export-regions)
- [Import](#import)
- [Files, autosave & the home screen](#files-autosave--the-home-screen)
- [App shell & productivity](#app-shell--productivity)
- [Offline & installable (PWA)](#offline--installable-pwa)
- [Privacy & analytics](#privacy--analytics)
- [Keyboard shortcuts](#keyboard-shortcuts)

---

## The canvas

- **Infinite canvas** with smooth **pan** (Hand tool / **H**, or space-drag) and
  **zoom-to-cursor** (scroll wheel) from 5% to 1600%.
- **Rulers** along the top and left edges, with **draggable guides** you pull out
  from the rulers; guides are stored per page.
- **Smart snapping & guides** — while dragging, objects snap to other objects'
  edges and centers, and **equal-spacing** guides appear when gaps match. Snapping
  also applies while resizing. Toggleable in Settings.
- **Dotted grid** background with a configurable grid size.
- **Frame name labels** float above each artboard and are clickable to select.

## Tools

The left toolbar (with single-key shortcuts):

| Tool | Key | What it does |
|------|-----|--------------|
| Move / select | **V** | Select, drag, resize, rotate |
| Hand | **H** | Pan the canvas |
| Frame / artboard | **F** | Draw a frame (or pick a device preset) |
| Rectangle | **R** | Draw rectangles |
| Ellipse | **O** | Draw ellipses |
| Text | **T** | Place and edit text |
| Pen | **P** | Draw vector paths |
| Slice | **S** | Draw named export regions |
| Insert image | — | Pick an image or SVG from disk |

## Shapes & objects

Groundwork's scene is a **node tree**. Node types:

- **Rectangle** — with a uniform corner radius **or independent per-corner radii**,
  edited numerically or with **on-canvas corner handles**.
- **Ellipse**
- **Text** — see [Text](#text).
- **Image** — bitmap placed on canvas.
- **Path** — free-form vector, straight or curved.
- **Frame / artboard** — a container with an optional background, clipping,
  rounded corners, auto-layout, and layout grids. Drawing a shape inside a frame
  automatically parents it.
- **Group** — a transparent container; resizing a group scales its whole subtree.
- **Boolean** — a union/subtract/intersect/exclude combination of shapes.

Every object supports: position/size (X/Y/W/H), rotation, opacity, visibility,
lock, blend mode, naming, duplicate, delete, and full z-ordering (bring to
front/forward, send backward/to back).

## Vector editing & the pen

- **Pen tool** — click to place anchor points, click the first point (or
  double-click / **Enter**) to finish; **Esc** cancels.
- **Straight or smooth** paths — a path can be a polyline or a **smooth curve**
  (Catmull-Rom → cubic Bézier), toggled in the inspector.
- **Edit-points mode** — **double-click a path** (or use *Edit points*) to:
  - **Drag anchors** to reshape.
  - **Click a segment midpoint** to insert a new anchor.
  - **Alt-click or right-click** an anchor to delete it.
- **Bézier control handles** — turn on **Curve handles** to get draggable in/out
  tangent handles on every anchor. Drag a handle to bend the curve; the opposite
  handle mirrors by default, and **Alt-drag breaks the tangent** for independent
  handles. **Corners** clears handles back to sharp points.
- **Open or closed** paths, with correct fill behaviour for closed shapes.
- **Flatten** — collapse any selection (shapes, groups, booleans) into a single
  **compound vector path** using the even-odd fill rule (real holes/donuts).

## Boolean operations

Combine two or more shapes with **Union**, **Subtract**, **Intersect**, or
**Exclude (XOR)**. Two flavours:

- **Live boolean** — a non-destructive boolean node you can still edit; rendered
  faithfully on canvas and in exports.
- **True geometry** — bake the boolean into a real, editable **compound path**
  using a built-in polygon clipper (Greiner–Hormann), so you get actual merged
  outlines you can then vector-edit. Falls back to the live boolean for
  degenerate inputs.

## Text

- Inline, on-canvas editing (double-click).
- **Font family** picker (self-hosted IBM Plex Sans/Mono, system, serif, mono).
- **Size**, **line-height**, **letter-spacing**.
- **Weight / style** — normal, bold, italic.
- **Alignment** — left, center, right.
- **Decoration** — underline, strikethrough.
- **Letter case** — as-typed, UPPERCASE, lowercase.
- **Resize modes** — fixed box, auto-width, or auto-height.

## Fills: solid, gradient & image

- **Multiple stacked fills** per object (bottom → top), each individually toggled.
- **Solid** color with opacity.
- **Linear gradient** with an adjustable angle and any number of color stops.
- **Radial gradient** with multiple stops.
- **Image fills** with **fit** modes — cover, contain, fill, or **tile** (with a
  tile scale).
- **Image crop** — a normalized crop rectangle (X/Y/W/H as %), resolution-independent.
- Quick **eyedropper** to sample any on-screen color (where the browser supports it).
- **Math in number inputs** — type `120/2`, `8*3`, or `(4+2)*8` into any numeric field.

## Strokes

- Color and width.
- **Style** — solid, dashed, dotted.
- **Position** — inside, center, outside.
- **Cap** (butt/round/square) and **join** (miter/round/bevel).
- Faithfully reproduced in SVG export (dash arrays, caps, joins).

## Effects & blend modes

- **Multiple stacked effects** per object:
  - **Drop shadow** (color, blur, X/Y offset)
  - **Inner shadow**
  - **Layer blur**
- **Blend modes** — normal, multiply, screen, overlay, darken, lighten,
  color-dodge, color-burn, soft-light, hard-light, difference, exclusion.
- Effects and blend modes are honored on canvas and in SVG/CSS export.

## Auto-layout

Turn any frame into a **flexbox-style auto-layout** container:

- **Direction** — row or column.
- **Gap** between items.
- **Padding** — uniform, or **per-side** (top/right/bottom/left).
- **Distribute** (primary axis) — start, center, end, or **space-between**.
- **Align** (cross axis) — start, center, end.
- **Sizing per axis** for every node — **Fixed**, **Hug contents**, or **Fill
  container**. Hug frames automatically resize to fit their children; fill
  children stretch to share space.
- Auto-layout is reproduced as real **flexbox** in the CSS/HTML export.

## Layout grids

Overlay design grids on any frame:

- **Columns**, **Rows**, or a uniform square **Grid**.
- Configurable **count**, **gutter**, **margin**, track **size**, and **color**.
- Rendered as non-interactive guide overlays to lay out against.

## Constraints (responsive resize)

Pin how a child reacts when its parent frame resizes, per axis:

- **Min**, **Max**, **Center**, **Stretch**, or **Scale** — horizontally and
  vertically. Resizing a frame reflows its children accordingly.

## Multi-select editing

Select two or more objects and edit them **together**:

- **Bounding-box transform** — X/Y move the whole selection; W/H scale every
  object *and its subtree* about the box origin.
- **Shared appearance** — opacity, rotation, corner radius, blend mode, and fill
  applied uniformly across the selection (plus apply/save color styles).
- Fields show **"Mixed"** when values differ across the selection.
- **Align & distribute**, group, frame, componentize, boolean, and flatten the
  selection. A **measurement readout** shows the gap and center distance between
  exactly two selected objects.
- Every multi-edit is a **single undo step**.

## Masking

- Flag any object as **"Use as mask"** to clip the other layers in its group to
  its shape (rectangle, ellipse, or path outline).
- Honored on canvas (clipping) and in SVG export (`clipPath`).

## Components & instances

- **Create a component** from any object or selection.
- **Insert instances** from the **Assets** tab.
- **Instance linking** — instances stay connected to their master.
- **Swap** an instance to a different component, **Reset** it to the master, or
  **Detach** it into plain layers.
- **Variants / component sets** — combine related components into a set and switch
  variants on an instance.
- **Component properties** — per-instance **text overrides** and **show/hide
  toggles** for child layers, which survive a reset (resolved live at render and
  export time).

## Styles

Reusable, named design tokens kept in the document and managed from the **Assets**
tab and the inspector:

- **Color styles** — save a fill as a named swatch; click to apply across a
  selection.
- **Text styles** — named typography presets.
- **Effect styles** — save a node's effect stack as a named style; apply or delete
  from Assets.

## Variables & modes (theming)

- Define **color variables** and switch the document's **active mode** (e.g.
  Light / Dark).
- **Bind an object's fill to a variable** — changing the active mode **re-themes
  the whole document live**, on canvas and in every export, with no per-object edits.
- Add and name multiple modes; new modes are seeded from the current one.

## Pages

- Multiple **pages** per document, each with its own canvas, node tree, comments,
  guides, and slices.
- Add, rename, delete, and switch pages from the Pages list.

## Prototyping & present mode

- **Interactions** on any object:
  - **Triggers** — on click, or after a delay (auto-advance).
  - **Actions** — navigate to a frame, **open an overlay**, or **close an overlay**.
  - **Transitions** — instant, dissolve, slide left/right, or smart-animate, with a
    **duration** and **easing** (linear / ease-in / ease-out / ease-in-out).
- **Present mode** — a full-screen runner that steps through frames, follows your
  hotspots and transitions, floats overlays on a backdrop, supports keyboard
  navigation (arrows / space), and auto-advances delay-triggered frames.

## Comments

- **Pin local comments** anywhere on the canvas (comment mode).
- Edit, **resolve**, and delete them. Comments live inside the document and, like
  everything else, never leave your device.

## Dev mode: inspect, measure & code

- **Live HTML + CSS generation** — a built-in "dev mode" that turns the scene
  into clean, framework-free HTML/CSS: box nodes become positioned/flex `<div>`s,
  paths & booleans become accurate inline SVG, gradients/effects/blend modes are
  emitted as real CSS.
- **Measurement readout** — select two objects to see horizontal/vertical gap and
  center distance.
- **Download a standalone `.html`** of the whole page with CSS inlined.

## Export

All generated **100% on your device**:

- **PNG** — the page, a single frame, or **batch-export all frames**; high-DPI (2×).
- **SVG** — clean, standards-based SVG with shared gradient `defs`, stroke
  dash/cap/join, per-corner radii, drop-shadow filters, blend modes, masks, and
  true Bézier curves. Export the whole page or a single node.
- **HTML / CSS** — see [Dev mode](#dev-mode-inspect-measure--code).

## Slices (export regions)

- Draw **named export regions** with the **Slice** tool (independent of the layer
  tree).
- Each slice exports its area as **PNG or SVG** from the Export panel; rename and
  delete slices there.

## Import

- **Images** — drag-and-drop or insert PNG/JPG/etc.
- **SVG import** — drop or insert an SVG and it's parsed into **editable vector and
  shape nodes** (rect, circle/ellipse, line, polyline, polygon, and paths),
  grouped at the drop point; falls back to placing it as an image if it can't be
  parsed.

## Files, autosave & the home screen

- **Home file browser** at `/` — create, open, **rename**, and **duplicate**
  files, organized into **Recent** and **All** sections, each with a live
  **thumbnail** rendered from its content.
- **On-device persistence** — an IndexedDB multi-file library plus the **File
  System Access API** for saving/opening real `.gwork` files on disk.
- **Debounced autosave** keeps your work safe as you go.
- **Open format** — documents are plain JSON, with automatic migration from older
  document versions.

## App shell & productivity

- **Command palette** (**Ctrl/Cmd + K**) — searchable tools, edits, boolean ops,
  export, and view commands.
- **Right-click context menus** on the canvas and the layers list, selection-aware.
- **Layers panel** — drag to reorder, lock/hide, nested tree, with an **Assets**
  tab for components, styles, and effect styles.
- **Inspector** — context-aware properties for the current selection.
- **Settings** — theme, snapping, grid + grid size (persisted on-device), and the
  analytics opt-out (only when analytics is configured).
- **Light / dark theme** with a persisted toggle.
- **Collapsible & resizable** left/right panels.
- **Keyboard-shortcut help** (**?**).
- **Undo / redo** with history, plus duplicate, copy/cut/paste, paste, select-all,
  and arrow-key nudging.

## Offline & installable (PWA)

- Installable **Progressive Web App** with an offline service worker
  (precache + stale-while-revalidate), so it works with no network at all — true
  to the local-first promise.

## Privacy & analytics

- **Local-first by architecture** — design content is saved to your disk and your
  browser's IndexedDB; nothing is uploaded.
- **Optional anonymous analytics** — Groundwork can count page visits and a couple
  of anonymous events (e.g. *export used*) via privacy-first
  [GoatCounter](https://www.goatcounter.com), **only** if a collector URL is
  configured at build time. It never sends document content, uses no cookies,
  respects **Do Not Track**, and can be turned off in **Settings**. When
  unconfigured (the default), the app makes **zero** outbound requests.

## Keyboard shortcuts

A few highlights (press **?** in the app for the full list):

| Action | Shortcut |
|--------|----------|
| Tools | **V** / **H** / **F** / **R** / **O** / **T** / **P** / **S** |
| Command palette | **Ctrl/Cmd + K** |
| Undo / redo | **Ctrl/Cmd + Z** / **Shift + Ctrl/Cmd + Z** |
| Copy / cut / paste | **Ctrl/Cmd + C** / **X** / **V** |
| Duplicate | **Ctrl/Cmd + D** |
| Group / ungroup | **Ctrl/Cmd + G** / **Shift + Ctrl/Cmd + G** |
| Select all | **Ctrl/Cmd + A** |
| Nudge | Arrow keys |
| Finish / cancel pen | **Enter** / **Esc** |
| Shortcut help | **?** |

---

*Everything above runs in your browser, on your device. No account, no sync, no
upload of file content.*
