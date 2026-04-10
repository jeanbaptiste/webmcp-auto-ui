---
title: "@webmcp-auto-ui/sdk"
description: HyperSkill encode/decode, skills registry, Svelte 5 and vanilla canvas store
sidebar:
  order: 3
---

HyperSkill encode/decode, skills registry, and reactive canvas store (Svelte 5 runes + vanilla framework-agnostic).

## HyperSkill format

A HyperSkill URL embeds a complete skill definition in the `?hs=` query parameter.

The SDK re-exports `encode`, `decode`, `hash`, `diff`, and `getHsParam` directly from the [`hyperskills`](https://www.npmjs.com/package/hyperskills) NPM package. Apps should import from `@webmcp-auto-ui/sdk` (not from `hyperskills` directly).

```ts
import { encode, decode, hash, diff, getHsParam } from '@webmcp-auto-ui/sdk';
```

### Encode

```ts
import type { HyperSkill } from '@webmcp-auto-ui/sdk';

const skill: HyperSkill = {
  meta: {
    title: 'Weather Dashboard',
    mcp: 'https://mcp.example.com/mcp',
    llm: 'haiku',
  },
  content: [
    { type: 'stat', data: { label: 'Temp', value: '14C' } },
    { type: 'chart', data: { title: 'Forecast', bars: [['Mon', 12], ['Tue', 15]] } },
  ],
};

const url = await encode('https://app.example.com/viewer', JSON.stringify(skill));
```

Skills larger than 6KB are automatically gzip-compressed (prefix `gz.`).

### Decode

```ts
const { content: raw } = await decode('https://app.example.com/viewer?hs=eyJtZXRh...');
const skill = JSON.parse(raw);
```

### Hashing and versioning

```ts
const h = await hash('https://app.example.com', JSON.stringify(skill.content));
```

Each version carries a SHA-256 hash for traceability. Versions can be chained via `previousHash`.

## Skills registry

In-memory CRUD for skills. Each skill is a set of instructions that help an agent use tools.

```ts
import {
  createSkill, updateSkill, deleteSkill,
  getSkill, listSkills, clearSkills,
  loadSkills, loadDemoSkills,
  onSkillsChange,
} from '@webmcp-auto-ui/sdk';

const skill = createSkill({
  name: 'kpi-dashboard',
  description: 'Revenue and user metrics',
  mcp: 'https://mcp.example.com/mcp',
  blocks: [
    { type: 'stat', data: { label: 'Revenue', value: '$142K' } },
    { type: 'stat', data: { label: 'Users', value: '8,204' } },
  ],
});

updateSkill(skill.id, { description: 'Updated KPI dashboard' });
const all = listSkills();
deleteSkill(skill.id);
```

### Demo skills

```ts
loadDemoSkills();
// Loads 3 built-in skills: weather-dashboard, kpi-overview, status-monitor
```

### Change listener

```ts
const unsubscribe = onSkillsChange(() => {
  console.log('Skills changed:', listSkills().length);
});
```

## Canvas store (Svelte 5)

Reactive store based on Svelte 5 runes. Browser-only.

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
```

### Reactive state

| Property | Type | Description |
|----------|------|-------------|
| `canvas.blocks` | `Block[]` | All blocks on the canvas |
| `canvas.mode` | `'auto' \| 'drag' \| 'chat'` | Interaction mode |
| `canvas.llm` | `string` | Selected LLM |
| `canvas.mcpUrl` | `string` | MCP server URL |
| `canvas.mcpConnected` | `boolean` | MCP connection status |
| `canvas.messages` | `ChatMsg[]` | Chat history |
| `canvas.generating` | `boolean` | LLM is generating |
| `canvas.themeOverrides` | `Record<string, string>` | Theme CSS overrides |

### Block operations

```ts
canvas.addBlock('stat', { label: 'Users', value: '1,204' });
canvas.removeBlock('b_abc123');
canvas.updateBlock('b_abc123', { value: '1,300' });
canvas.clearBlocks();
```

### HyperSkill integration

```ts
const json = canvas.buildSkillJSON();
const param = canvas.buildHyperskillParam();
canvas.loadFromParam(hsParam);
```

## Vanilla canvas store

Framework-agnostic canvas store for non-Svelte environments. Same API:

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas-vanilla';

canvas.addBlock('stat', { label: 'Revenue', value: '$142K' });
canvas.subscribe(() => console.log('state changed'));
```

## MCP Demo Servers

```ts
import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
// Array<{ url: string; name: string; description: string }>
```

7 demo MCP server endpoints for testing and showcasing.
