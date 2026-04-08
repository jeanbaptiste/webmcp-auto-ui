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

// HyperSkill encoding — re-exported from the `hyperskills` NPM package.
// Use directly: encode(baseUrl, JSON.stringify(skill)), decode(url), etc.
// See: npm install hyperskills
export { encode, decode, hash, diff, getHsParam } from 'hyperskills';

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
