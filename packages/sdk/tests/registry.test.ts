import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSkill, updateSkill, deleteSkill, getSkill, listSkills,
  clearSkills, loadSkills, loadDemoSkills, onSkillsChange,
} from '../src/skills/registry.js';

beforeEach(() => clearSkills());

describe('createSkill', () => {
  it('creates a skill with generated id', () => {
    const s = createSkill({ name: 'test', blocks: [], tags: [] });
    expect(s.id).toMatch(/^sk_/);
    expect(s.name).toBe('test');
    expect(s.createdAt).toBeGreaterThan(0);
  });

  it('stores mcp and mcpName', () => {
    const s = createSkill({ name: 'x', mcp: 'https://mcp.example.com', mcpName: 'example', blocks: [], tags: [] });
    expect(s.mcp).toBe('https://mcp.example.com');
    expect(s.mcpName).toBe('example');
  });
});

describe('updateSkill', () => {
  it('updates an existing skill', () => {
    const s = createSkill({ name: 'old', blocks: [], tags: [] });
    const updated = updateSkill(s.id, { name: 'new' });
    expect(updated?.name).toBe('new');
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(s.createdAt);
  });

  it('returns null for unknown id', () => {
    expect(updateSkill('nonexistent', { name: 'x' })).toBeNull();
  });
});

describe('deleteSkill', () => {
  it('removes a skill', () => {
    const s = createSkill({ name: 'del', blocks: [], tags: [] });
    expect(deleteSkill(s.id)).toBe(true);
    expect(getSkill(s.id)).toBeUndefined();
  });

  it('returns false for unknown id', () => {
    expect(deleteSkill('ghost')).toBe(false);
  });
});

describe('listSkills', () => {
  it('returns skills sorted by createdAt desc', async () => {
    createSkill({ name: 'a', blocks: [], tags: [] });
    await new Promise(r => setTimeout(r, 2));
    createSkill({ name: 'b', blocks: [], tags: [] });
    const list = listSkills();
    expect(list[0].name).toBe('b');
    expect(list[1].name).toBe('a');
  });
});

describe('onSkillsChange', () => {
  it('fires callback on create', () => {
    let count = 0;
    const unsub = onSkillsChange(() => count++);
    createSkill({ name: 'x', blocks: [], tags: [] });
    expect(count).toBe(1);
    unsub();
    createSkill({ name: 'y', blocks: [], tags: [] });
    expect(count).toBe(1); // unsubscribed
  });
});

describe('loadDemoSkills', () => {
  it('loads 3 demo skills with mcp/mcpName', () => {
    loadDemoSkills();
    const skills = listSkills();
    expect(skills.length).toBe(3);
    expect(skills.every(s => s.mcp === 'https://mcp.code4code.eu/mcp')).toBe(true);
    expect(skills.every(s => s.mcpName === 'tricoteuses')).toBe(true);
  });

  it('does not overwrite existing skills', () => {
    createSkill({ name: 'mine', blocks: [], tags: [] });
    loadDemoSkills();
    expect(listSkills().length).toBe(1);
  });
});

describe('loadSkills', () => {
  it('replaces all skills', () => {
    createSkill({ name: 'old', blocks: [], tags: [] });
    const now = Date.now();
    loadSkills([{ id: 'sk_x', name: 'new', blocks: [], tags: [], createdAt: now, updatedAt: now }]);
    const list = listSkills();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('new');
  });
});
