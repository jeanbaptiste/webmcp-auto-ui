/**
 * UI scale — binary 1× / 1.5× toggle, labeled as "2×" in the UI for affordance.
 *
 * Implementation: CSS `zoom` on `<html>`, driven by a custom property set
 * imperatively. This rescales everything uniformly (fonts, icons, borders,
 * modals, widgets) while keeping layout reflow (contrary to `transform: scale`).
 *
 * Persistence: `localStorage['webmcp-ui-scale']` — "x1" | "x2".
 */

export type UIScale = 1 | 1.5;
export type UIScaleKey = 'x1' | 'x2';

const STORAGE_KEY = 'webmcp-ui-scale';
const STYLE_ID = 'webmcp-ui-scale-style';

function injectStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // Scoped to <html>; falls back to 1 when the variable is unset.
  style.textContent = `html { zoom: var(--ui-scale, 1); }`;
  document.head.appendChild(style);
}

function applyScale(scale: UIScale): void {
  if (typeof document === 'undefined') return;
  injectStyle();
  const root = document.documentElement;
  root.style.setProperty('--ui-scale', String(scale));
  root.dataset.uiScale = scale === 1 ? 'x1' : 'x2';
  try {
    window.dispatchEvent(new CustomEvent('webmcp:ui-scale-change', { detail: { scale } }));
  } catch { /* ignore */ }
}

function readStored(): UIScale {
  if (typeof localStorage === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'x2') return 1.5;
    return 1;
  } catch { return 1; }
}

function writeStored(scale: UIScale): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, scale === 1 ? 'x1' : 'x2'); } catch { /* ignore */ }
}

/** Current scale value. Safe to call before init. */
export function getUIScale(): UIScale {
  if (typeof document === 'undefined') return readStored();
  const key = document.documentElement.dataset.uiScale;
  if (key === 'x2') return 1.5;
  if (key === 'x1') return 1;
  return readStored();
}

/** True when the UI is currently displayed at 1.5× (label "2×" in the UI). */
export function isUIScaled(): boolean {
  return getUIScale() !== 1;
}

/** Set the scale explicitly. Persists + applies. */
export function setUIScale(scale: UIScale): void {
  writeStored(scale);
  applyScale(scale);
}

/** Toggle between 1× and 1.5×. Returns the new scale. */
export function toggleUIScale(): UIScale {
  const next: UIScale = getUIScale() === 1 ? 1.5 : 1;
  setUIScale(next);
  return next;
}

/**
 * Read persisted scale and apply it. Call once at app boot (e.g. in a root
 * +layout onMount) to restore the user's preference before first paint.
 * Safe to call multiple times.
 */
export function initUIScale(): void {
  applyScale(readStored());
}
