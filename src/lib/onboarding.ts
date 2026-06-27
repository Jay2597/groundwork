// First-run flag, stored locally (no account, no server).

const KEY = "gw:onboarded";

export function isOnboarded(): boolean {
  return localStorage.getItem(KEY) === "1";
}

export function markOnboarded(): void {
  localStorage.setItem(KEY, "1");
}
