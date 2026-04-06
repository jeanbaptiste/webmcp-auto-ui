// @webmcp-auto-ui/sdk — public API

// HyperSkill format
export {
  encodeHyperSkill,
  decodeHyperSkill,
  computeHash,
  createVersion,
  getHsParam,
  diffSkills,
} from './hyperskill/format.js';
export type {
  HyperSkill,
  HyperSkillMeta,
  HyperSkillVersion,
} from './hyperskill/format.js';

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
