// @webmcp-auto-ui/sdk — public API

// HyperSkill types — project-specific vocabulary for skill serialization
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
  chatSummary?: string;
  provenance?: {
    mcpServers?: (string | { name: string; url: string })[];
    toolsUsed?: string[];
    toolCallCount?: number;
    skillsReferenced?: string[];
    llm?: string;
    exportedAt?: string;
  };
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

// HyperSkill encoding — powered by the `hyperskills` NPM package.
// Raw functions re-exported for direct access:
export { encode, decode, hash, diff, getHsParam } from './hyperskills.js';

// Typed convenience wrappers — prefer these in apps:
import { encode, decode, hash, diff } from './hyperskills.js';

export async function encodeHyperSkill(skill: HyperSkill, sourceUrl?: string): Promise<string> {
  const base = sourceUrl ?? (typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://example.com');
  const json = JSON.stringify(skill);
  return encode(base, json, { compress: 'gz' });
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

export const diffSkills = diff;

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

// MCP demo servers
export { MCP_DEMO_SERVERS } from './mcp-demo-servers.js';
export type { McpDemoServer } from './mcp-demo-servers.js';

// Canvas store — browser-only (Svelte 5 runes), import directly from src:
// import { canvas } from '@webmcp-auto-ui/sdk/canvas'

// Recipe runner — markdown-fence parser + JS/TS/SQL/etc executor over MCP
export { parseBody, runCode, estimateTokens, safeStringify } from './recipes/index.js';
export type { ParsedSegment, RunResult, RunLog, RunTab, RecipeData } from './recipes/index.js';

// Short URL — domain-dependent compact token
export { buildShortUrl, getShortToken } from './short-url.js';
