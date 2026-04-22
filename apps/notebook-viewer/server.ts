/**
 * notebook-viewer — minimal Node HTTP server for nb.hyperskills.net
 *
 * Serves the SvelteKit static build + a small KV API backed by the filesystem.
 *
 * Endpoints:
 *   POST /api/publish              → { state } body; stores as storage/published/<hash>.json
 *                                    returns { token, slug, hash } (idempotent by content hash)
 *   GET  /api/resolve?n=<token>    → returns the stored state JSON, 404 if not found
 *   GET  /api/p/:slug              → lookup by slug (which is currently the full hash),
 *                                    returns the stored state JSON
 *   GET  /api/health               → { ok, uptime }
 *   GET  /*                        → static files from ./build (SvelteKit static adapter),
 *                                    SPA fallback on ./build/index.html
 *
 * Runtime:
 *   - Node stdlib only (http, fs, crypto, path) — no deps
 *   - Node >= 18 (uses node:fs/promises, node:crypto.subtle not required)
 *   - Port: process.env.PORT (default 3011)
 *   - Storage dir: process.env.NOTEBOOK_STORAGE (default ./storage)
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
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

async function handlePublish(req: http.IncomingMessage, res: http.ServerResponse) {
  const body = await readBody(req);
  let parsed: any;
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch {
    return jsonResponse(res, 400, { error: 'invalid json' });
  }
  const state = parsed?.state ?? parsed;
  if (!state || typeof state !== 'object') {
    return jsonResponse(res, 400, { error: 'missing state' });
  }
  const hash = hashState(state);
  const token = hash.slice(0, 10);
  const slug = hash;
  const file = path.join(PUBLISHED_DIR, `${hash}.json`);
  try {
    await fsp.access(file);
    // already exists — idempotent
  } catch {
    await fsp.writeFile(file, JSON.stringify({ hash, publishedAt: Date.now(), state }), 'utf8');
  }
  return jsonResponse(res, 200, { token, slug, hash });
}

async function findByToken(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{4,64}$/.test(token)) return null;
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
    return jsonResponse(res, 200, parsed);
  } catch {
    return jsonResponse(res, 500, { error: 'read failed' });
  }
}

async function handleBySlug(res: http.ServerResponse, slug: string) {
  if (!/^[a-f0-9]{4,64}$/.test(slug)) return jsonResponse(res, 400, { error: 'invalid slug' });
  const file = await findByToken(slug);
  if (!file) return jsonResponse(res, 404, { error: 'not found' });
  try {
    const data = await fsp.readFile(file, 'utf8');
    const parsed = JSON.parse(data);
    return jsonResponse(res, 200, parsed);
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

    if (urlPath.startsWith('/api/p/') && method === 'GET') {
      const slug = urlPath.slice('/api/p/'.length);
      await handleBySlug(res, slug);
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
