// @webmcp-auto-ui/sdk — public API

// HyperSkill types
export interface HyperSkillMeta {
  title?: string;
  description?: string;
  version?: string;
  created?: string;
  mcp?: string;
  mcpName?: string;
  llm?: string;
  tags?: string[];
  theme?: Record<string, string>;
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

// HyperSkill format — adapters over the hyperskills package
import { encode, decode, hash, getHsParam, diff } from 'hyperskills';

export { getHsParam };
export const diffSkills = diff;

export async function encodeHyperSkill(skill: HyperSkill, sourceUrl?: string): Promise<string> {
  const base = sourceUrl ?? (typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://example.com');
  return encode(base, JSON.stringify(skill));
}

export async function decodeHyperSkill(urlOrParam: string): Promise<HyperSkill> {
  const { content } = await decode(urlOrParam);
  return JSON.parse(content) as HyperSkill;
}

export async function computeHash(sourceUrl: string, content: unknown): Promise<string> {
  return hash(sourceUrl, JSON.stringify(content));
}

export async function createVersion(skill: HyperSkill, sourceUrl: string, previousHash?: string): Promise<HyperSkillVersion> {
  const h = await computeHash(sourceUrl, skill.content);
  return {
    hash: h,
    previousHash,
    timestamp: Date.now(),
    skill: { ...skill, meta: { ...skill.meta, hash: h, previousHash } },
  };
}

// Skills registry
export {
  createSkill,
  updateSkill,
  deleteSkill,
  getSkill,
  listSkills,
  clearSkills,
  loadSkills,
  loadDemoSkills,
  onSkillsChange,
} from './skills/registry.js';
export type { Skill, SkillBlock } from './skills/registry.js';

// Canvas store — browser-only (Svelte 5 runes), import directly from src:
// import { canvas } from '@webmcp-auto-ui/sdk/canvas'
