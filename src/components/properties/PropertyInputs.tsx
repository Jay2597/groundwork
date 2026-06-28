import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { evalMath } from "@/lib/mathEval";

/**
 * Drag-to-scrub on a field label: horizontal drag adjusts the
 * value. Returns a pointer-down handler. `min` clamps the low end.
 */
export function makeScrub(
  value: number,
  step: number,
  onChange: (v: number) => void,
  min?: number,
) {
  return (e: ReactPointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = value;
    const fine = step < 1 ? step : 1;
    function move(ev: PointerEvent) {
      let next = startVal + (ev.clientX - startX) * fine;
      if (step >= 1) next = Math.round(next);
      if (min !== undefined) next = Math.max(min, next);
      onChange(next);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
    }
    document.body.style.cursor = "ew-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}

interface NumberFieldProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}

export function NumberField({ label, value, step = 1, min, onChange }: NumberFieldProps) {
  const rounded = Math.round(value * 100) / 100;
  // Local draft so users can type an expression ("120/2") before committing.
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const result = evalMath(draft);
    if (result !== null) {
      const clamped = min !== undefined ? Math.max(min, result) : result;
      onChange(clamped);
    }
    setDraft(null);
  }

  return (
    <label className="field">
      <span className="field-scrub" onPointerDown={makeScrub(value, step, onChange, min)}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? String(rounded)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

interface MixedNumberFieldProps {
  label: string;
  /** undefined → values differ across the selection ("Mixed"). */
  value: number | undefined;
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}

/** Like NumberField, but renders a "Mixed" placeholder when value is undefined. */
export function MixedNumberField({ label, value, step = 1, min, onChange }: MixedNumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const result = evalMath(draft);
    if (result !== null) onChange(min !== undefined ? Math.max(min, result) : result);
    setDraft(null);
  }

  const display = draft ?? (value === undefined ? "" : String(Math.round(value * 100) / 100));
  return (
    <label className="field">
      <span className="field-scrub" onPointerDown={value !== undefined ? makeScrub(value, step, onChange, min) : undefined}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={value === undefined ? "Mixed" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  async function pick() {
    try {
      const Dropper = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const result = await new Dropper().open();
      if (result?.sRGBHex) onChange(result.sRGBHex);
    } catch {
      // user cancelled — ignore
    }
  }

  return (
    <div className="color-field">
      <input
        className="color-dot"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
      <label className="field" style={{ flex: 1 }}>
        <span>{label === "Fill" || label === "Background" ? "#" : label}</span>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      {hasEyeDropper && (
        <button type="button" className="eyedropper" title="Pick a color from the screen" aria-label="Eyedropper" onClick={pick}>
          ⊙
        </button>
      )}
    </div>
  );
}

interface OpacityFieldProps {
  value: number;
  onChange: (value: number) => void;
}

export function OpacityField({ value, onChange }: OpacityFieldProps) {
  const pct = Math.round(value * 100);
  return (
    <div className="opacity-field">
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        className="opacity-slider"
        aria-label="Opacity"
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <label className="field opacity-num">
        <input
          type="number"
          min={0}
          max={100}
          value={pct}
          aria-label="Opacity percent"
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(Math.min(1, Math.max(0, n / 100)));
          }}
        />
        <span>%</span>
      </label>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="field field-stack">
      <span>{label}</span>
      <textarea
        className="field-textarea"
        value={value}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
