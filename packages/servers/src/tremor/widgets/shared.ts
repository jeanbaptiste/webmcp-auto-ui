// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Tremor helpers — React renderer + lazy Tremor loader
// ---------------------------------------------------------------------------

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

let _tremor: any = null;
let _cssInjected = false;

/** Lazy-load @tremor/react (single import, cached). */
export async function loadTremor(): Promise<any> {
  if (_tremor) return _tremor;
  const mod = await import('@tremor/react');
  _tremor = mod;
  return _tremor;
}

/**
 * Tremor relies on Tailwind utility classes. We inject a minimal CDN-based
 * Tailwind script once so the components render with correct styling even
 * when the host app does not ship a Tailwind pipeline.
 *
 * This is a best-effort: if the host app already defines Tailwind classes,
 * the CDN script is redundant but harmless.
 */
export async function ensureTailwind() {
  if (_cssInjected) return;
  _cssInjected = true;
  if (typeof document === 'undefined') return;
  // Check if Tailwind is likely already present (heuristic)
  if ((window as any).tailwind) return;
  const existing = document.getElementById('tremor-tailwind-cdn');
  if (existing) return;
  const script = document.createElement('script');
  script.id = 'tremor-tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
  // Give the CDN a tick to boot
  await new Promise((r) => setTimeout(r, 50));
}

/** Ensure container has a sensible minimum height. */
export function ensureSize(container: HTMLElement, minHeight = '300px') {
  if (!container.style.minHeight) container.style.minHeight = minHeight;
  if (!container.style.width) container.style.width = '100%';
}

/**
 * Mount a React element in `container`, return cleanup fn.
 * Used by every Tremor widget.
 */
export function mountReact(container: HTMLElement, element: any): () => void {
  const root = createRoot(container);
  root.render(element);
  return () => {
    try {
      root.unmount();
    } catch {
      // container may be detached — ignore
    }
  };
}

export { createElement };
