interface LogoProps {
  size?: number;
  className?: string;
  /** Include the architectural ground hatch. Brand guide: only at 64px-ish+. */
  hatch?: boolean;
  /** When set, the mark is announced to screen readers; otherwise it's decorative. */
  title?: string;
}

/**
 * The Groundwork "Grounded Frame" mark — selection brackets on the ground line.
 * Defaults to the compact form (no hatch), which stays legible in app chrome.
 * Pass `hatch` for the full mark at hero sizes. Strokes use `currentColor`, so
 * wrap it in an element with `color: var(--amber)` (see the `.gw-logo` class).
 *
 * Geometry mirrors brand/master/mark-currentcolor.svg.
 */
export function Logo({ size = 24, className, hatch = false, title }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <g stroke="currentColor" strokeWidth={hatch ? 3.6 : 4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 16 V9 H18 M30 9 H37 V16 M11 22 V29 H18 M30 29 H37 V22" />
        <path d="M7 35 H41" />
      </g>
      {hatch && (
        <g stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.7} strokeLinecap="round">
          <path d="M15 39 L18.5 35 M22.5 39 L26 35 M30 39 L33.5 35" />
        </g>
      )}
    </svg>
  );
}
