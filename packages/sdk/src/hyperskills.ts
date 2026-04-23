/**
 * Typed wrapper around the pure-JS `hyperskills` package.
 * This avoids "no declaration file" errors in strict TS
 * without requiring hyperskills to ship its own types.
 *
 * `encode` is overridden locally with a chunked base64url implementation
 * to avoid O(n²) string concat on mobile for large payloads, and to
 * surface a clear error when CompressionStream is unavailable
 * (e.g. iOS Safari < 16.4).
 */

// @ts-ignore — hyperskills is intentionally pure JS
import * as hs from 'hyperskills';

// Chunked base64url — avoids char-by-char concat (quadratic on iOS Safari)
function toBase64urlChunked(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)) as number[],
    );
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function compressGzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (!('CompressionStream' in globalThis)) {
    throw new Error('CompressionStream indisponible (iOS 16.4+ requis)');
  }
  // @ts-ignore — CompressionStream is part of the DOM lib but may be missing in older TS targets
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  // Copy into a fresh Uint8Array to guarantee the underlying buffer is a plain
  // ArrayBuffer (not SharedArrayBuffer/ArrayBufferLike) — required by
  // WritableStreamDefaultWriter<BufferSource> under TS 5.x strict lib.
  writer.write(new Uint8Array(bytes));
  writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

export async function encode(
  sourceUrl: string,
  content: string,
  options: { compress?: 'gz' | 'br' | 'none' } = {},
): Promise<string> {
  const compress = options.compress ?? 'gz';
  const bytes = new TextEncoder().encode(content);
  let param: string;

  if (compress === 'gz') {
    const compressed = await compressGzip(bytes);
    param = 'gz.' + toBase64urlChunked(compressed);
  } else if (compress === 'br') {
    // Delegate to the upstream JS implementation (Node-only path).
    return hs.encode(sourceUrl, content, options);
  } else {
    param = toBase64urlChunked(bytes);
  }

  const url = new URL(sourceUrl);
  url.searchParams.set('hs', param);
  return url.toString();
}

export const decode: (
  urlOrParam: string,
) => Promise<{ sourceUrl: string; content: string }> = hs.decode;

export const hash: (
  sourceUrl: string,
  content: string,
  previousHash?: string,
) => Promise<string> = hs.hash;

export const diff: (prev: unknown, next: unknown) => unknown = hs.diff;

/**
 * Get the ?hs= param from a URL string or the current browser URL.
 * When called with a URL argument, parses that URL.
 * When called without arguments, reads window.location.search.
 */
export function getHsParam(url?: string): string | null {
  if (url) {
    try {
      const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
      return parsed.searchParams.get('hs');
    } catch {
      return null;
    }
  }
  if (typeof window === 'undefined') return null;
  return hs.getHsParam();
}

export const createVersion: (
  sourceUrl: string,
  content: string,
  previousHash?: string,
) => Promise<{ hash: string; content: string }> = hs.createVersion;

export const sign: (hashHex: string, privateKey: CryptoKey) => Promise<string> = hs.sign;

export const verify: (
  hashHex: string,
  signatureB64: string,
  publicKey: CryptoKey,
) => Promise<boolean> = hs.verify;

export const generateKeyPair: () => Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}> = hs.generateKeyPair;
