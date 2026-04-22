// @ts-nocheck
// ---------------------------------------------------------------------------
// Share handlers — real implementations for notebook share modal.
// 4 formats: JSON, Markdown, Hyperskill link (+ short), PNG snapshot.
// ---------------------------------------------------------------------------

import { encode, buildShortUrl } from '@webmcp-auto-ui/sdk';
import type { NotebookState, NotebookCell } from './shared.js';

// ---------------------------------------------------------------------------
// JSON export
// ---------------------------------------------------------------------------

export async function shareAsJson(state: NotebookState): Promise<void> {
  const minimal = minify(state);
  const blob = new Blob([JSON.stringify(minimal, null, 2)], { type: 'application/json' });
  triggerDownload(blob, sanitizeFilename(state.title || 'notebook') + '.json');
}

// ---------------------------------------------------------------------------
// Markdown export
// ---------------------------------------------------------------------------

export async function shareAsMarkdown(state: NotebookState): Promise<void> {
  const md = serializeToMarkdown(state);
  const blob = new Blob([md], { type: 'text/markdown' });
  triggerDownload(blob, sanitizeFilename(state.title || 'notebook') + '.md');
}

function serializeToMarkdown(state: NotebookState): string {
  const parts: string[] = [];
  if (state.title) parts.push(`# ${state.title}`, '');
  for (const cell of state.cells) {
    if (cell.type === 'md') {
      parts.push(stripHtml(cell.content).trim(), '');
    } else {
      const lang = cell.type === 'sql' ? 'sql' : 'js';
      const varname = cell.varname ? ` // → ${cell.varname}` : '';
      parts.push('```' + lang + varname, cell.content.trim(), '```', '');
    }
  }
  return parts.join('\n').trim() + '\n';
}

function stripHtml(s: string): string {
  if (typeof document === 'undefined') return s;
  const d = document.createElement('div');
  d.innerHTML = s;
  return d.textContent || '';
}

// ---------------------------------------------------------------------------
// Hyperskill link (+ short URL)
// ---------------------------------------------------------------------------

export interface HyperskillShareResult {
  fullUrl: string;
  shortUrl: string;
}

export async function shareAsHyperskill(state: NotebookState): Promise<HyperskillShareResult> {
  const origin = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://example.com';
  const payload = JSON.stringify(minify(state));
  const fullUrl = await encode(origin, payload);
  const shortUrl = await buildShortUrl(origin, payload);
  try {
    await navigator.clipboard?.writeText(fullUrl);
  } catch {
    /* clipboard API can fail silently (focus, permission) */
  }
  return { fullUrl, shortUrl };
}

// ---------------------------------------------------------------------------
// PNG snapshot — uses __exportPng widget hook (commit ded48c9) if present,
// falls back to a library-free DOM → SVG → PNG pipeline.
// ---------------------------------------------------------------------------

export async function shareAsPng(state: NotebookState, container: HTMLElement): Promise<void> {
  // Preferred: widget-level hook
  const hook = (container as any).__exportPng as (() => Promise<Blob>) | undefined;
  if (typeof hook === 'function') {
    try {
      const blob = await hook();
      triggerDownload(blob, sanitizeFilename(state.title || 'notebook') + '.png');
      return;
    } catch {
      /* fall through to fallback */
    }
  }
  // Fallback: SVG foreignObject → canvas → PNG
  const blob = await domToPngBlob(container);
  triggerDownload(blob, sanitizeFilename(state.title || 'notebook') + '.png');
}

async function domToPngBlob(el: HTMLElement): Promise<Blob> {
  const rect = el.getBoundingClientRect();
  const w = Math.max(1, Math.ceil(rect.width));
  const h = Math.max(1, Math.ceil(rect.height));
  const serialized = new XMLSerializer().serializeToString(el);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>
    </foreignObject>
  </svg>`;
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

// ---------------------------------------------------------------------------
// Dispatcher used by shared.ts::openShareModal callback
// ---------------------------------------------------------------------------

export type ShareKind = 'hyperskill' | 'json' | 'markdown' | 'png';

export interface ShareResultInfo {
  fmt: string;
  kind: ShareKind | string;
  message: string;
  url?: string;
  shortUrl?: string;
  fullUrl?: string;
}

export interface ShareDispatchOptions {
  container?: HTMLElement;
  onResult?: (info: ShareResultInfo) => void;
}

export async function dispatchShare(
  fmt: string,
  state: NotebookState,
  opts: ShareDispatchOptions = {},
): Promise<void> {
  try {
    if (fmt === 'json') {
      await shareAsJson(state);
      opts.onResult?.({ fmt, kind: 'json', message: 'JSON downloaded' });
    } else if (fmt === 'md' || fmt === 'markdown') {
      await shareAsMarkdown(state);
      opts.onResult?.({ fmt, kind: 'markdown', message: 'Markdown downloaded' });
    } else if (fmt === 'hyperskill' || fmt === 'hs') {
      const { fullUrl, shortUrl } = await shareAsHyperskill(state);
      opts.onResult?.({
        fmt,
        kind: 'hyperskill',
        message: 'URL copied',
        url: shortUrl || fullUrl,
        shortUrl,
        fullUrl,
      });
    } else if (fmt === 'png') {
      if (!opts.container) throw new Error('png export requires container');
      await shareAsPng(state, opts.container);
      opts.onResult?.({ fmt, kind: 'png', message: 'PNG downloaded' });
    } else {
      throw new Error(`Unknown share format: ${fmt}`);
    }
  } catch (err: any) {
    opts.onResult?.({ fmt, kind: fmt, message: 'Error: ' + String(err?.message ?? err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip non-serializable / transient fields from state for share/encode.
 */
function minify(state: NotebookState): Record<string, unknown> {
  return {
    id: state.id,
    title: state.title,
    mode: state.mode,
    kicker: state.kicker,
    cells: state.cells.map((c: NotebookCell) => ({
      id: c.id,
      type: c.type,
      content: c.content,
      name: c.name,
      varname: c.varname,
      hideSource: c.hideSource,
      hideResult: c.hideResult,
      comment: c.comment ?? undefined,
      // intentionally skip lastResult, runState, lastMs — transient
    })),
  };
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '') || 'notebook';
}
