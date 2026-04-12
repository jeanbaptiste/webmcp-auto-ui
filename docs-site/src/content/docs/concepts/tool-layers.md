---
title: ToolLayers
description: Structuration des outils en couches McpLayer et WebMcpLayer
sidebar:
  order: 1
---

Les ToolLayers sont l'API v0.8 qui structure les outils en couches typees. Ils remplacent le passage plat de `mcpTools[]`.

## Architecture

```
+--------------------------------------------------+
|                    ToolLayer[]                     |
|                                                    |
|  +-- McpLayer (par serveur) ---+  +-- WebMcpLayer ----+ |
|  |  tools: MCP tools           |  | tools: widget_display | |
|  |  recipes: MCP recipes       |  | canvas, recall        | |
|  |  serverName, serverUrl      |  | recipes: UI           | |
|  +-----------------------------+  +----------------------+ |
+--------------------------------------------------+
         |                               |
    buildSystemPrompt()          buildToolsFromLayers()
```

## McpLayer

Un `McpLayer` est cree pour chaque serveur MCP connecte. Il porte les outils DATA et les recettes serveur.

```ts
import type { McpLayer } from '@webmcp-auto-ui/agent';

const mcpLayer: McpLayer = {
  protocol: 'mcp',
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
  protocol: 'mcp';
  serverUrl: string;
  serverName?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}
```

## WebMcpLayer (autoui)

Le serveur `autoui` fournit une `WebMcpLayer` pre-configuree avec tous les widgets natifs et les recettes WebMCP.

```ts
import { autoui } from '@webmcp-auto-ui/agent';

// autoui.layer() genere une WebMcpLayer prete a l'emploi
const uiLayer = autoui.layer();
// { protocol: 'webmcp', serverName: 'autoui', description: '...', tools: [...] }
```

### Interface

```ts
interface WebMcpLayer {
  protocol: 'webmcp';
  serverName: string;
  description: string;
  tools: WebMcpToolDef[];
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

const prompt = buildSystemPrompt(layers);
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

### 3 outils UI (list_components, get_component, component)
Composants disponibles : stat, kv, list, chart, alert, ...
```

## buildToolsFromLayers

Convertit les layers en `AnthropicTool[]` :

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const tools = buildToolsFromLayers(layers, 'smart');
// Mode smart : tools MCP + 3 outils UI (list_components, get_component, component)
// Mode explicit : tools MCP + 31 render_* + component()
```

## Utilisation avec runAgentLoop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Liste les deputes ecologistes', {
  provider,
  layers,
  callbacks: {
    onWidget: (type, data) => { canvas.addWidget(type, data); return { id: 'w_1' }; },
  },
});
```

## Multi-serveurs

Plusieurs `McpLayer` peuvent coexister. Les outils sont agreges et le LLM voit tous les outils de tous les serveurs dans le prompt.

```ts
const layers: ToolLayer[] = [
  mcpLayer1,       // Tricoteuses -- politique
  mcpLayer2,       // iNaturalist -- biodiversite
  autoui.layer(),  // widgets + recettes
];
```
