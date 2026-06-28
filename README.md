# Groundwork

A **local-first, client-side design tool** that runs entirely in the browser. No server, no database, no cloud — your design files never leave your machine.

**Live:** https://jay2597.github.io/groundwork/

## Why local-first?

- **Privacy by architecture.** Files are saved to *your* disk (File System Access API) and autosaved to your browser's IndexedDB. Nothing is uploaded anywhere.
- **Zero hosting cost.** It's a static site — host it on any static host's free tier, or run it fully offline (installable PWA).
- **You own your format.** Documents are plain JSON (`.gwork`) and export to open SVG / PNG / HTML+CSS.

## Features

> 📖 **See [FEATURES.md](FEATURES.md) for the full, detailed feature tour.**

**Canvas & shapes**
- Infinite canvas with pan (Hand / **H**) and zoom-to-cursor; rulers with draggable guides; snapping & smart guides; grid.
- Rectangle, Ellipse, Text, Pen/path, plus Frames, Groups, and Boolean shapes.
- Image & SVG placement (drag-drop or insert).

**Editing**
- Marquee + shift multi-select, drag-move, resize/rotate, inline text editing (double-click).
- Align & distribute, z-order arrange, group/ungroup, frame selection, boolean ops, and **Flatten** to a compound vector.
- Per-corner radius (with on-canvas handles), gradients & multiple fills, strokes (dash/cap/join), drop shadows, constraints.
- Undo/redo, duplicate, copy/paste, arrow-key nudge, lock & hide layers, drag-to-reorder layers.

**Structure & systems**
- Multiple pages, components & instances, color & text styles, auto-layout (flex) frames.

**Prototyping & review**
- Prototype links + present mode; pinned local comments.

**Export**
- PNG and SVG (per-frame or batch), and live **HTML/CSS code** generation (with a downloadable standalone page).

**App**
- Command palette (**Ctrl/Cmd+K**), keyboard-shortcut help (**?**), settings, light/dark theme, collapsible & resizable panels, installable offline PWA.

## Getting started

```bash
npm install
npm run dev        # start the dev server (usually http://localhost:5173)
npm run build      # produce a static, hostable build in dist/
npm run typecheck
npm test           # unit tests (Vitest)
```

## Tech stack

| Concern | Choice |
|---------|--------|
| Build | Vite + React 18 + TypeScript |
| Canvas | Konva / react-konva |
| State | Zustand (with undo/redo history) |
| Disk save/open | File System Access API (+ download/upload fallback) |
| Autosave | IndexedDB via `idb-keyval` |
| Export | Client-side PNG, SVG, and HTML/CSS |

## Architecture

```
src/
├── types/        # document model + editor state types
├── store/        # Zustand stores (editor history/mutations, UI, prefs, theme)
├── lib/          # framework-free logic
│   ├── persistence/  # fileSystem (disk) + fileLibrary (IndexedDB)
│   ├── export/       # PNG + SVG + HTML/CSS exporters
│   ├── paint / flatten / transform / autolayout / constraints / snapping / zoom
│   └── nodeFactory   # node creation/duplication
├── hooks/        # useAutosave, useKeyboardShortcuts, useImage
├── components/   # canvas, panels, dialogs, overlays
└── styles/       # design tokens + global styles
```

The data model (`src/types/document.ts`) is the contract: a `GroundworkDocument`
holds pages, styles, and components, and everything serializes to JSON — so
"save" is just writing that JSON to a file the user picks.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages automatically
(`.github/workflows/deploy.yml`). The build is host-agnostic (relative asset
paths), so the `dist/` folder also works on any static host or from `file://`.

## License

© the repository owner. All rights reserved unless a license file is added.
