# @webmcp-auto-ui/sdk

HyperSkill encode/decode, skills registry, and Svelte 5 canvas store.

## What it does

- Encodes/decodes HyperSkill URLs (base64 + optional gzip for skills > 6KB)
- Provides an in-memory skills CRUD registry with change notifications
- Exposes a reactive canvas store (Svelte 5 runes) for widgets, chat, MCP state, and theme
- Provides a vanilla (framework-agnostic) canvas store at `@webmcp-auto-ui/sdk/canvas-vanilla`
- Ships `MCP_DEMO_SERVERS` — a registry of 7 demo MCP server endpoints
- Supports `chatSummary` and `provenance` fields in `HyperSkillMeta` for traceability

## HyperSkill format

A HyperSkill URL embeds a complete skill definition in the `?hs=` query parameter.

The SDK re-exports `encode`, `decode`, `hash`, `diff`, and `getHsParam` directly from the [`hyperskills`](https://www.npmjs.com/package/hyperskills) NPM package. Apps should import from `@webmcp-auto-ui/sdk` (not from `hyperskills` directly).

```ts
import {
  encode,
  decode,
  hash,
  diff,
  getHsParam,
} from '@webmcp-auto-ui/sdk';
```

### Types

```ts
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
  chatSummary?: string;
  provenance?: {
    model?: string;
    mcp?: string;
    timestamp?: number;
  };
}

interface HyperSkill {
  meta: HyperSkillMeta;
  content: unknown;
}

interface HyperSkillVersion {
  hash: string;
  previousHash?: string;
  timestamp: number;
  skill: HyperSkill;
}
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

### Utilities

- **`getHsParam(url)`** -- Extracts the raw `hs` parameter from a URL.
- **`diff(a, b)`** -- Compares two objects and returns an array of changed top-level keys.

## Skills registry

In-memory CRUD for skills. Each skill is a set of instructions that help an agent use tools.

```ts
import {
  createSkill,
  updateSkill,
  deleteSkill,
  getSkill,
  listSkills,
  clearSkills,
  loadSkills,
  loadDemoSkills,
  onSkillsChange,
} from '@webmcp-auto-ui/sdk';
```

### Types

```ts
interface SkillBlock {
  type: string;
  data: Record<string, unknown>;
}

interface Skill {
  id: string;
  name: string;
  description?: string;
  mcp?: string;
  mcpName?: string;
  llm?: string;
  tags?: string[];
  theme?: Record<string, string>;
  blocks: SkillBlock[];
  createdAt: number;
  updatedAt: number;
}
```

### CRUD operations

```ts
const skill = createSkill({
  name: 'kpi-dashboard',
  description: 'Revenue and user metrics',
  mcp: 'https://mcp.example.com/mcp',
  blocks: [
    { type: 'stat', data: { label: 'Revenue', value: '$142K' } },
  ],
});

updateSkill(skill.id, { description: 'Updated KPI dashboard' });
const s = getSkill(skill.id);
const all = listSkills();
deleteSkill(skill.id);
clearSkills();
loadSkills(skillArray);
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

## Canvas store

Svelte 5 runes-based reactive store. Browser-only (must be imported in Svelte components).

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
```

### Reactive state

| Property | Type | Description |
|----------|------|-------------|
| `canvas.blocks` | `Widget[]` | All widgets on the canvas |
| `canvas.mode` | `'auto' \| 'drag' \| 'chat'` | Current interaction mode |
| `canvas.llm` | `LLMId` | Selected LLM |
| `canvas.mcpUrl` | `string` | MCP server URL |
| `canvas.mcpConnected` | `boolean` | MCP connection status |
| `canvas.mcpConnecting` | `boolean` | Connection in progress |
| `canvas.mcpName` | `string` | Connected server name |
| `canvas.mcpTools` | `McpToolInfo[]` | Available MCP tools |
| `canvas.messages` | `ChatMsg[]` | Chat message history |
| `canvas.generating` | `boolean` | LLM is generating |
| `canvas.statusText` | `string` | Status bar text |
| `canvas.statusColor` | `string` | Status bar color class |
| `canvas.blockCount` | `number` | Number of widgets (derived) |
| `canvas.isEmpty` | `boolean` | No widgets on canvas (derived) |
| `canvas.themeOverrides` | `Record<string, string>` | Theme CSS variable overrides |

### Widget operations

```ts
// New API
canvas.addWidget('stat', { label: 'Users', value: '1,204' });

// Backward compat alias
canvas.addBlock('stat', { label: 'Users', value: '1,204' });

canvas.removeBlock('b_abc123');
canvas.updateBlock('b_abc123', { value: '1,300' });
canvas.moveBlock('b_abc123', 'b_def456');  // reorder
canvas.clearBlocks();
canvas.setBlocks(newBlockArray);
```

### Types

```ts
type WidgetType =
  | 'stat' | 'kv' | 'list' | 'chart' | 'alert' | 'code' | 'text' | 'actions' | 'tags'
  | 'stat-card' | 'data-table' | 'timeline' | 'profile' | 'trombinoscope' | 'json-viewer'
  | 'hemicycle' | 'chart-rich' | 'cards' | 'grid-data' | 'sankey' | 'map' | 'log'
  | 'gallery' | 'carousel' | 'd3';

/** @deprecated Use WidgetType */
type BlockType = WidgetType;

interface Widget {
  id: string;
  type: WidgetType;
  data: Record<string, unknown>;
}

/** @deprecated Use Widget */
type Block = Widget;
```

### Chat operations

```ts
canvas.addMsg('user', 'Show me the revenue data');
canvas.updateMsg('m_abc123', 'Updated content');
canvas.clearMessages();
```

### MCP state

```ts
canvas.setMcpUrl('https://mcp.example.com/mcp');
canvas.setMcpConnecting(true);
canvas.setMcpConnected(true, 'tricoteuses', tools);
canvas.setMcpError('Connection refused');
```

### HyperSkill integration

```ts
const json = canvas.buildSkillJSON();
const param = canvas.buildHyperskillParam();
canvas.loadFromParam(hsParam);
```

## Vanilla canvas store

A framework-agnostic canvas store for non-Svelte environments. Same API as the Svelte 5 store but uses plain callbacks instead of runes:

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas-vanilla';

canvas.addWidget('stat', { label: 'Revenue', value: '$142K' });
canvas.subscribe(() => console.log('state changed'));
```

Useful for vanilla JS, React, or Vue integrations.

## MCP Demo Servers

A registry of 7 demo MCP server endpoints for testing and showcasing:

```ts
import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
```

Used by the `RemoteMCPserversDemo` component in `@webmcp-auto-ui/ui`.
