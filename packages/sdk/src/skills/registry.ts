/**
 * Skills registry — in-memory CRUD for skills.
 * Each skill is a set of instructions that help an agent use tools.
 */

export interface SkillBlock {
  type: string;
  data: Record<string, unknown>;
}

export interface ThemeOverrides {
  [key: string]: string;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  mcp?: string;
  mcpName?: string;
  llm?: string;
  tags?: string[];
  theme?: ThemeOverrides;
  blocks: SkillBlock[];
  createdAt: number;
  updatedAt: number;
}

const _skills = new Map<string, Skill>();
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function onSkillsChange(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function createSkill(
  data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>
): Skill {
  const id = 'sk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const skill: Skill = {
    ...data,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  _skills.set(id, skill);
  notify();
  return skill;
}

export function updateSkill(id: string, patch: Partial<Omit<Skill, 'id' | 'createdAt'>>): Skill | null {
  const existing = _skills.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: Date.now() };
  _skills.set(id, updated);
  notify();
  return updated;
}

export function deleteSkill(id: string): boolean {
  if (!_skills.has(id)) return false;
  _skills.delete(id);
  notify();
  return true;
}

export function getSkill(id: string): Skill | undefined {
  return _skills.get(id);
}

export function listSkills(): Skill[] {
  return Array.from(_skills.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function clearSkills(): void {
  _skills.clear();
  notify();
}

/** Load a list of skills (e.g. from a HyperSkill URL) — replaces all */
export function loadSkills(skills: Skill[]): void {
  _skills.clear();
  for (const s of skills) _skills.set(s.id, s);
  notify();
}

// Built-in demo skills
const DEMO_SKILLS: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'weather-dashboard',
    mcp: 'https://mcp.code4code.eu/mcp',
    mcpName: 'tricoteuses',
    description: 'Météo locale avec température, conditions et prévisions',
    tags: ['météo', 'dashboard'],
    blocks: [
      { type: 'stat', data: { label: 'Température', value: '14°C', trend: '+2°', trendDir: 'up' } },
      { type: 'kv', data: { title: 'Conditions', rows: [['Humidité','72%'],['Vent','18 km/h'],['UV','3']] } },
      { type: 'chart', data: { title: 'Prévisions 7j', bars: [['L',12],['M',14],['M',11],['J',15],['V',13],['S',16],['D',14]] } },
    ],
  },
  {
    name: 'kpi-overview',
    mcp: 'https://mcp.code4code.eu/mcp',
    mcpName: 'tricoteuses',
    description: 'Vue KPIs : revenus, utilisateurs, churn',
    tags: ['kpi', 'dashboard'],
    blocks: [
      { type: 'stat', data: { label: 'Revenus', value: '€142K', trend: '+12.4%', trendDir: 'up' } },
      { type: 'stat', data: { label: 'Utilisateurs', value: '8 204', trend: '+3.2%', trendDir: 'up' } },
      { type: 'stat', data: { label: 'Churn', value: '2.1%', trend: '-0.4%', trendDir: 'down' } },
      { type: 'chart', data: { title: 'Revenus Q1-Q4', bars: [['Q1',98],['Q2',112],['Q3',128],['Q4',142]] } },
    ],
  },
  {
    name: 'status-monitor',
    mcp: 'https://mcp.code4code.eu/mcp',
    mcpName: 'tricoteuses',
    description: 'Monitoring état des services',
    tags: ['ops', 'monitoring'],
    blocks: [
      { type: 'alert', data: { title: 'DB degraded', message: 'Latence élevée sur primary-eu.', level: 'warn' } },
      { type: 'kv', data: { title: 'État services', rows: [['API','✓ OK'],['DB','⚠ degraded'],['CDN','✓ OK'],['Queue','⚠ warning']] } },
      { type: 'tags', data: { label: 'Actif', tags: [{ text:'prod', active:true},{ text:'eu-west'},{ text:'v2.4.1',active:true}] } },
    ],
  },
];

export function loadDemoSkills(): void {
  if (_skills.size > 0) return; // don't overwrite user skills
  for (const s of DEMO_SKILLS) createSkill(s);
}
