// Privacy-first, opt-out analytics via GoatCounter. This is the only outbound
// request the app can make, and it is a hard no-op unless a GoatCounter endpoint
// is configured at build time (VITE_GOATCOUNTER_URL). It NEVER sends document
// content or anything identifying — only anonymous page paths and event names.
// Respects Do Not Track and a user opt-out toggle.

import { usePrefsStore } from "@/store/prefsStore";

interface GoatCounter {
  count: (vars: { path: string; title?: string; event?: boolean }) => void;
  no_onload?: boolean;
  allow_local?: boolean;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

const ENDPOINT: string = (import.meta.env.VITE_GOATCOUNTER_URL as string | undefined)?.trim() ?? "";
const SCRIPT_SRC = "https://gc.zgo.at/count.js";

/** Whether an analytics endpoint was configured for this build. */
export function analyticsConfigured(): boolean {
  return ENDPOINT.length > 0;
}

/** Browser "Do Not Track" signal. */
export function doNotTrack(nav: { doNotTrack?: string | null } = navigator): boolean {
  return nav.doNotTrack === "1" || nav.doNotTrack === "yes";
}

/**
 * Pure gate: should we track at all? Requires a configured endpoint, user
 * opt-in, and no Do Not Track. Kept pure so it's unit-testable.
 */
export function shouldTrack(configured: boolean, optedIn: boolean, dnt: boolean): boolean {
  return configured && optedIn && !dnt;
}

/** Normalize a hash-router location into a coarse, non-identifying path. */
export function normalizePath(hash: string): string {
  // e.g. "#/editor/abc123" → "/editor"; "#/" → "/"; strips ids/queries.
  const raw = hash.replace(/^#/, "").split("?")[0] || "/";
  if (raw.startsWith("/editor")) return "/editor";
  if (raw.startsWith("/welcome")) return "/welcome";
  return raw === "" ? "/" : raw;
}

/** Sanitize a custom-event name to a short, safe slug. */
export function sanitizeEvent(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function enabled(): boolean {
  return shouldTrack(analyticsConfigured(), usePrefsStore.getState().analytics, doNotTrack());
}

let loaded = false;

/** Inject the GoatCounter script once (manual-count mode). */
export function initAnalytics(): void {
  if (loaded || !enabled() || typeof document === "undefined") return;
  loaded = true;
  window.goatcounter = { ...(window.goatcounter ?? {}), no_onload: true, allow_local: false } as GoatCounter;
  const s = document.createElement("script");
  s.async = true;
  s.src = SCRIPT_SRC;
  s.setAttribute("data-goatcounter", ENDPOINT);
  document.head.appendChild(s);
}

/** Count an (anonymous) page view for a coarse path. */
export function trackPageview(hash: string): void {
  if (!enabled()) return;
  initAnalytics();
  window.goatcounter?.count?.({ path: normalizePath(hash) });
}

/** Count an (anonymous) named event — no content, just the name. */
export function trackEvent(name: string): void {
  if (!enabled()) return;
  initAnalytics();
  window.goatcounter?.count?.({ path: sanitizeEvent(name), event: true });
}
