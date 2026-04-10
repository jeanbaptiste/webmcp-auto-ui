# @webmcp-auto-ui/sdk

HyperSkill URL format, skills CRUD registry, and Svelte 5 canvas store.

## HyperSkill format

A skill is a serialised UI state -- a list of blocks with their data, plus metadata (MCP server, LLM, tags). It encodes to a URL parameter:

```
https://example.com/viewer?hs=base64(JSON)
```

Skills above 6 KB are compressed with `CompressionStream` (`gz.` prefix). Each version carries a SHA-256 hash of `source_url + content` for traceability. Hashes are chainable: each version can reference the hash of the previous one.

The SDK re-exports `encode`, `decode`, `hash`, `diff`, and `getHsParam` from the [`hyperskills`](https://www.npmjs.com/package/hyperskills) NPM package:

```ts
import { encode, decode, hash, diff, getHsParam } from '@webmcp-auto-ui/sdk';

const url = await encode('https://example.com/viewer', JSON.stringify(skill));
const { content } = await decode(url); // or pass raw ?hs= param
const parsed = JSON.parse(content);
const h = await hash(sourceUrl, JSON.stringify(parsed.content));
const changed = diff(prev.content, next.content); // ['blocks', 'meta']
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

## MCP Demo Servers

A built-in registry of 7 demo MCP server endpoints for testing and showcasing:

```ts
import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';

// MCP_DEMO_SERVERS: Array<{ url: string; name: string; description: string }>
// Includes: tricoteuses, weather, finance, etc.
```

Used by the `RemoteMCPserversDemo` component in `@webmcp-auto-ui/ui` to let users discover and connect to available servers.

## HyperSkillMeta extensions

Two new fields in `HyperSkillMeta`:

- **`chatSummary`** — anonymized summary of the chat that produced the skill (generated via `summarizeChat()` from `@webmcp-auto-ui/agent`)
- **`provenance`** — records the LLM model, MCP server, and timestamp that created the skill

These fields enable traceability without exposing raw chat history.

## Vanilla canvas store

A framework-agnostic canvas store for non-Svelte environments:

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas-vanilla';

canvas.addBlock('stat', { label: 'Revenue', value: '$142K' });
canvas.subscribe(() => console.log('state changed'));
```

Same API as the Svelte 5 store but uses plain callbacks instead of runes. Useful for vanilla JS, React, or Vue integrations.

## Install

```bash
npm install @webmcp-auto-ui/sdk
```

The Svelte 5 canvas store requires Svelte 5. The vanilla canvas store, HyperSkill utilities, skills registry, and MCP demo servers are plain TypeScript with no framework dependency.

## License

AGPL-3.0-or-later
