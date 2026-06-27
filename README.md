# Groundwork

A **local-first, client-side design tool** — a Figma-style editor that runs entirely in the browser. No server, no database, no cloud. Your design files never leave your machine.

> Scaffolded MVP. The foundation is in place: canvas editing, layers, properties, local file save/open, autosave, and export — all client-side.

## Why local-first?

- **Privacy by architecture.** Files are saved to *your* disk (File System Access API) and autosaved to your browser's IndexedDB. Nothing is uploaded anywhere.
- **Zero hosting cost.** It's a static site — host it on any static host's free tier, or run it offline.
- **You own your format.** Documents are plain JSON (`.gwork`) and export to open SVG/PNG.

## Tech stack

| Concern | Choice |
|---------|--------|
| Build | Vite + React 18 + TypeScript |
| Canvas | Konva / react-konva |
| State | Zustand (with undo/redo history) |
| Disk save/open | File System Access API (+ download/upload fallback) |
| Autosave | IndexedDB via `idb-keyval` |
| Export | Client-side PNG (stage raster) + SVG (serializer) |

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # produce a static, hostable build in dist/
npm run typecheck
```

Open the dev URL Vite prints (usually http://localhost:5173).

## What works today (P0)

- Infinite canvas with pan (Hand / **H**) and zoom-to-cursor (scroll wheel)
- Shape tools: Rectangle (**R**), Ellipse (**O**), Text (**T**), Move/select (**V**)
- Drag-to-draw, click-select, shift multi-select, drag-move, resize + rotate handles
- Layers panel: reorder awareness, show/hide, select
- Properties panel: position, size, rotation, fill, opacity, corner radius, text content/size, z-order arrange, canvas frame size/background
- Undo/redo (**Ctrl/Cmd+Z**, **Ctrl/Cmd+Shift+Z**), duplicate (**Ctrl/Cmd+D**), delete
- Save/Open `.gwork` files to disk · autosave to IndexedDB · export PNG & SVG

## Architecture

```
src/
├── types/        # document model + editor state types
├── store/        # Zustand editor store (history, mutations)
├── lib/          # framework-free logic
│   ├── persistence/  # fileSystem (disk) + localDb (IndexedDB)
│   ├── export/       # PNG + SVG exporters
│   └── nodeFactory   # node creation/duplication
├── hooks/        # useAutosave, useKeyboardShortcuts
├── components/   # canvas/ toolbar/ layers/ properties/ topbar/
└── styles/       # design tokens + global styles
```

The data model (`src/types/document.ts`) is the contract: a `GroundworkDocument` is
just `{ version, name, canvas, nodes[] }`. Everything serializes to JSON, so
"save" is `JSON.stringify` to a file the user picks.

## Roadmap (next)

- **P1:** components/instances, design tokens (color/text styles), auto-layout (flex), pen/path tool + boolean ops, image fills, snapping/smart guides, grouping/frames, multi-select transform.
- **P2:** prototyping links + preview mode, CSS/Tailwind code export, `.svg`/`.fig` import, on-device AI (WebGPU background removal), optional P2P collaboration (Yjs + WebRTC, no central server).

## License

TBD by project owner. Note: this is original code; if you port any logic from
Penpot (MPL-2.0), keep those ported files under MPL-2.0.
