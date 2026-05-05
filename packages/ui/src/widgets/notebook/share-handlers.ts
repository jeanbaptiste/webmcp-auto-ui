// @ts-nocheck
// ---------------------------------------------------------------------------
// Share handlers — real implementations for notebook share modal.
// 4 formats: JSON, Markdown, Hyperskill link (+ short), PNG snapshot.
// ---------------------------------------------------------------------------

import { encode, buildShortUrl } from '@webmcp-auto-ui/sdk';
import { canvasVanilla } from '@webmcp-auto-ui/sdk/canvas-vanilla';
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

/**
 * Serialize a notebook state as a HyperSkill standalone markdown:
 *   ---
 *   title: "..."
 *   description: "..."
 *   servers:
 *     - name: foo
 *       url: https://...
 *   ---
 *   <body with ```sql / ```js fenced cells>
 *
 * Re-parsable via @webmcp-auto-ui/core::parseFrontmatter + @webmcp-auto-ui/sdk::parseBody.
 */
export function serializeToMarkdown(state: NotebookState): string {
  const fm = buildFrontmatter(state);
  const parts: string[] = [];
  if (fm) parts.push(fm);
  if (state.title) parts.push(`# ${state.title}`, '');
  for (const cell of state.cells) {
    if (cell.type === 'md') {
      parts.push(stripHtml(cell.content).trim(), '');
    } else {
      const lang = cell.type === 'sql' ? 'sql' : 'js';
      const varname = cell.varname ? ` // → ${cell.varname}` : '';
      const commentPrefix = cell.type === 'sql' ? '--' : '//';
      const metaLine = cell.args && Object.keys(cell.args).length > 0
        ? `${commentPrefix} @meta ${JSON.stringify(cell.args)}\n`
        : '';
      parts.push('```' + lang + varname, metaLine + cell.content.trim(), '```', '');
    }
  }
  return parts.join('\n').trim() + '\n';
}

/**
 * Emit YAML frontmatter for HyperSkill format. Reads connected MCP servers from
 * the canvas store. Returns '' when nothing useful to declare (no title, no
 * description, no servers) — caller can skip prepending.
 */
function buildFrontmatter(state: NotebookState): string {
  const title = (state.title || '').trim();
  const description = extractDescription(state);
  const servers = collectEnabledServers();
  const webmcpServers = collectEnabledWebmcpServers(state);
  if (!title && !description && servers.length === 0 && webmcpServers.length === 0) return '';

  const lines: string[] = ['---'];
  if (title) lines.push(`title: ${yamlQuote(title)}`);
  if (description) lines.push(`description: ${yamlQuote(description)}`);
  if (servers.length > 0) {
    lines.push('servers:');
    for (const s of servers) {
      lines.push(`  - name: ${yamlQuote(s.name)}`);
      lines.push(`    url: ${yamlQuote(s.url)}`);
    }
  }
  if (webmcpServers.length > 0) {
    // YAML flow-style for compactness (registry ids, no spaces).
    lines.push(`webmcp_servers: [${webmcpServers.map(yamlQuote).join(', ')}]`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

/**
 * Registry ids (e.g. 'autoui', 'd3', 'observable-plot') of bundled WebMCP
 * servers active in this notebook. Read just-in-time from a host-supplied
 * getter on `state` — bypasses canvas to avoid notify cascades on the host's
 * left pane. The viewer re-instantiates servers from @webmcp-auto-ui/servers
 * on load.
 */
function collectEnabledWebmcpServers(state: NotebookState): string[] {
  try {
    const ids = state.enabledServerIds?.() ?? [];
    return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function extractDescription(state: NotebookState): string {
  for (const cell of state.cells) {
    if (cell.type !== 'md') continue;
    const text = stripHtml(cell.content).trim();
    if (!text) continue;
    // First non-heading line of the first md cell.
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const prose = lines.find((l) => !/^#{1,6}\s/.test(l) && !/^[-*]\s/.test(l));
    if (prose) return prose.slice(0, 200);
  }
  return '';
}

function collectEnabledServers(): { name: string; url: string }[] {
  try {
    const servers = canvasVanilla.dataServers ?? [];
    return servers
      .filter((s: any) => s?.enabled && s?.url && s?.name && s.name !== 'autoui' && s.kind !== 'ui' && s.kind !== 'webmcp')
      .map((s: any) => ({ name: String(s.name), url: String(s.url) }));
  } catch {
    return [];
  }
}

/** Quote a YAML scalar safely. Conservative: always double-quote. */
function yamlQuote(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
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
