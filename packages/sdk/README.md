# @webmcp-auto-ui/sdk

HyperSkill URL format, skills CRUD registry, and Svelte 5 canvas store.

## HyperSkill format

A skill is a serialised UI state — a list of blocks with their data, plus metadata (MCP server, LLM, tags). It encodes to a URL parameter:

```
https://example.com/viewer?hs=base64(JSON)
```

Skills above 6 KB are compressed with `CompressionStream` (`gz.` prefix). Each version carries a SHA-256 hash of `source_url + content` for traceability. Hashes are chainable: each version can reference the hash of the previous one.

```ts
import { encodeHyperSkill, decodeHyperSkill, computeHash, diffSkills } from '@webmcp-auto-ui/sdk';

const url = await encodeHyperSkill(skill, 'https://example.com/viewer');
const skill = await decodeHyperSkill(url); // or pass raw ?hs= param
const hash = await computeHash(sourceUrl, skill.content);
const changed = diffSkills(prev.content, next.content); // ['blocks', 'meta']
```

## Skills registry

In-memory CRUD store with change listeners.

```ts
import { createSkill, updateSkill, deleteSkill, listSkills, loadDemoSkills, onSkillsChange } from '@webmcp-auto-ui/sdk';

loadDemoSkills(); // loads 3 built-in demo skills

const skill = createSkill({
  name: 'my-dashboard',
  mcp: 'https://mcp.example.com/mcp',
  mcpName: 'example',
  llm: 'haiku',
  blocks: [{ type: 'stat', data: { label: 'KPI', value: '42' } }],
  tags: ['dashboard'],
});

const unsub = onSkillsChange(() => console.log('skills changed'));
```

Each skill stores the MCP server URL and name it was designed for. Apps use this to warn the user if they load a skill while connected to a different server.

## Canvas store

Svelte 5 runes state for the composer canvas. Import from the `/canvas` subpath to avoid issues with server-side rendering:

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas';

canvas.addBlock('stat', { label: 'Revenue', value: '€142K' });
canvas.setMcpConnected(true, 'my-server', tools);
const param = canvas.buildHyperskillParam(); // base64 for ?hs=
```

The canvas store manages blocks, mode (`auto` | `drag` | `chat`), MCP connection state, chat messages, and generating flag.

## Install

```bash
npm install @webmcp-auto-ui/sdk
```

Requires Svelte 5 for the canvas store. The HyperSkill utilities and registry are plain TypeScript with no framework dependency.

## License

AGPL-3.0-or-later
