import { useUiStore } from "@/store/uiStore";
import { usePrefsStore } from "@/store/prefsStore";
import { useThemeStore } from "@/store/themeStore";
import { analyticsConfigured } from "@/lib/analytics";
import "./settings.css";

/** On-device preferences dialog. */
export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const snapping = usePrefsStore((s) => s.snapping);
  const showGrid = usePrefsStore((s) => s.showGrid);
  const gridSize = usePrefsStore((s) => s.gridSize);
  const analytics = usePrefsStore((s) => s.analytics);
  const setPref = usePrefsStore((s) => s.setPref);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <header className="dialog-head">
          <h2>Settings</h2>
          <button className="dialog-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="dialog-body">
          <section className="set-row">
            <div>
              <div className="set-title">Theme</div>
              <div className="set-sub">Light or dark — stored on this device.</div>
            </div>
            <div className="seg">
              <div className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>Dark</div>
              <div className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>Light</div>
            </div>
          </section>

          <section className="set-row">
            <div>
              <div className="set-title">Smart snapping</div>
              <div className="set-sub">Align to edges, centers and equal spacing while dragging.</div>
            </div>
            <Toggle on={snapping} onChange={(v) => setPref("snapping", v)} />
          </section>

          <section className="set-row">
            <div>
              <div className="set-title">Show grid</div>
              <div className="set-sub">Dotted background grid on the canvas.</div>
            </div>
            <Toggle on={showGrid} onChange={(v) => setPref("showGrid", v)} />
          </section>

          <section className="set-row">
            <div>
              <div className="set-title">Grid size</div>
              <div className="set-sub">Spacing of the dotted grid, in pixels.</div>
            </div>
            <input
              className="set-num"
              type="number"
              min={4}
              max={200}
              value={gridSize}
              onChange={(e) => setPref("gridSize", Math.max(4, Number(e.target.value) || 24))}
            />
          </section>

          {analyticsConfigured() && (
            <section className="set-row">
              <div>
                <div className="set-title">Anonymous usage stats</div>
                <div className="set-sub">Counts visits and a few actions (e.g. export) — never your designs. No cookies, no account.</div>
              </div>
              <Toggle on={analytics} onChange={(v) => setPref("analytics", v)} />
            </section>
          )}

          <p className="set-foot">Your designs never leave your device. No account, no sync, no upload of file content.</p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle${on ? " on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="toggle-knob" />
    </button>
  );
}
