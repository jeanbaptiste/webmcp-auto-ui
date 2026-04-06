# Skills (Recipes) -- Agent Guide

> This document is designed to be injected into an AI agent's context. It contains everything needed to create, manage, encode, and share skills in webmcp-auto-ui.

## What is a Skill?

A skill (also called a recipe) is a reusable UI composition: a named set of blocks with optional metadata (MCP server, LLM preference, theme, tags). Skills are the fundamental unit of saved UI in webmcp-auto-ui.

## Skill Format

```typescript
interface SkillBlock {
  type: string;                      // one of the 24 block types
  data: Record<string, unknown>;     // block-specific data
}

interface Skill {
  id: string;                        // auto-generated (e.g. "sk_m1abc2def")
  name: string;                      // required
  description?: string;
  mcp?: string;                      // MCP server URL
  mcpName?: string;                  // MCP server display name
  llm?: string;                      // preferred model: "claude-haiku" | "claude-sonnet" | "gemma-e2b" | "auto"
  tags?: string[];
  theme?: Record<string, string>;    // flat token overrides (e.g. {"color-accent": "#2563eb"})
  blocks: SkillBlock[];              // required
  createdAt: number;                 // auto-set (epoch ms)
  updatedAt: number;                 // auto-set (epoch ms)
}
```

## CRUD Operations

All CRUD functions are available from `@webmcp-auto-ui/sdk`:

### Create

```typescript
import { createSkill } from '@webmcp-auto-ui/sdk';

const skill = createSkill({
  name: 'sales-dashboard',
  description: 'Overview of sales KPIs',
  mcp: 'https://mcp.example.com/mcp',
  mcpName: 'sales-api',
  llm: 'claude-sonnet',
  tags: ['sales', 'kpi'],
  theme: { 'color-accent': '#2563eb' },
  blocks: [
    { type: 'stat', data: { label: 'Revenue', value: '$142K', trend: '+12%', trendDir: 'up' } },
    { type: 'stat', data: { label: 'Orders', value: '1,204', trend: '+8%', trendDir: 'up' } },
    { type: 'chart', data: { title: 'Monthly Revenue', bars: [['Jan',80],['Feb',95],['Mar',120]] } }
  ]
});
// skill.id is auto-generated
// skill.createdAt and skill.updatedAt are auto-set
```

### Read

```typescript
import { getSkill, listSkills } from '@webmcp-auto-ui/sdk';

const skill = getSkill('sk_m1abc2def');   // returns Skill | undefined
const allSkills = listSkills();            // returns Skill[], sorted by createdAt desc
```

### Update

```typescript
import { updateSkill } from '@webmcp-auto-ui/sdk';

const updated = updateSkill('sk_m1abc2def', {
  name: 'sales-dashboard-v2',
  blocks: [/* new blocks */]
});
// returns updated Skill | null (null if not found)
// updatedAt is auto-refreshed
```

### Delete

```typescript
import { deleteSkill } from '@webmcp-auto-ui/sdk';

const deleted = deleteSkill('sk_m1abc2def');  // returns boolean
```

### Bulk Operations

```typescript
import { clearSkills, loadSkills, loadDemoSkills } from '@webmcp-auto-ui/sdk';

clearSkills();              // removes all skills
loadSkills(skillArray);     // replaces all skills with provided array
loadDemoSkills();           // loads built-in demo skills (only if registry is empty)
```

### Change Listener

```typescript
import { onSkillsChange } from '@webmcp-auto-ui/sdk';

const unsubscribe = onSkillsChange(() => {
  console.log('Skills changed!');
});
// later: unsubscribe();
```

## HyperSkill Format

HyperSkill is a URL-based encoding for sharing skills. A skill is serialized into a URL parameter `?hs=` that can be pasted, bookmarked, or shared.

### Structure

```typescript
interface HyperSkillMeta {
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

interface HyperSkill {
  meta: HyperSkillMeta;
  content: unknown;       // typically the blocks array or full skill data
}
```

### Encoding

```typescript
import { encodeHyperSkill } from '@webmcp-auto-ui/sdk';

const skill: HyperSkill = {
  meta: {
    title: 'Sales Dashboard',
    description: 'KPI overview',
    mcp: 'https://mcp.example.com/mcp',
    tags: ['sales']
  },
  content: [
    { type: 'stat', data: { label: 'Revenue', value: '$142K' } },
    { type: 'chart', data: { title: 'Trend', bars: [['Q1',80],['Q2',120]] } }
  ]
};

const url = await encodeHyperSkill(skill, 'https://app.example.com/viewer');
// "https://app.example.com/viewer?hs=eyJtZXRhIjp7InRpdGxlIjoi..."
```

Encoding rules:
- JSON serialized, then base64-encoded
- If payload > 6KB: gzip-compressed first, prefixed with `gz.`
- The URL is built from the provided source URL + `?hs=` parameter

### Decoding

```typescript
import { decodeHyperSkill } from '@webmcp-auto-ui/sdk';

const skill = await decodeHyperSkill('https://app.example.com/viewer?hs=eyJtZXRh...');
// or just the param value:
const skill2 = await decodeHyperSkill('eyJtZXRhIjp7...');

console.log(skill.meta.title);   // "Sales Dashboard"
console.log(skill.content);      // blocks array
```

### Reading from Current URL

