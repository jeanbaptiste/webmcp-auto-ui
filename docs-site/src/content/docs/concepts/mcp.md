---
title: MCP
description: Integration MCP multi-serveurs, McpMultiClient, transport Streamable HTTP, et recettes serveur
sidebar:
  order: 5
---

MCP (Model Context Protocol) est un protocole JSON-RPC 2.0 qui permet aux agents IA de decouvrir et appeler des outils exposes par des serveurs distants. Dans webmcp-auto-ui, MCP est le pont entre les sources de donnees et l'UI.

## Architecture multi-serveurs

```
User prompt --> Agent Loop --> LLM (Claude/Gemma/Ollama)
                  |                    |
                  |              tool_use blocks
                  |                    |
         +--------+--------+          |
         |                  |          v
    McpLayer 1         McpLayer 2     WebMcpLayer
    (Tricoteuses)      (iNaturalist)  (autoui)
         |                  |
    MCP Client 1       MCP Client 2
         |                  |
    MCP Server 1       MCP Server 2
```

Chaque serveur MCP connecte produit un `McpLayer` avec ses outils et ses recettes serveur.

## McpClient (connexion simple)

```ts
import { McpClient } from '@webmcp-auto-ui/core';

const client = new McpClient('https://mcp.example.com/mcp', {
  clientName: 'my-app',
  clientVersion: '1.0.0',
  timeout: 30000,
  headers: { 'Authorization': 'Bearer <token>' },
  autoReconnect: true,
  maxReconnectAttempts: 3,
});

await client.connect();
const tools = await client.listTools();
const result = await client.callTool('query_sql', { sql: 'SELECT 1' });
await client.disconnect();
```

### API

| Methode | Retour | Description |
|---------|--------|-------------|
| `connect()` | `McpInitializeResult` | Initialise la session |
| `listTools()` | `McpTool[]` | Liste les outils du serveur |
| `callTool(name, args?)` | `McpToolResult` | Appelle un outil |
| `disconnect()` | `void` | Termine la session |

## McpMultiClient (multi-serveur)

Gere les connexions simultanees a plusieurs serveurs MCP. Agrege les listes d'outils et route les appels vers le bon serveur :

```ts
import { McpMultiClient } from '@webmcp-auto-ui/core';

const multi = new McpMultiClient();
await multi.addServer('https://mcp1.example.com/mcp');
await multi.addServer('https://mcp2.example.com/mcp');

const allTools = multi.listAllTools();
const result = await multi.callTool('query_sql', { sql: 'SELECT 1' });

await multi.removeServer('https://mcp1.example.com/mcp');
await multi.disconnectAll();
```

## Construction des layers MCP

```ts
import type { McpLayer } from '@webmcp-auto-ui/agent';
import { WEBMCP_RECIPES, filterRecipesByServer } from '@webmcp-auto-ui/agent';

const mcpLayer: McpLayer = {
  protocol: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: [
    { name: 'profil-depute', description: 'Fiche complete depute' },
  ],
};

const uiLayer = autoui.layer();

const layers = [mcpLayer, uiLayer];
```

## Ce que le LLM voit

Le prompt genere par `buildSystemPrompt(layers)` contient :

```
## mcp (Tricoteuses)

### outils DATA (12)
- query_sql: Execute une requete SQL
- list_tables: Liste les tables disponibles
...

### recettes serveur (2)
- profil-depute: Fiche complete depute
- scrutin-detail: Analyse scrutin public

## webmcp

### 3 outils UI (list_components, get_component, component)
Composants disponibles : stat, kv, list, chart, ...
```

## Transport : Streamable HTTP

Le client MCP utilise HTTP POST avec JSON-RPC 2.0 :

- **Content-Type** : `application/json`
- **Accept** : `application/json, text/event-stream`
- **Session** : header `Mcp-Session-Id` gere automatiquement
- **Auto-reconnect** : re-initialise sur 404 (session expiree), backoff exponentiel
- **SSE** : le client parse les reponses `text/event-stream`

## Recettes serveur (MCP recipes)

Les recettes MCP viennent du serveur et decrivent ce que les outils retournent. Distinctes des recettes WebMCP (UI) qui guident la presentation.

```ts
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);
```

## Pattern generation auto d'UI

```
1. L'utilisateur connecte un serveur MCP
2. L'app appelle client.listTools() -> decouverte des outils
3. L'app construit les ToolLayers (McpLayer + autoui.layer())
4. L'utilisateur pose une question en langage naturel
5. runAgentLoop:
   - LLM appelle un outil MCP (donnees)
   - LLM appelle component() (affichage)
   - Repete jusqu'a end_turn
6. Resultat : dashboard genere sans composition manuelle
```

## Exemple complet

```ts
import { McpClient } from '@webmcp-auto-ui/core';
import { runAgentLoop, autoui } from '@webmcp-auto-ui/agent';
import type { McpLayer } from '@webmcp-auto-ui/agent';

const client = new McpClient('https://mcp.code4code.eu/mcp');
await client.connect();
const tools = await client.listTools();

const mcpLayer: McpLayer = {
  protocol: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools,
};

const uiLayer = autoui.layer();

const result = await runAgentLoop('Liste les deputes ecologistes', {
  provider: claudeProvider,
  layers: [mcpLayer, uiLayer],
  callbacks: {
    onWidget: (type, data) => { blocks.push({ type, data }); return { id: 'w_1' }; },
    onText: (text) => console.log('Assistant:', text),
  },
});
```

## Contraintes

- Le serveur MCP doit supporter Streamable HTTP (POST JSON-RPC 2.0)
- `connect()` obligatoire avant `listTools()` ou `callTool()`
- Les resultats sont text-based : parser le JSON depuis `content[0].text`
- La boucle agent tronque les resultats a 10 000 caracteres
- CORS : le serveur doit autoriser les requetes depuis votre domaine

## Erreurs courantes

| Erreur | Consequence | Correction |
|--------|-------------|-----------|
| `listTools()` avant `connect()` | Erreur session | Toujours `connect()` d'abord |
| Header `Authorization` manquant | 401/403 | Passer le Bearer token |
| `timeout` trop bas | Requete abortee | Augmenter pour les queries lourdes (60000+) |
| Pas de `disconnect()` | Fuite de session serveur | Appeler au unmount |
