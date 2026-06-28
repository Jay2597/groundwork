import type { ReactNode } from "react";
import { useEditorStore } from "@/store/editorStore";
import { insertImageFromPicker } from "@/lib/placeImage";
import type { Tool } from "@/types/editor";

interface ToolDef {
  id: Tool;
  label: string;
  hint: string;
  icon: ReactNode;
}

const TOOLS: ToolDef[] = [
  {
    id: "select",
    label: "Move",
    hint: "V",
    icon: <path d="M4 3l7 17 2-7 7-2z" />,
  },
  {
    id: "hand",
    label: "Hand",
    hint: "H",
    icon: (
      <path d="M8 13V5a1.5 1.5 0 013 0v6m0-1a1.5 1.5 0 013 0v2m0-1a1.5 1.5 0 013 0v4a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-3a1.5 1.5 0 012-2l1 1" />
    ),
  },
  {
    id: "frame",
    label: "Frame",
    hint: "F",
    icon: <path d="M8 3v18M16 3v18M3 8h18M3 16h18" />,
  },
  {
    id: "rect",
    label: "Rectangle",
    hint: "R",
    icon: <rect x="4" y="5" width="16" height="14" rx="2" />,
  },
  {
    id: "ellipse",
    label: "Ellipse",
    hint: "O",
    icon: <circle cx="12" cy="12" r="8" />,
  },
  {
    id: "text",
    label: "Text",
    hint: "T",
    icon: <path d="M5 6h14M12 6v13" />,
  },
  {
    id: "pen",
    label: "Pen",
    hint: "P",
    icon: <path d="M12 19l7-7-4-4-7 7-1 5z M5 19l3-1" />,
  },
  {
    id: "slice",
    label: "Slice",
    hint: "S",
    icon: <path d="M5 5l14 14M9 5H5v4M19 15v4h-4" />,
  },
];

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <div className="tools" role="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className="tool"
          aria-pressed={tool === t.id}
          aria-label={`${t.label} (${t.hint})`}
          title={`${t.label} — ${t.hint}`}
          onClick={() => setTool(t.id)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {t.icon}
          </svg>
        </button>
      ))}
      <button
        className="tool"
        aria-label="Insert image or SVG"
        title="Insert image / SVG"
        onClick={() => void insertImageFromPicker()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M21 17l-5-5-4 4-2-2-7 7" />
        </svg>
      </button>
    </div>
  );
}
