// ---------------------------------------------------------------------------
// Notebook loader — decode / fetch / normalize notebook state for the viewer.
// ---------------------------------------------------------------------------
//
// Supports three ingestion paths:
//   1. ?hs=<payload>   — full HyperSkill URL, client-side decode via SDK
//   2. ?n=<token>      — short token, fetched from /api/resolve?n=...
//   3. /:slug          — permanent published notebook, fetched from /api/p/:slug
//
// In every case we normalize to `{ kind, data }` where:
//   - `kind`  is the widget name (notebook-compact | notebook-workspace |
//              notebook-document | notebook-editorial). Defaults to
//              `notebook-compact` when the payload doesn't carry one.
//   - `data`  is the notebook state object (id, title, mode, cells, ...) with
//              `mode` forced to `'view'`.
// ---------------------------------------------------------------------------

import { decode, getHsParam, getShortToken } from '@webmcp-auto-ui/sdk';

export type NotebookKind =
  | 'notebook-compact'
  | 'notebook-workspace'
  | 'notebook-document'
  | 'notebook-editorial';

export interface NotebookPayload {
  kind: NotebookKind;
  data: Record<string, unknown>;
}

const SUPPORTED_KINDS: NotebookKind[] = [
  'notebook-compact',
  'notebook-workspace',
  'notebook-document',
  'notebook-editorial',
];

export class NotebookLoadError extends Error {
  constructor(public code: 'invalid' | 'unsupported' | 'not_found' | 'network', message: string) {
    super(message);
    this.name = 'NotebookLoadError';
  }
}

// ---------------------------------------------------------------------------
// Normalization — the share handler encodes the raw state directly (no wrapper).
// We accept both shapes: `{kind, data}` or a plain state object.
// ---------------------------------------------------------------------------

function coerceKind(raw: unknown): NotebookKind {
  if (typeof raw === 'string' && (SUPPORTED_KINDS as string[]).includes(raw)) {
    return raw as NotebookKind;
  }
  return 'notebook-compact';
}

export function normalizePayload(parsed: unknown): NotebookPayload {
  if (!parsed || typeof parsed !== 'object') {
    throw new NotebookLoadError('invalid', 'Notebook payload is not an object');
  }
  const obj = parsed as Record<string, unknown>;

  // Wrapped form: { kind, data }
  if (typeof obj.kind === 'string' && obj.data && typeof obj.data === 'object') {
    const kindStr = String(obj.kind);
    if (!(SUPPORTED_KINDS as string[]).includes(kindStr)) {
      throw new NotebookLoadError('unsupported', `Unsupported widget kind: ${kindStr}`);
    }
    const data = { ...(obj.data as Record<string, unknown>), mode: 'view' };
    return { kind: kindStr as NotebookKind, data };
  }

  // Plain state form: { id, title, cells, ... }
  if (Array.isArray(obj.cells)) {
    const kind = coerceKind((obj as { widget?: unknown }).widget);
    const data = { ...obj, mode: 'view' };
    return { kind, data };
  }

  throw new NotebookLoadError('invalid', 'Notebook payload has no recognizable shape');
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

export async function loadFromHsParam(fullUrl: string): Promise<NotebookPayload> {
  try {
    const { content } = await decode(fullUrl);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new NotebookLoadError('invalid', 'Decoded content is not JSON');
    }
    return normalizePayload(parsed);
  } catch (err) {
    if (err instanceof NotebookLoadError) throw err;
    throw new NotebookLoadError('invalid', 'Failed to decode HyperSkill link');
  }
}

export async function loadFromShortToken(token: string): Promise<NotebookPayload> {
  let res: Response;
  try {
    res = await fetch(`/api/resolve?n=${encodeURIComponent(token)}`, {
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new NotebookLoadError('network', 'Could not reach the resolver service');
  }
  if (res.status === 404) {
    throw new NotebookLoadError('not_found', 'Short link not found');
  }
  if (!res.ok) {
    throw new NotebookLoadError('network', `Resolver returned ${res.status}`);
  }
  const parsed = await res.json().catch(() => null);
  return normalizePayload(parsed);
}

export async function loadFromSlug(slug: string): Promise<NotebookPayload> {
  let res: Response;
  try {
    res = await fetch(`/api/p/${encodeURIComponent(slug)}`, {
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new NotebookLoadError('network', 'Could not reach the notebook service');
  }
  if (res.status === 404) {
    throw new NotebookLoadError('not_found', 'Notebook not found');
  }
  if (!res.ok) {
    throw new NotebookLoadError('network', `Server returned ${res.status}`);
  }
  const parsed = await res.json().catch(() => null);
  return normalizePayload(parsed);
}

// ---------------------------------------------------------------------------
// URL param discovery — resolves which loader to use given current location.
// ---------------------------------------------------------------------------

export type UrlIntent =
  | { kind: 'hs'; value: string }
  | { kind: 'short'; value: string }
  | { kind: 'none' };

export function detectIntent(href: string): UrlIntent {
  const hs = getHsParam(href);
  if (hs) return { kind: 'hs', value: hs };
  const n = getShortToken(href);
  if (n) return { kind: 'short', value: n };
  return { kind: 'none' };
}

// ---------------------------------------------------------------------------
// OG meta extraction — title from H1 in first markdown cell, description
// from first prose line stripped of markdown/HTML.
// ---------------------------------------------------------------------------

export interface NotebookMeta {
  title: string;
  description: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')       // html tags
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`[^`]*`/g, ' ')        // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/^#{1,6}\s+/gm, '')     // headings
    .replace(/[*_~>]/g, '')          // emphasis / blockquote
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractMeta(payload: NotebookPayload): NotebookMeta {
  const data = payload.data as { title?: unknown; cells?: unknown };
  let title = typeof data.title === 'string' && data.title.trim()
    ? data.title.trim()
    : '';
  let description = '';

  const cells = Array.isArray(data.cells) ? data.cells : [];
  for (const c of cells) {
    if (!c || typeof c !== 'object') continue;
    const cell = c as { type?: unknown; content?: unknown };
    if (cell.type !== 'md' || typeof cell.content !== 'string') continue;
    const lines = cell.content.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!title) {
      const h1 = lines.find((l) => /^#\s+/.test(l));
      if (h1) title = stripMarkdown(h1);
    }
    if (!description) {
      const prose = lines.find((l) => !/^#{1,6}\s/.test(l) && !/^[-*]\s/.test(l));
      if (prose) description = stripMarkdown(prose).slice(0, 200);
    }
    if (title && description) break;
  }

  return {
    title: title || 'Untitled notebook',
    description: description || 'A notebook shared on nb.hyperskills.net',
  };
}
