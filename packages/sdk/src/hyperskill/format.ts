/**
 * HyperSkill format — spec: https://hyperskills.net/
 * URL: https://example.com/page?hs=base64(content)
 * Compression: prefix "gz." for skills > 6KB
 * Traceability: SHA-256(source_url + content), chainable
 */

export interface HyperSkillMeta {
  title?: string;
  description?: string;
  version?: string;
  created?: string;
  mcp?: string;
  mcpName?: string;
  llm?: string;
  tags?: string[];
  hash?: string;
  previousHash?: string;
}

export interface HyperSkill {
  meta: HyperSkillMeta;
  content: unknown;
}

export interface HyperSkillVersion {
  hash: string;
  previousHash?: string;
  timestamp: number;
  skill: HyperSkill;
}

export async function encodeHyperSkill(
  skill: HyperSkill,
  sourceUrl?: string
): Promise<string> {
  const base = sourceUrl ?? (typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://example.com');
  const json = JSON.stringify(skill);
  const bytes = new TextEncoder().encode(json);
  let param: string;

  if (bytes.length > 6144 && typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const compressed = await new Response(cs.readable).arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
      param = 'gz.' + b64;
    } catch {
      param = btoa(unescape(encodeURIComponent(json)));
    }
  } else {
    param = btoa(unescape(encodeURIComponent(json)));
  }

  const url = new URL(base);
  url.searchParams.set('hs', param);
  return url.toString();
}

export async function decodeHyperSkill(urlOrParam: string): Promise<HyperSkill> {
  let param: string;
  if (urlOrParam.includes('=') || urlOrParam.includes('://') || urlOrParam.includes('?')) {
    try {
      const url = new URL(urlOrParam, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
      param = url.searchParams.get('hs') ?? urlOrParam;
    } catch {
      param = urlOrParam;
    }
  } else {
    param = urlOrParam;
  }

  if (param.startsWith('gz.') && typeof DecompressionStream !== 'undefined') {
    const b64 = param.slice(3);
    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(binary);
    writer.close();
    const json = await new Response(ds.readable).text();
    return JSON.parse(json) as HyperSkill;
  }

  const json = decodeURIComponent(escape(atob(param)));
  return JSON.parse(json) as HyperSkill;
}

export async function computeHash(sourceUrl: string, content: unknown): Promise<string> {
  const text = sourceUrl + JSON.stringify(content);
  const bytes = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createVersion(
  skill: HyperSkill,
  sourceUrl: string,
  previousHash?: string
): Promise<HyperSkillVersion> {
  const hash = await computeHash(sourceUrl, skill.content);
  return {
    hash,
    previousHash,
    timestamp: Date.now(),
    skill: { ...skill, meta: { ...skill.meta, hash, previousHash } },
  };
}

export function getHsParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('hs');
}

export function diffSkills(prev: unknown, next: unknown): string[] {
  if (typeof prev !== 'object' || typeof next !== 'object' || !prev || !next) {
    return prev !== next ? ['(root)'] : [];
  }
  const p = prev as Record<string, unknown>;
  const n = next as Record<string, unknown>;
  const keys = new Set([...Object.keys(p), ...Object.keys(n)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(p[k]) !== JSON.stringify(n[k])) changed.push(k);
  }
  return changed;
}