```typescript
import { getHsParam } from '@webmcp-auto-ui/sdk';

const param = getHsParam();  // returns the ?hs= value or null
if (param) {
  const skill = await decodeHyperSkill(param);
}
```

### URL Format

Skills can be shared via two entry points:
- **Viewer**: `https://domain.com/viewer?hs=<encoded>` -- read-only display
- **Composer**: `https://domain.com/composer?hs=<encoded>` -- editable view

### Versioning

HyperSkills support content-addressable versioning via SHA-256 hashes:

```typescript
import { createVersion } from '@webmcp-auto-ui/sdk';

const version = await createVersion(skill, 'https://app.example.com/viewer', previousHash);
// version: { hash, previousHash, timestamp, skill }
```

### Diffing

```typescript
import { diffSkills } from '@webmcp-auto-ui/sdk';

const changed = diffSkills(oldContent, newContent);
// returns array of changed top-level keys, e.g. ["blocks", "meta"]
```

## Embedding a Theme

Include theme token overrides in the skill's `theme` field:

```json
{
  "name": "branded-dashboard",
  "theme": {
    "color-accent": "#2563eb",
    "color-accent2": "#dc2626",
    "color-bg": "#f8fafc"
  },
  "blocks": [...]
}
```

The `theme` field uses flat key-value pairs (same format as `tokens` in theme.json). These are applied as CSS custom property overrides when the skill is loaded.

## Demo Skills

Three built-in demo skills are available via `loadDemoSkills()`:

### weather-dashboard
- Blocks: `stat` (temperature) + `kv` (conditions) + `chart` (7-day forecast)
- Tags: `meteo`, `dashboard`

### kpi-overview
- Blocks: 3x `stat` (revenue, users, churn) + `chart` (quarterly revenue)
- Tags: `kpi`, `dashboard`

### status-monitor
- Blocks: `alert` (DB degraded) + `kv` (service status) + `tags` (active filters)
- Tags: `ops`, `monitoring`

## Workflow: Create a Skill from Scratch

1. **Define the purpose**: What data does this skill display? What user need does it serve?
2. **Choose blocks**: Pick 2-5 block types that best represent the data (see composing.md)
3. **Write the data**: Fill in each block's data object with real or placeholder values
4. **Add metadata**: Set name, description, tags, optional MCP/LLM references
5. **Add theme** (optional): Override accent colors to match branding
6. **Create**: Call `createSkill()` with the complete object
7. **Encode** (optional): Call `encodeHyperSkill()` to generate a shareable URL
8. **Share**: Send the URL -- recipients load it via `?hs=` parameter

### Example: Full Workflow

```typescript
import { createSkill } from '@webmcp-auto-ui/sdk';
import { encodeHyperSkill } from '@webmcp-auto-ui/sdk';

// Step 1-5: Define the skill
const skill = createSkill({
  name: 'team-overview',
  description: 'Team members and recent activity',
  tags: ['team', 'hr'],
  theme: { 'color-accent': '#6366f1' },
  blocks: [
    {
      type: 'trombinoscope',
      data: {
        title: 'Engineering Team',
        columns: 4,
        people: [
          { name: 'Alice Martin', subtitle: 'Tech Lead', badge: 'TL' },
          { name: 'Bob Chen', subtitle: 'Backend' },
          { name: 'Carol Silva', subtitle: 'Frontend' }
        ]
      }
    },
    {
      type: 'timeline',
      data: {
        title: 'Recent Activity',
        events: [
          { date: '2024-03-15', title: 'Sprint 12 completed', status: 'done' },
          { date: '2024-03-18', title: 'Sprint 13 started', status: 'active' }
        ]
      }
    },
    {
      type: 'stat',
      data: { label: 'Team Size', value: '8', trend: '+2', trendDir: 'up' }
    }
  ]
});

// Step 7: Encode for sharing
const hsUrl = await encodeHyperSkill(
  { meta: { title: skill.name, description: skill.description, tags: skill.tags }, content: skill.blocks },
  'https://app.example.com/viewer'
);
console.log('Share this URL:', hsUrl);
```

## Constraints

- `name` is required. Cannot be empty.
- `blocks` is required. Must contain at least one block.
- Block `type` must be one of the 24 valid types (see composing.md or ui-widgets.md).
- HyperSkill URL size limit: browser URL length is typically ~2KB-8KB depending on the browser. The gzip compression kicks in above 6KB of JSON. For very large skills (many blocks with large data), consider reducing data or splitting into multiple skills.
- `theme` uses flat token keys (`"color-accent"`, not nested objects).
- `id`, `createdAt`, `updatedAt` are auto-managed. Do not set them manually in `createSkill()`.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Setting `id` in `createSkill()` | TypeScript error (id is excluded from input type) | Let the registry auto-generate the id |
| Huge blocks data (e.g. 1000-row table) | HyperSkill URL exceeds browser limits | Limit data to what fits visually; paginate server-side |
| Missing `blocks` array | Skill renders empty | Always include at least one block |
| `theme` with nested `dark` key | Dark overrides ignored (flat format only) | Use flat tokens; for dark mode, use the full theme.json in ThemeProvider |
| Forgetting to `await` encode/decode | Returns a Promise, not the actual value | Both `encodeHyperSkill` and `decodeHyperSkill` are async |
| Using wrong block type string | BlockRenderer shows `[unknown-type]` | Check exact type strings: `stat-card` not `statcard`, `chart-rich` not `chartRich` |
