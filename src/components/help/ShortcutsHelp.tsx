import { useUiStore } from "@/store/uiStore";
import "./help.css";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Tools",
    items: [
      ["V", "Move / select"],
      ["F", "Frame"],
      ["R", "Rectangle"],
      ["O", "Ellipse"],
      ["T", "Text"],
      ["P", "Pen"],
      ["H", "Hand (pan)"],
    ],
  },
  {
    title: "Edit",
    items: [
      ["Ctrl Z", "Undo"],
      ["Ctrl Shift Z", "Redo"],
      ["Ctrl C / V / X", "Copy / paste / cut"],
      ["Ctrl D", "Duplicate"],
      ["Ctrl A", "Select all"],
      ["Ctrl G", "Group"],
      ["Ctrl Shift G", "Ungroup"],
      ["Delete", "Delete"],
      ["Arrows", "Nudge (Shift = 10px)"],
      ["[ / ]", "Send backward / forward"],
    ],
  },
  {
    title: "View",
    items: [
      ["Ctrl K", "Command palette"],
      ["Ctrl +/−", "Zoom in / out"],
      ["Ctrl 0", "Zoom to 100%"],
      ["Ctrl 1", "Zoom to fit"],
      ["Ctrl 2", "Zoom to selection"],
      ["?", "This help"],
      ["Esc", "Deselect / close"],
    ],
  },
  {
    title: "Canvas",
    items: [
      ["Double-click text", "Edit inline"],
      ["Drag from ruler", "Create a guide"],
      ["Drop image / SVG", "Place on canvas"],
      ["Drag corner dot", "Round corners"],
    ],
  },
];

/** A keyboard-shortcut cheat sheet (press ?). */
export function ShortcutsHelp() {
  const open = useUiStore((s) => s.helpOpen);
  const setOpen = useUiStore((s) => s.setHelpOpen);
  if (!open) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="dialog help-dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
        <header className="dialog-head">
          <h2>Keyboard shortcuts</h2>
          <button className="dialog-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        </header>
        <div className="dialog-body help-grid">
          {GROUPS.map((g) => (
            <section key={g.title} className="help-group">
              <div className="help-title">{g.title}</div>
              {g.items.map(([keys, label]) => (
                <div key={label} className="help-row">
                  <span className="help-label">{label}</span>
                  <span className="help-keys">
                    {keys.split(" ").map((k) => (
                      <kbd key={k} className="kbd">{k}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
