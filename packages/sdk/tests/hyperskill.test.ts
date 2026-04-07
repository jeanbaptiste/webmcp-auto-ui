import { describe, it, expect } from 'vitest';
import { computeHash, diffSkills, decodeHyperSkill, encodeHyperSkill } from '../src/index.js';

describe('computeHash', () => {
  it('returns a 64-char hex SHA-256', async () => {
    const hash = await computeHash('https://example.com', { foo: 'bar' });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    const a = await computeHash('https://x.com', { n: 1 });
    const b = await computeHash('https://x.com', { n: 1 });
    expect(a).toBe(b);
  });

  it('differs for different inputs', async () => {
    const a = await computeHash('https://x.com', { n: 1 });
    const b = await computeHash('https://x.com', { n: 2 });
    expect(a).not.toBe(b);
  });
});

describe('diffSkills', () => {
  it('returns empty for identical objects', () => {
    expect(diffSkills({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toEqual([]);
  });

  it('detects changed keys', () => {
    const changed = diffSkills({ a: 1, b: 2 }, { a: 1, b: 3 });
    expect(changed).toContain('b');
    expect(changed).not.toContain('a');
  });

  it('detects added keys', () => {
    const changed = diffSkills({ a: 1 }, { a: 1, b: 2 });
    expect(changed).toContain('b');
  });

  it('detects removed keys', () => {
    const changed = diffSkills({ a: 1, b: 2 }, { a: 1 });
    expect(changed).toContain('b');
  });

  it('handles non-object inputs', () => {
    expect(diffSkills('x', 'x')).toEqual([]);
    expect(diffSkills('x', 'y')).toContain('(root)');
  });
});

describe('encodeHyperSkill / decodeHyperSkill', () => {
  // jsdom provides TextEncoder/TextDecoder and crypto.subtle
  it('round-trips a skill', async () => {
    const skill = {
      meta: { title: 'test', mcp: 'https://mcp.example.com', mcpName: 'example' },
      content: { blocks: [{ type: 'stat', data: { label: 'KPI', value: '42' } }] },
    };
    const url = await encodeHyperSkill(skill, 'https://example.com/viewer');
    expect(url).toContain('?hs=');

    const decoded = await decodeHyperSkill(url);
    expect(decoded.meta.title).toBe('test');
    expect(decoded.meta.mcp).toBe('https://mcp.example.com');
    const content = decoded.content as typeof skill.content;
    expect(content.blocks[0].type).toBe('stat');
  });

  it('decodes from raw base64 param', async () => {
    const skill = { meta: { title: 'raw' }, content: { x: 1 } };
    const url = await encodeHyperSkill(skill, 'https://example.com');
    const param = new URL(url).searchParams.get('hs')!;
    const decoded = await decodeHyperSkill(param);
    expect(decoded.meta.title).toBe('raw');
  });
});
