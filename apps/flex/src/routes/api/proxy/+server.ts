/**
 * /api/proxy — fetch external text resources from an allow-listed set of hosts.
 *
 * Used by the +md / +recipe "URL" tab in notebook modals so the browser can pull
 * raw content without running into CORS.
 *
 * Limits: 1 MB body, 10s timeout, text/JSON content-types only.
 */
import { error, type RequestHandler } from '@sveltejs/kit';

const ALLOWED_HOSTS = new Set<string>([
  'github.com',
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'gist.github.com',
  'gitlab.com',
  'codeberg.org',
  'hyperskills.net',
  'demos.hyperskills.net',
  'nb.hyperskills.net',
]);

const MAX_BYTES = 1_000_000; // 1 MB
const TIMEOUT_MS = 10_000;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: corsHeaders });

export const GET: RequestHandler = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) throw error(400, 'missing url param');

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    throw error(400, 'invalid url');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw error(400, 'unsupported protocol');
  }
  if (!ALLOWED_HOSTS.has(u.hostname)) {
    throw error(403, `host not allowed: ${u.hostname}`);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'webmcp-auto-ui proxy',
        Accept: 'text/*, application/json;q=0.9, application/xml;q=0.8, */*;q=0.1',
      },
    });
    if (!res.ok) throw error(res.status, `upstream ${res.status}`);

    const ct = res.headers.get('content-type') || 'text/plain';
    if (!/^(text\/|application\/json|application\/ld\+json|application\/xml|application\/xhtml\+xml)/i.test(ct)) {
      throw error(415, `unsupported content-type: ${ct}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw error(500, 'no body');

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          ctrl.abort();
          throw error(413, 'body too large');
        }
        chunks.push(value);
      }
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.byteLength;
    }

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders,
      },
    });
  } catch (e: any) {
    if (e?.status) throw e;
    if (e?.name === 'AbortError') throw error(504, 'proxy timeout');
    throw error(502, 'proxy failed: ' + (e?.message ?? 'unknown'));
  } finally {
    clearTimeout(timer);
  }
};
