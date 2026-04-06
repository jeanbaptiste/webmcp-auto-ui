# @webmcp-auto-ui/sdk

HyperSkill encode/decode, skills registry, and Svelte 5 canvas store.

## What it does

- Encodes/decodes HyperSkill URLs (base64 + optional gzip for skills > 6KB)
- Provides an in-memory skills CRUD registry with change notifications
- Exposes a reactive canvas store (Svelte 5 runes) for blocks, chat, MCP state, and theme

## HyperSkill format

A HyperSkill URL embeds a complete skill definition in the `?hs=` query parameter.

```ts
import {
  encodeHyperSkill,
  decodeHyperSkill,
  computeHash,
  createVersion,
  getHsParam,
  diffSkills,
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

const url = await encodeHyperSkill(skill, 'https://app.example.com/viewer');
// https://app.example.com/viewer?hs=eyJtZXRhIjp7...
```

Skills larger than 6KB are automatically gzip-compressed (prefix `gz.`).

### Decode

```ts
const skill = await decodeHyperSkill('https://app.example.com/viewer?hs=eyJtZXRhIjp7...');
console.log(skill.meta.title);  // "Weather Dashboard"
console.log(skill.content);     // [{ type: 'stat', ... }, ...]
```

Also accepts a raw `hs` parameter value (without the full URL).

### Versioning

```ts
const hash = await computeHash(skill, 'https://app.example.com');
const version = createVersion(skill, hash, previousHash);
```

Each version carries a SHA-256 hash for traceability. Versions can be chained via `previousHash`.

### Utilities

- **`getHsParam(url)`** — Extracts the raw `hs` parameter from a URL.
- **`diffSkills(a, b)`** — Compares two HyperSkill objects and returns differences.

## Skills registry

In-memory CRUD for UI skills (recipes). Each skill describes a composed UI from blocks.

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
// Create
const skill = createSkill({
  name: 'kpi-dashboard',
  description: 'Revenue and user metrics',
  mcp: 'https://mcp.example.com/mcp',
  blocks: [
    { type: 'stat', data: { label: 'Revenue', value: '$142K' } },
    { type: 'stat', data: { label: 'Users', value: '8,204' } },
  ],
});

// Update
updateSkill(skill.id, { description: 'Updated KPI dashboard' });

// Get
const s = getSkill(skill.id);

// List (sorted by createdAt descending)
const all = listSkills();

// Delete
deleteSkill(skill.id);

// Clear all
clearSkills();

// Bulk load (replaces all)
loadSkills(skillArray);
```

### Demo skills

```ts
loadDemoSkills();
// Loads 3 built-in skills: weather-dashboard, kpi-overview, status-monitor
// No-op if skills already exist
```

### Change listener

```ts
const unsubscribe = onSkillsChange(() => {
  console.log('Skills changed:', listSkills().length);
});
// later: unsubscribe()
```

## Canvas store

Svelte 5 runes-based reactive store. Browser-only (must be imported in Svelte components).

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
```

### Reactive state

| Property | Type | Description |
|----------|------|-------------|
| `canvas.blocks` | `Block[]` | All blocks on the canvas |
| `canvas.mode` | `'auto' \| 'drag' \| 'chat'` | Current interaction mode |
| `canvas.llm` | `'haiku' \| 'sonnet' \| 'gemma-e2b' \| 'gemma-e4b'` | Selected LLM |
| `canvas.mcpUrl` | `string` | MCP server URL |
| `canvas.mcpConnected` | `boolean` | MCP connection status |
| `canvas.mcpConnecting` | `boolean` | Connection in progress |
| `canvas.mcpName` | `string` | Connected server name |
| `canvas.mcpTools` | `McpToolInfo[]` | Available MCP tools |
| `canvas.messages` | `ChatMsg[]` | Chat message history |
| `canvas.generating` | `boolean` | LLM is generating |
| `canvas.statusText` | `string` | Status bar text |
| `canvas.statusColor` | `string` | Status bar color class |
| `canvas.blockCount` | `number` | Number of blocks (derived) |
| `canvas.isEmpty` | `boolean` | No blocks on canvas (derived) |
| `canvas.themeOverrides` | `Record<string, string>` | Theme CSS variable overrides |

### Block operations

```ts
canvas.addBlock('stat', { label: 'Users', value: '1,204' });
canvas.removeBlock('b_abc123');
canvas.updateBlock('b_abc123', { value: '1,300' });
canvas.moveBlock('b_abc123', 'b_def456');  // reorder
canvas.clearBlocks();
canvas.setBlocks(newBlockArray);
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
canvas.setMcpConnected(true, 'code4code', tools);
canvas.setMcpError('Connection refused');
```

### HyperSkill integration

```ts
// Export current canvas as a skill JSON
const json = canvas.buildSkillJSON();

// Export as base64 param for URL embedding
const param = canvas.buildHyperskillParam();

// Load a skill from a base64 param
canvas.loadFromParam(hsParam);  // returns true on success
```
