// ---------------------------------------------------------------------------
// Notebook loader — fetch + parse a HyperSkill standalone markdown.
// ---------------------------------------------------------------------------
//
// All published notebooks are now standalone markdown HyperSkill files :
//   ---
//   title: "..."
//   description: "..."
//   servers:
//     - name: foo
//       url: https://...
//   ---
//   <body with ```sql / ```js / ```ts fenced cells>
//
// The viewer fetches `/api/p/:slug` → `{ markdown, publishedAt, updatedAt? }`,
// then parses it client-side via `@webmcp-auto-ui/core::parseFrontmatter` and
// `@webmcp-auto-ui/sdk::parseBody`.
// ---------------------------------------------------------------------------

import { parseFrontmatter } from '@webmcp-auto-ui/core';
import { parseBody, type ParsedSegment } from '@webmcp-auto-ui/sdk';

export interface NotebookFrontmatter {
  title?: string;
  description?: string;
  servers?: Array<{ name: string; url: string }>;
  [key: string]: unknown;
}

export interface NotebookPayload {
  markdown: string;
  frontmatter: NotebookFrontmatter;
  body: string;
  segments: ParsedSegment[];
  publishedAt?: number;
  updatedAt?: number;
}

export class NotebookLoadError extends Error {
  constructor(public code: 'invalid' | 'not_found' | 'network', message: string) {
    super(message);
    this.name = 'NotebookLoadError';
  }
}

function normalizeFrontmatterServers(
  raw: unknown,
): Array<{ name: string; url: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      name: typeof s.name === 'string' ? s.name : '',
      url: typeof s.url === 'string' ? s.url : '',
    }))
    .filter((s) => s.name && s.url);
}

export function parseNotebookMarkdown(markdown: string): {
  frontmatter: NotebookFrontmatter;
  body: string;
  segments: ParsedSegment[];
} {
  const { frontmatter, body } = parseFrontmatter(markdown);
  const fm: NotebookFrontmatter = { ...(frontmatter as NotebookFrontmatter) };
  fm.servers = normalizeFrontmatterServers((frontmatter as { servers?: unknown }).servers);
  const segments = parseBody(body);
  return { frontmatter: fm, body, segments };
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
  const markdown = parsed?.markdown;
  if (typeof markdown !== 'string' || !markdown.trim()) {
    throw new NotebookLoadError('invalid', 'Notebook payload has no markdown');
  }
  const { frontmatter, body, segments } = parseNotebookMarkdown(markdown);
  return {
    markdown,
    frontmatter,
    body,
    segments,
    publishedAt: typeof parsed?.publishedAt === 'number' ? parsed.publishedAt : undefined,
    updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : undefined,
  };
}

// ---------------------------------------------------------------------------
// OG meta extraction — title from frontmatter or first H1, description from
// frontmatter or first prose line.
// ---------------------------------------------------------------------------

export interface NotebookMeta {
  title: string;
  description: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractMeta(payload: NotebookPayload): NotebookMeta {
  const fmTitle = typeof payload.frontmatter.title === 'string' ? payload.frontmatter.title.trim() : '';
  const fmDesc = typeof payload.frontmatter.description === 'string' ? payload.frontmatter.description.trim() : '';
  let title = fmTitle;
  let description = fmDesc;

  if (!title || !description) {
    const lines = payload.body.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!title) {
      const h1 = lines.find((l) => /^#\s+/.test(l));
      if (h1) title = stripMarkdown(h1);
    }
    if (!description) {
      const prose = lines.find((l) => !/^#{1,6}\s/.test(l) && !/^[-*]\s/.test(l) && !/^```/.test(l));
      if (prose) description = stripMarkdown(prose).slice(0, 200);
    }
  }

  return {
    title: title || 'Untitled notebook',
    description: description || 'A notebook shared on nb.hyperskills.net',
  };
}
