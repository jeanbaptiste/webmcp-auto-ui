---
title: ToolLayers
description: Structuration des outils en couches McpLayer et UILayer (v0.8)
sidebar:
  order: 1
---

Les ToolLayers sont l'API v0.8 qui structure les outils en couches typees. Ils remplacent le passage plat de `mcpTools[]`.

## Architecture

```
+--------------------------------------------------+
|                    ToolLayer[]                     |
|                                                    |
|  +-- McpLayer (par serveur) ---+  +-- UILayer --+ |
|  |  tools: MCP tools           |  | component() | |
|  |  recipes: MCP recipes       |  | adapter?    | |
|  |  serverName, serverUrl      |  | recipes: UI | |
|  +-----------------------------+  +-------------+ |
+--------------------------------------------------+
         |                               |
    buildSystemPrompt()          buildToolsFromLayers()
```

## McpLayer

Un `McpLayer` est cree pour chaque serveur MCP connecte. Il porte les outils DATA et les recettes serveur.

```ts
import type { McpLayer } from '@webmcp-auto-ui/agent';

const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: [
    { name: 'profil-depute', description: 'Fiche complete depute' },
    { name: 'scrutin-detail', description: 'Analyse scrutin public' },
  ],
};
```

### Interface

```ts
interface McpLayer {
  source: 'mcp';
  serverUrl: string;
  serverName?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}
```

## UILayer

Un seul `UILayer` par app. Porte `component()`, le `ComponentAdapter` optionnel, et les recettes WebMCP.

```ts
import type { UILayer } from '@webmcp-auto-ui/agent';
import { WEBMCP_RECIPES, filterRecipesByServer } from '@webmcp-auto-ui/agent';

const uiLayer: UILayer = {
  source: 'ui',
  recipes: filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']),
};
```

### Avec ComponentAdapter (mode explicit)

```ts
import { ComponentAdapter, minimalPreset } from '@webmcp-auto-ui/agent';

const adapter = new ComponentAdapter();
adapter.registerAll(minimalPreset());

const uiLayer: UILayer = {
  source: 'ui',
  adapter,
  recipes: filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']),
};
```

### Interface

```ts
interface UILayer {
  source: 'ui';
  adapter?: ComponentAdapter;
  recipes?: Recipe[];
}
```

## Construction des layers

```ts
const layers: ToolLayer[] = [mcpLayer1, mcpLayer2, uiLayer];
```

## buildSystemPrompt

Genere un prompt structure en sections markdown :

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

const prompt = buildSystemPrompt(layers, { toolMode: 'smart' });
```

Resultat :

```
## mcp (Tricoteuses, iNaturalist)

### outils DATA (12)
- query_sql: Execute une requete SQL
- list_tables: Liste les tables disponibles
...

### recettes serveur (2)
- profil-depute: Fiche complete depute
- scrutin-detail: Analyse scrutin public

## webmcp

### component() -- seul outil UI
Composants disponibles : stat, kv, list, chart, alert, ...
```

## buildToolsFromLayers

Convertit les layers en `AnthropicTool[]` :

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const tools = buildToolsFromLayers(layers, 'smart');
// Mode smart : tools MCP + 1 seul tool component()
// Mode explicit : tools MCP + 31 render_* + component()
```

## Utilisation avec runAgentLoop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Liste les deputes ecologistes', {
  provider,
  layers,
  toolMode: 'smart',
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
  },
});
```

## Multi-serveurs

Plusieurs `McpLayer` peuvent coexister. Les outils sont agreges et le LLM voit tous les outils de tous les serveurs dans le prompt.

```ts
const layers: ToolLayer[] = [
  mcpLayer1,  // Tricoteuses -- politique
  mcpLayer2,  // iNaturalist -- biodiversite
  uiLayer,    // component() + recettes
];
```
