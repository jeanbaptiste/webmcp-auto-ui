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

/**
 * Normalize various data shapes into the Tremor chart contract:
 *   `{ data: [{indexKey, ...categoryKeys}], index: string, categories: string[] }`
 *
 * Accepted inputs:
 *   - Native: caller already passed `{data, index, categories}` → returned as-is.
 *   - Parallel arrays: `{x:[], y:[]}` (with optional `series:[]` for grouping).
 *     Aliases for x: labels, categories, category, index. Aliases for y:
 *     value, values, counts, count.
 *   - Objects array: caller passed `{data: [{...}]}` without `index` —
 *     auto-detect first string field as index and first numeric as category.
 */
export function normalizeChartData(input: any): {
  data: any[];
  index: string;
  categories: string[];
} {
  if (!input) return { data: [], index: 'x', categories: ['y'] };

  // Native Tremor shape — pass through
  if (Array.isArray(input.data) && typeof input.index === 'string' && Array.isArray(input.categories)) {
    return { data: input.data, index: input.index, categories: input.categories };
  }

  const xArr = pickArr(input, ['x', 'labels', 'categories', 'category', 'index', 'keys']);
  const yArr = pickArr(input, ['y', 'value', 'values', 'counts', 'count']);
  const series = pickArr(input, ['series', 'group', 'groups']);

  if (xArr && yArr) {
    if (series && series.length === xArr.length) {
      // Pivot multi-series into wide format: one row per x, columns per series
      const seriesKeys: string[] = [];
      const byX = new Map<any, any>();
      for (let i = 0; i < Math.min(xArr.length, yArr.length); i++) {
        const sk = String(series[i]);
        if (!seriesKeys.includes(sk)) seriesKeys.push(sk);
        const key = xArr[i];
        if (!byX.has(key)) byX.set(key, { x: key });
        byX.get(key)[sk] = yArr[i];
      }
      return { data: [...byX.values()], index: 'x', categories: seriesKeys };
    }
    const data = xArr.map((xv: any, i: number) => ({ x: xv, y: yArr[i] }));
    return { data, index: 'x', categories: ['y'] };
  }

  // Plain array of objects
  if (Array.isArray(input.data) && input.data.length) {
    const first = input.data[0];
    if (first && typeof first === 'object') {
      const keys = Object.keys(first);
      const idx = input.index || keys.find((k) => typeof first[k] === 'string') || keys[0];
      const cats = Array.isArray(input.categories) && input.categories.length
        ? input.categories
        : keys.filter((k) => k !== idx && typeof first[k] === 'number');
      return { data: input.data, index: idx, categories: cats.length ? cats : [keys[1] ?? 'y'] };
    }
    return { data: input.data, index: input.index ?? 'x', categories: input.categories ?? ['y'] };
  }

  return { data: [], index: 'x', categories: ['y'] };
}

function pickArr(obj: any, keys: string[]): any[] | null {
  for (const k of keys) if (Array.isArray(obj?.[k])) return obj[k];
  return null;
}

/**
 * Render a visible "no data" hint inside `container` and return a cleanup fn.
 */
export function renderTremorEmpty(container: HTMLElement, widgetId: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      Pass <code>{data: [{label, value}, ...], index: "label", categories: ["value"]}</code><br>
      or <code>{x: [...], y: [...]}</code> as a shortcut.
    </div>`;
  return () => { container.innerHTML = ''; };
}
