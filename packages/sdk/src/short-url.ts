// Domain-dependent short URL — compact token served from the skill's own domain.
// Not a dedicated subdomain: the skill host resolves `?n=<token>` to the full state.

import { hash } from './hyperskills.js';

/**
 * Build a short URL from a source URL and the content to share.
 * The short token is a prefix of the content hash, resolved server-side.
 */
export async function buildShortUrl(sourceUrl: string, content: string): Promise<string> {
  const h = await hash(sourceUrl, content);
  const token = h.slice(0, 10);
  const u = new URL(sourceUrl);
  u.search = '';
  u.searchParams.set('n', token);
  return u.toString();
}

/**
 * Read the short token from a URL or param string. Returns null if absent.
 */
export function getShortToken(urlOrParam: string): string | null {
  try {
    if (urlOrParam.startsWith('?') || urlOrParam.includes('=')) {
      const sp = new URLSearchParams(urlOrParam.replace(/^\?/, ''));
      return sp.get('n');
    }
    const u = new URL(urlOrParam);
    return u.searchParams.get('n');
  } catch {
    return null;
  }
}
