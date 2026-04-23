/**
 * notebook-viewer — minimal Node HTTP server for nb.hyperskills.net
 *
 * Serves the SvelteKit static build + a small KV API backed by the filesystem.
 *
 * Endpoints:
 *   POST   /api/publish            → { state, slug?, token? } body.
 *                                    - First publish (no slug): generates slug from title + random suffix,
 *                                      generates auth token, stores file. Returns { slug, token, updated:false, url }.
 *                                    - Update (slug + token): verifies token match, overwrites state,
 *                                      preserves publishedAt, sets updatedAt. Returns { slug, token, updated:true, url }.
 *                                    - 404 if slug not found, 403 if token mismatch.
 *   DELETE /api/p/:slug            → requires X-Publish-Token header matching stored token.
 *                                    404 if absent, 403 if mismatch, 200 { deleted:true } otherwise.
 *   GET    /api/resolve?n=<token>  → returns the stored state JSON, 404 if not found (legacy hash lookup).
 *   GET    /api/p                  → list of published notebooks (max 200),
 *                                    sorted by publishedAt DESC. Items:
 *                                    { slug, title, description, publishedAt, updatedAt? }.
 *   GET    /api/p/:slug            → returns { state, publishedAt, updatedAt } — token stripped out.
 *   GET    /api/health             → { ok, uptime }
 *   GET    /*                      → static files from ./build (SvelteKit static adapter),
 *                                    SPA fallback on ./build/index.html
 *
 * Runtime:
 *   - Node stdlib only (http, fs, crypto, path) — no deps
 *   - Node >= 18 (uses node:fs/promises, node:crypto.subtle not required)
 *   - Port: process.env.PORT (default 3011)
 *   - Storage dir: process.env.NOTEBOOK_STORAGE (default ./storage)
 *
 * Usage (curl examples):
 *
 *   # 1) First publish — server generates slug + token
 *   curl -X POST https://nb.hyperskills.net/api/publish \
 *        -H 'Content-Type: application/json' \
 *        -d '{"state":{"title":"My Notebook","cells":[]}}'
 *   # → { "slug":"my-notebook-aB3xYz", "token":"…", "updated":false,
 *   #     "url":"https://nb.hyperskills.net/p/my-notebook-aB3xYz" }
 *
 *   # 2) Update existing notebook — requires slug + token from step 1
 *   curl -X POST https://nb.hyperskills.net/api/publish \
 *        -H 'Content-Type: application/json' \
 *        -d '{"state":{"title":"My Notebook","cells":[…updated…]},
 *             "slug":"my-notebook-aB3xYz","token":"…"}'
 *   # → { "slug":"my-notebook-aB3xYz", "token":"…", "updated":true, "url":"…" }
 *
 *   # 3) Delete — requires X-Publish-Token header
 *   curl -X DELETE https://nb.hyperskills.net/api/p/my-notebook-aB3xYz \
 *        -H 'X-Publish-Token: …'
 *   # → { "deleted":true }
 *
 * Install (phase 3, on bot):
 *   scp -r apps/notebook-viewer/build bot:/opt/webmcp-demos/notebook-viewer/
 *   scp apps/notebook-viewer/server.js bot:/opt/webmcp-demos/notebook-viewer/
 *   sudo systemctl enable --now notebook-viewer.service
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { randomBytes } from 'node:crypto';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT) || 3011;
const STORAGE = path.resolve(process.env.NOTEBOOK_STORAGE || './storage');
const BUILD = path.resolve('./build');
const PUBLISHED_DIR = path.join(STORAGE, 'published');
const MAX_BODY = 1_000_000; // 1 MB
const START = Date.now();

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function log(method: string, urlPath: string, status: number, ms: number) {
  // eslint-disable-next-line no-console
  console.log(`[nb-viewer] ${method} ${urlPath} → ${status} (${ms}ms)`);
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Publish-Token',
    'Access-Control-Max-Age': '86400',
  };
}

function deriveSlug(title: string): string {
  const base = String(title ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'notebook';
}

function randomSuffix(n: number): string {
  return randomBytes(Math.max(4, Math.ceil(n * 0.75))).toString('base64url').slice(0, n);
}

function isValidSlug(slug: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(slug);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown, extra?: Record<string, string>) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(buf.byteLength),
    ...corsHeaders(),
    ...(extra || {}),
  });
  // For HEAD requests, send headers (including Content-Length) but no body.
  if ((res.req?.method || '').toUpperCase() === 'HEAD') {
    res.end();
    return;
  }
  res.end(buf);
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.byteLength;
      if (total > MAX_BODY) {
        // eslint-disable-next-line no-console
        console.warn(`[nb-viewer] body cap exceeded (${total} > ${MAX_BODY} bytes) on ${req.method} ${req.url || ''} from ${req.socket?.remoteAddress || '?'}`);
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function hashState(state: unknown): string {
  const canonical = JSON.stringify(state);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

async function ensureStorage() {
  await fsp.mkdir(PUBLISHED_DIR, { recursive: true });
}

function publishedFileFor(slug: string): string {
  return path.join(PUBLISHED_DIR, `${slug}.json`);
}

async function handlePublish(req: http.IncomingMessage, res: http.ServerResponse) {
  const body = await readBody(req);
  let parsed: any;
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch {
    return jsonResponse(res, 400, { error: 'invalid json' });
  }
  const state = parsed?.state;
  if (!state || typeof state !== 'object') {
    return jsonResponse(res, 400, { error: 'missing state' });
  }

  const reqSlug: string | undefined = typeof parsed?.slug === 'string' ? parsed.slug : undefined;
  const reqToken: string | undefined = typeof parsed?.token === 'string' ? parsed.token : undefined;

  // CAS A — update existing
  if (reqSlug && reqToken) {
    if (!isValidSlug(reqSlug)) {
      return jsonResponse(res, 400, { error: 'invalid slug' });
    }
    const file = publishedFileFor(reqSlug);
    let existing: any;
    try {
      const data = await fsp.readFile(file, 'utf8');
      existing = JSON.parse(data);
    } catch {
      return jsonResponse(res, 404, { error: 'slug not found' });
    }
    const existingToken: string = String(existing?.token ?? '');
    if (!existingToken || !timingSafeEqualStr(existingToken, reqToken)) {
      return jsonResponse(res, 403, { error: 'invalid token' });
    }
    const publishedAt = Number(existing?.publishedAt) || Date.now();
    const updatedAt = Date.now();
    await fsp.writeFile(
      file,
      JSON.stringify({ state, token: existingToken, publishedAt, updatedAt }),
      'utf8',
    );
    return jsonResponse(res, 200, {
      slug: reqSlug,
      token: existingToken,
      updated: true,
      url: `https://nb.hyperskills.net/p/${reqSlug}`,
    });
  }

  // CAS B — first publish
  const titleSource: string =
    (typeof state.title === 'string' && state.title) ||
    (typeof state.kicker === 'string' && state.kicker) ||
    '';
  const base = deriveSlug(titleSource);
  // Ensure uniqueness — very unlikely to collide, but retry a few times just in case.
  let slug = `${base}-${randomSuffix(6)}`;
  for (let i = 0; i < 5; i++) {
    try {
      await fsp.access(publishedFileFor(slug));
      // collision — regenerate
      slug = `${base}-${randomSuffix(6)}`;
    } catch {
      break;
    }
  }
  const token = randomBytes(24).toString('base64url');
  const publishedAt = Date.now();
  await fsp.writeFile(
    publishedFileFor(slug),
    JSON.stringify({ state, token, publishedAt }),
    'utf8',
  );
  return jsonResponse(res, 200, {
    slug,
    token,
    updated: false,
    url: `https://nb.hyperskills.net/p/${slug}`,
  });
}

async function handleDelete(req: http.IncomingMessage, res: http.ServerResponse, slug: string) {
  if (!isValidSlug(slug)) {
    return jsonResponse(res, 400, { error: 'invalid slug' });
  }
  const rawToken = req.headers['x-publish-token'];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!token || typeof token !== 'string') {
    return jsonResponse(res, 403, { error: 'invalid token' });
  }
  const file = publishedFileFor(slug);
  let existing: any;
  try {
    const data = await fsp.readFile(file, 'utf8');
    existing = JSON.parse(data);
  } catch {
    return jsonResponse(res, 404, { error: 'not found' });
  }
  const existingToken: string = String(existing?.token ?? '');
  if (!existingToken || !timingSafeEqualStr(existingToken, token)) {
    return jsonResponse(res, 403, { error: 'invalid token' });
  }
  try {
    await fsp.unlink(file);
  } catch {
    return jsonResponse(res, 500, { error: 'delete failed' });
  }
  return jsonResponse(res, 200, { deleted: true });
}

async function findByToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(token)) return null;
  const entries = await fsp.readdir(PUBLISHED_DIR).catch(() => [] as string[]);
  const match = entries.find((e) => e.startsWith(token) && e.endsWith('.json'));
  return match ? path.join(PUBLISHED_DIR, match) : null;
}

async function handleResolve(res: http.ServerResponse, token: string | null) {
  if (!token) return jsonResponse(res, 400, { error: 'missing n param' });
  const file = await findByToken(token);
  if (!file) return jsonResponse(res, 404, { error: 'not found' });
  try {
    const data = await fsp.readFile(file, 'utf8');
    const parsed = JSON.parse(data);
    const { token: _token, ...publicFields } = parsed ?? {};
    return jsonResponse(res, 200, publicFields);
  } catch {
    return jsonResponse(res, 500, { error: 'read failed' });
  }
}

// -----------------------------------------------------------------------------
// GET /api/p — list published notebooks (index page).
// Returns up to 200 entries sorted by publishedAt DESC, shape:
//   [{ slug, title, description, publishedAt, updatedAt? }, ...]
// -----------------------------------------------------------------------------

function stripMarkdownInline(text: string): string {
  return String(text ?? '')
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

function extractIndexMeta(state: any): { title: string; description: string } {
  let title = (typeof state?.title === 'string' && state.title.trim()) ? state.title.trim() : '';
  let description = '';
  const cells = Array.isArray(state?.cells) ? state.cells : [];
  for (const c of cells) {
    if (!c || typeof c !== 'object') continue;
    const type = (c as any).type;
    const content = (c as any).content;
    if (type !== 'md' || typeof content !== 'string') continue;
    const lines = content.split('\n').map((l: string) => l.trim()).filter(Boolean);
    if (!title) {
      const h1 = lines.find((l: string) => /^#\s+/.test(l));
      if (h1) title = stripMarkdownInline(h1);
    }
    if (!description) {
      const prose = lines.find((l: string) => !/^#{1,6}\s/.test(l) && !/^[-*]\s/.test(l));
      if (prose) description = stripMarkdownInline(prose).slice(0, 200);
    }
    if (title && description) break;
  }
  return {
    title: title || 'Untitled notebook',
    description: description || '',
  };
}

async function handleListIndex(res: http.ServerResponse) {
  let entries: string[];
  try {
    entries = await fsp.readdir(PUBLISHED_DIR);
  } catch {
    return jsonResponse(res, 200, []);
  }
  const items: Array<{
    slug: string;
    title: string;
    description: string;
    publishedAt: number;
    updatedAt?: number;
  }> = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const slug = entry.slice(0, -'.json'.length);
    if (!isValidSlug(slug)) continue;
    const file = path.join(PUBLISHED_DIR, entry);
    try {
      const raw = await fsp.readFile(file, 'utf8');
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      const meta = extractIndexMeta(state);
      const publishedAt = Number(parsed?.publishedAt) || 0;
      const updatedAt = parsed?.updatedAt != null ? Number(parsed.updatedAt) : undefined;
      items.push({
        slug,
        title: meta.title,
        description: meta.description,
        publishedAt,
        ...(updatedAt ? { updatedAt } : {}),
      });
    } catch {
      // skip unreadable/corrupt entries silently
    }
  }

  items.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  return jsonResponse(res, 200, items.slice(0, 200));
}

async function handleBySlug(res: http.ServerResponse, slug: string) {
  if (!isValidSlug(slug)) return jsonResponse(res, 400, { error: 'invalid slug' });
  // Prefer direct slug lookup (new format). Fall back to legacy hash-prefix scan
  // so historical /api/p/<hash> links keep working.
  let file: string | null = publishedFileFor(slug);
  try {
    await fsp.access(file);
  } catch {
    file = await findByToken(slug);
  }
  if (!file) return jsonResponse(res, 404, { error: 'not found' });
  try {
    const data = await fsp.readFile(file, 'utf8');
    const parsed = JSON.parse(data);
    // Strip auth token from public response.
    const { token: _token, ...publicFields } = parsed ?? {};
    return jsonResponse(res, 200, publicFields);
  } catch {
    return jsonResponse(res, 500, { error: 'read failed' });
  }
}

function safeJoin(root: string, rel: string): string | null {
  const joined = path.join(root, rel);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, urlPath: string): Promise<number> {
  let rel = decodeURIComponent(urlPath.replace(/^\/+/, ''));
  if (rel === '' || rel.endsWith('/')) rel = path.join(rel, 'index.html');
  let fullPath = safeJoin(BUILD, rel);
  if (!fullPath) {
    res.writeHead(400);
    res.end('bad path');
    return 400;
  }
  try {
    const stat = await fsp.stat(fullPath);
    if (stat.isDirectory()) {
      fullPath = path.join(fullPath, 'index.html');
      await fsp.stat(fullPath);
    }
  } catch {
    // fallback SPA → index.html
    fullPath = path.join(BUILD, 'index.html');
    try {
      await fsp.stat(fullPath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return 404;
    }
  }
  const ext = path.extname(fullPath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const stat = await fsp.stat(fullPath);
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': String(stat.size),
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  if ((req.method || '').toUpperCase() === 'HEAD') {
    res.end();
    return 200;
  }
  const stream = fs.createReadStream(fullPath);
  stream.pipe(res);
  return 200;
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const rawMethod = req.method || 'GET';
  // Treat HEAD like GET for routing — jsonResponse + serveStatic drop the body.
  const method = rawMethod === 'HEAD' ? 'GET' : rawMethod;
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const urlPath = reqUrl.pathname;

  // CORS preflight for /api/*
  if (rawMethod === 'OPTIONS' && urlPath.startsWith('/api/')) {
    res.writeHead(204, corsHeaders());
    res.end();
    log(method, urlPath, 204, Date.now() - started);
    return;
  }

  try {
    if (urlPath === '/api/health' && method === 'GET') {
      jsonResponse(res, 200, { ok: true, uptime: Math.floor((Date.now() - START) / 1000) });
      log(method, urlPath, 200, Date.now() - started);
      return;
    }

    if (urlPath === '/api/publish' && method === 'POST') {
      await handlePublish(req, res);
      log(method, urlPath, res.statusCode, Date.now() - started);
      return;
    }

    if (urlPath === '/api/resolve' && method === 'GET') {
      const token = reqUrl.searchParams.get('n');
      await handleResolve(res, token);
      log(method, urlPath, res.statusCode, Date.now() - started);
      return;
    }

    if ((urlPath === '/api/p' || urlPath === '/api/p/') && method === 'GET') {
      await handleListIndex(res);
      log(method, urlPath, res.statusCode, Date.now() - started);
      return;
    }

    if (urlPath.startsWith('/api/p/') && method === 'GET') {
      const slug = urlPath.slice('/api/p/'.length);
      await handleBySlug(res, slug);
      log(method, urlPath, res.statusCode, Date.now() - started);
      return;
    }

    if (urlPath.startsWith('/api/p/') && method === 'DELETE') {
      const slug = urlPath.slice('/api/p/'.length);
      await handleDelete(req, res, slug);
      log(method, urlPath, res.statusCode, Date.now() - started);
      return;
    }

    if (urlPath.startsWith('/api/')) {
      jsonResponse(res, 404, { error: 'unknown endpoint' });
      log(method, urlPath, 404, Date.now() - started);
      return;
    }

    // static
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain', Allow: 'GET, HEAD' });
      res.end('method not allowed');
      log(method, urlPath, 405, Date.now() - started);
      return;
    }
    const status = await serveStatic(req, res, urlPath);
    log(method, urlPath, status, Date.now() - started);
  } catch (err: any) {
    const status = err?.status || 500;
    if (!res.headersSent) jsonResponse(res, status, { error: err?.message || 'internal error' });
    else try { res.end(); } catch {}
    log(method, urlPath, status, Date.now() - started);
  }
});

ensureStorage().then(() => {
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[nb-viewer] listening on :${PORT} (storage=${STORAGE}, build=${BUILD})`);
  });
});
