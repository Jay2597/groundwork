import type { ReactNode } from "react";

// Compact 16px line icons for inspector controls. One wrapper, many glyphs.

function I({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

// Arrange (z-order)
export const IcToFront = () => <I><rect x="4" y="4" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" opacity="0.35" /><rect x="9" y="9" width="11" height="11" rx="1.5" /></I>;
export const IcForward = () => <I><rect x="5" y="5" width="10" height="10" rx="1.5" /><path d="M19 9v10H9" /></I>;
export const IcBackward = () => <I><rect x="9" y="9" width="10" height="10" rx="1.5" /><path d="M5 15V5h10" /></I>;
export const IcToBack = () => <I><rect x="9" y="9" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" opacity="0.35" /><rect x="4" y="4" width="11" height="11" rx="1.5" /></I>;

// Boolean operations
export const IcUnion = () => <I><rect x="4" y="4" width="12" height="12" rx="1.5" /><rect x="8" y="8" width="12" height="12" rx="1.5" /></I>;
export const IcSubtract = () => <I><rect x="4" y="4" width="12" height="12" rx="1.5" /><rect x="8" y="8" width="12" height="12" rx="1.5" fill="var(--panel)" /></I>;
export const IcIntersect = () => <I><rect x="4" y="4" width="12" height="12" rx="1.5" opacity="0.5" /><rect x="8" y="8" width="12" height="12" rx="1.5" opacity="0.5" /><path d="M8 8h8v8H8z" fill="currentColor" stroke="none" /></I>;
export const IcExclude = () => <I><rect x="4" y="4" width="12" height="12" rx="1.5" /><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M8 8h8v8H8z" fill="var(--panel)" stroke="none" /></I>;

// Align
export const IcAlignLeft = () => <I><path d="M4 4v16" /><rect x="7" y="7" width="9" height="4" rx="1" fill="currentColor" stroke="none" /><rect x="7" y="14" width="6" height="4" rx="1" fill="currentColor" stroke="none" /></I>;
export const IcAlignHCenter = () => <I><path d="M12 4v16" /><rect x="6" y="7" width="12" height="4" rx="1" fill="currentColor" stroke="none" /><rect x="8" y="14" width="8" height="4" rx="1" fill="currentColor" stroke="none" /></I>;
export const IcAlignRight = () => <I><path d="M20 4v16" /><rect x="8" y="7" width="9" height="4" rx="1" fill="currentColor" stroke="none" /><rect x="11" y="14" width="6" height="4" rx="1" fill="currentColor" stroke="none" /></I>;
export const IcAlignTop = () => <I><path d="M4 4h16" /><rect x="7" y="7" width="4" height="9" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="7" width="4" height="6" rx="1" fill="currentColor" stroke="none" /></I>;
export const IcAlignVCenter = () => <I><path d="M4 12h16" /><rect x="7" y="6" width="4" height="12" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="8" width="4" height="8" rx="1" fill="currentColor" stroke="none" /></I>;
export const IcAlignBottom = () => <I><path d="M4 20h16" /><rect x="7" y="8" width="4" height="9" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="11" width="4" height="6" rx="1" fill="currentColor" stroke="none" /></I>;
export const IcDistributeH = () => <I><path d="M4 4v16M20 4v16" /><rect x="9" y="8" width="6" height="8" rx="1" fill="currentColor" stroke="none" /></I>;
export const IcDistributeV = () => <I><path d="M4 4h16M4 20h16" /><rect x="8" y="9" width="8" height="6" rx="1" fill="currentColor" stroke="none" /></I>;

// Misc
export const IcCorner = () => <I><path d="M5 19v-7a7 7 0 0 1 7-7h7" /></I>;

// Layer controls
export const IcEye = () => <I><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></I>;
export const IcEyeOff = () => <I><path d="M3 3l18 18" /><path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3.9-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></I>;
export const IcLock = () => <I><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></I>;
export const IcUnlock = () => <I><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></I>;

// Panel collapse
export const IcChevronLeft = () => <I><path d="M15 6l-6 6 6 6" /></I>;
export const IcChevronRight = () => <I><path d="M9 6l6 6-6 6" /></I>;
export const IcLayersGlyph = () => <I><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5M3 16l9 5 9-5" /></I>;
export const IcSliders = () => <I><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></I>;
