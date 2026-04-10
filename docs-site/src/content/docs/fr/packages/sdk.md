---
title: "@webmcp-auto-ui/sdk"
description: HyperSkill encode/decode, skills registry, canvas store Svelte 5 et vanilla
sidebar:
  order: 3
---

HyperSkill encode/decode, skills registry, et canvas store reactif (Svelte 5 runes + vanilla framework-agnostic).

## HyperSkill format

Une HyperSkill URL embarque une definition de skill complete dans le parametre `?hs=`.

Le SDK re-exporte `encode`, `decode`, `hash`, `diff`, et `getHsParam` directement depuis le package NPM [`hyperskills`](https://www.npmjs.com/package/hyperskills). Les apps doivent importer depuis `@webmcp-auto-ui/sdk` (pas depuis `hyperskills` directement).

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
// https://app.example.com/viewer?hs=eyJtZXRhIjp7...
```

Les skills de plus de 6KB sont automatiquement compressees en gzip (prefix `gz.`).

### Decode

```ts
const { content: raw } = await decode('https://app.example.com/viewer?hs=eyJtZXRh...');
const skill = JSON.parse(raw);
```

### Hashing et versioning

```ts
const h = await hash('https://app.example.com', JSON.stringify(skill.content));
```

Chaque version porte un hash SHA-256 pour la tracabilite. Les versions peuvent etre chainees via `previousHash`.

## Skills registry

CRUD en memoire pour les skills. Chaque skill est un ensemble d'instructions qui aident un agent a utiliser des outils.

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
// Charge 3 skills built-in : weather-dashboard, kpi-overview, status-monitor
```

### Change listener

```ts
const unsubscribe = onSkillsChange(() => {
  console.log('Skills changed:', listSkills().length);
});
```

## Canvas store (Svelte 5)

Store reactif base sur les runes Svelte 5. Browser-only.

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
```

### Etat reactif

| Propriete | Type | Description |
|-----------|------|-------------|
| `canvas.blocks` | `Block[]` | Tous les blocs sur le canvas |
| `canvas.mode` | `'auto' \| 'drag' \| 'chat'` | Mode d'interaction |
| `canvas.llm` | `string` | LLM selectionne |
| `canvas.mcpUrl` | `string` | URL serveur MCP |
| `canvas.mcpConnected` | `boolean` | Statut connexion MCP |
| `canvas.messages` | `ChatMsg[]` | Historique chat |
| `canvas.generating` | `boolean` | LLM en generation |
| `canvas.themeOverrides` | `Record<string, string>` | Overrides theme CSS |

### Operations blocs

```ts
canvas.addBlock('stat', { label: 'Users', value: '1,204' });
canvas.removeBlock('b_abc123');
canvas.updateBlock('b_abc123', { value: '1,300' });
canvas.clearBlocks();
```

### Integration HyperSkill

```ts
const json = canvas.buildSkillJSON();
const param = canvas.buildHyperskillParam();
canvas.loadFromParam(hsParam);
```

## Canvas store vanilla

Store framework-agnostic pour les environnements non-Svelte. Meme API :

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

7 endpoints de serveurs MCP demo pour le test et les demonstrations.
