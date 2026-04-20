# Boilerplate Svelte 5 / SvelteKit / shadcn-svelte + webmcp-auto-ui

Guide d'integration pour un projet Svelte existant.

## Installation

```bash
npm install @webmcp-auto-ui/core @webmcp-auto-ui/agent @webmcp-auto-ui/sdk @webmcp-auto-ui/ui
```

## Proxy API Claude

Creer `src/routes/api/chat/+server.ts` :

```ts
import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import { llmProxy } from '@webmcp-auto-ui/agent/server';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json() as Record<string, unknown>;
  const apiKey = (body.__apiKey as string | undefined) || env.LLM_API_KEY || '';
  delete body.__apiKey;
  return llmProxy(body, apiKey, request.headers.get('X-Model'));
};
```

Ajouter `LLM_API_KEY` dans `.env`.

## Canvas store

Le store reactif qui contient les widgets generes par l'agent :

```ts
import { canvas } from '@webmcp-auto-ui/sdk/canvas';

// Lire les widgets
const widgets = canvas.widgets; // WidgetEntry[]

// Ajouter un widget
canvas.addWidget({ type: 'text', props: { content: 'Hello' } });

// Vider
canvas.clear();
```

## Connexion MCP

```ts
import { McpClient } from '@webmcp-auto-ui/core';

const client = new McpClient({ url: 'https://your-mcp-server.example/sse' });
await client.connect();
const tools = await client.listTools();
```

Pour plusieurs serveurs, utiliser `McpMultiClient` :

```ts
import { McpMultiClient } from '@webmcp-auto-ui/core';

const multi = new McpMultiClient();
await multi.add('meteo', { url: 'https://meteo-mcp.example/sse' });
await multi.add('wiki', { url: 'https://wiki-mcp.example/sse' });
```

## Composants UI

Tous les composants s'importent depuis `@webmcp-auto-ui/ui` :

```svelte
<script lang="ts">
  import {
    LLMSelector,    // Selecteur de modele LLM (Claude / Gemma)
    McpStatus,      // Indicateur de connexion MCP
    ModelLoader,    // Barre de chargement WASM Gemma
    AgentProgress,  // Progression de la boucle agent (tool calls, timer)
    WidgetRenderer, // Rendu d'un widget a partir de son type + props
  } from '@webmcp-auto-ui/ui';
</script>

<!-- Dans votre layout shadcn-svelte -->
<div class="flex items-center gap-2 p-2 border-b">
  <LLMSelector />
  <McpStatus servers={activeServers} />
</div>

<AgentProgress toolCount={toolCount} lastTool={lastTool} timer={timer} />

{#each canvas.widgets as widget}
  <WidgetRenderer entry={widget} />
{/each}
```

## Agent loop

```ts
import { RemoteLLMProvider, runAgentLoop, buildSystemPrompt, fromMcpTools } from '@webmcp-auto-ui/agent';
import type { ChatMessage } from '@webmcp-auto-ui/agent';
import { canvas } from '@webmcp-auto-ui/sdk/canvas';

const provider = new RemoteLLMProvider({ proxyUrl: '/api/chat' });

// Construire les outils depuis les serveurs MCP connectes
const mcpTools = fromMcpTools(await client.listTools());

const systemPrompt = buildSystemPrompt(/* layers */);

let history: ChatMessage[] = [];

async function send(userMessage: string) {
  history = [...history, { role: 'user', content: userMessage }];

  await runAgentLoop({
    provider,
    system: systemPrompt,
    messages: history,
    tools: mcpTools,
    maxTokens: 4096,
    onText: (text) => {
      // Texte streame par l'agent
      console.log('Agent:', text);
    },
    onToolCall: (name, input) => {
      // Outil MCP appele
      console.log('Tool:', name, input);
    },
    onWidget: (widget) => {
      // Widget genere — ajouter au canvas
      canvas.addWidget(widget);
    },
  });
}
```

## Lazy loading des outils

Pour les apps avec beaucoup de serveurs MCP, charger les outils a la demande :

```ts
import { buildDiscoveryTools, activateServerTools } from '@webmcp-auto-ui/agent';

// Phase 1 : outils de decouverte (legers)
const discovery = buildDiscoveryTools(serverList);

// Phase 2 : quand l'agent demande un serveur, charger ses outils
const fullTools = await activateServerTools(serverName, client);
```

## Exemple complet minimal

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpClient } from '@webmcp-auto-ui/core';
  import { RemoteLLMProvider, runAgentLoop, fromMcpTools } from '@webmcp-auto-ui/agent';
  import { WidgetRenderer, McpStatus } from '@webmcp-auto-ui/ui';

  let input = $state('');
  let running = $state(false);
  let client: McpClient;

  const provider = new RemoteLLMProvider({ proxyUrl: '/api/chat' });

  onMount(async () => {
    client = new McpClient({ url: '/mcp/sse' });
    await client.connect();
  });

  async function send() {
    if (!input.trim() || running) return;
    running = true;
    const tools = fromMcpTools(await client.listTools());

    await runAgentLoop({
      provider,
      system: 'You are a helpful assistant that creates visual widgets.',
      messages: [{ role: 'user', content: input }],
      tools,
      maxTokens: 4096,
      onWidget: (w) => canvas.addWidget(w),
    });

    input = '';
    running = false;
  }
</script>

<div class="p-4 max-w-2xl mx-auto space-y-4">
  <McpStatus servers={client ? [{ name: 'local', url: '/mcp/sse' }] : []} />

  <form onsubmit={send} class="flex gap-2">
    <input bind:value={input} placeholder="Ask something..." class="flex-1 border rounded px-3 py-2" />
    <button type="submit" disabled={running} class="px-4 py-2 bg-primary text-white rounded">
      {running ? '...' : 'Send'}
    </button>
  </form>

  <div class="grid gap-4">
    {#each canvas.widgets as widget}
      <WidgetRenderer entry={widget} />
    {/each}
  </div>
</div>
```
