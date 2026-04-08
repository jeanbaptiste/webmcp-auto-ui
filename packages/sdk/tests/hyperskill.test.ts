import { describe, it, expect } from 'vitest';
import { hash, diff, decode, encode } from '../src/index.js';

describe('hash', () => {
  it('returns a 64-char hex SHA-256', async () => {
    const h = await hash('https://example.com', JSON.stringify({ foo: 'bar' }));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    const a = await hash('https://x.com', JSON.stringify({ n: 1 }));
    const b = await hash('https://x.com', JSON.stringify({ n: 1 }));
    expect(a).toBe(b);
  });

  it('differs for different inputs', async () => {
    const a = await hash('https://x.com', JSON.stringify({ n: 1 }));
    const b = await hash('https://x.com', JSON.stringify({ n: 2 }));
    expect(a).not.toBe(b);
  });
});

describe('diff', () => {
  it('returns empty for identical objects', () => {
    expect(diff({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toEqual([]);
  });

  it('detects changed keys', () => {
    const changed = diff({ a: 1, b: 2 }, { a: 1, b: 3 });
    expect(changed).toContain('b');
    expect(changed).not.toContain('a');
  });

  it('detects added keys', () => {
    const changed = diff({ a: 1 }, { a: 1, b: 2 });
    expect(changed).toContain('b');
  });

  it('detects removed keys', () => {
    const changed = diff({ a: 1, b: 2 }, { a: 1 });
    expect(changed).toContain('b');
  });

  it('handles non-object inputs', () => {
    expect(diff('x', 'x')).toEqual([]);
    expect(diff('x', 'y')).toContain('(root)');
  });
});

describe('encode / decode', () => {
  // jsdom provides TextEncoder/TextDecoder and crypto.subtle
  it('round-trips a skill', async () => {
    const skill = {
      meta: { title: 'test', mcp: 'https://mcp.example.com', mcpName: 'example' },
      content: { blocks: [{ type: 'stat', data: { label: 'KPI', value: '42' } }] },
    };
    const url = await encode('https://example.com/viewer', JSON.stringify(skill));
    expect(url).toContain('?hs=');

    const { content: raw } = await decode(url);
    const decoded = JSON.parse(raw);
    expect(decoded.meta.title).toBe('test');
    expect(decoded.meta.mcp).toBe('https://mcp.example.com');
    expect(decoded.content.blocks[0].type).toBe('stat');
  });

  it('decodes from raw base64 param', async () => {
    const skill = { meta: { title: 'raw' }, content: { x: 1 } };
    const url = await encode('https://example.com', JSON.stringify(skill));
    const param = new URL(url).searchParams.get('hs')!;
    const { content: raw } = await decode(param);
    const decoded = JSON.parse(raw);
    expect(decoded.meta.title).toBe('raw');
  });
});
