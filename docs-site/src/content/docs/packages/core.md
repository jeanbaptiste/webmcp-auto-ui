---
title: "@webmcp-auto-ui/core"
description: W3C WebMCP polyfill et client MCP Streamable HTTP. Zero dependances, framework-agnostic.
sidebar:
  order: 2
---

W3C WebMCP polyfill and MCP Streamable HTTP client. Zero dependances, framework-agnostic, SSR-safe.

## Ce que fait le package

- Implemente le W3C WebMCP Draft CG Report (2026-03-27) comme polyfill sur `navigator.modelContext`
- Fournit `McpClient` pour se connecter a des serveurs MCP via Streamable HTTP (JSON-RPC 2.0)
- Inclut un bridge postMessage pour l'invocation d'outils cross-frame
- Ship des result builders et un skills registry leger pour l'enregistrement de tools WebMCP

## Polyfill

```ts
import {
  initializeWebMCPPolyfill,
  cleanupWebMCPPolyfill,
  hasNativeWebMCP,
  executeToolInternal,
} from '@webmcp-auto-ui/core';
```

**`initializeWebMCPPolyfill(options?)`** -- Installe le polyfill sur `navigator.modelContext`. Appeler une fois au demarrage de l'app.

```ts
initializeWebMCPPolyfill({
  confirmationPolicy: 'auto', // 'auto' | 'always' | 'never'
});
```

**`cleanupWebMCPPolyfill()`** -- Supprime le polyfill et restaure les descriptors precedents.

**`hasNativeWebMCP()`** -- Retourne `true` si le navigateur a un support WebMCP natif.

## McpClient

```ts
import { McpClient } from '@webmcp-auto-ui/core';

const client = new McpClient('https://mcp.example.com/mcp', {
  clientName: 'my-app',
  clientVersion: '1.0.0',
  timeout: 30000,
  headers: { Authorization: 'Bearer ...' },
});

const info = await client.connect();
const tools = await client.listTools();
const result = await client.callTool('get_weather', { city: 'Paris' });
await client.disconnect();
```

### API McpClient

| Methode | Retour | Description |
|---------|--------|-------------|
| `connect()` | `McpInitializeResult` | Initialise la session MCP |
| `listTools()` | `McpTool[]` | Liste tous les outils du serveur |
| `callTool(name, args?)` | `McpToolResult` | Appelle un outil avec des arguments optionnels |
| `disconnect()` | `void` | Termine la session |

### Options

```ts
interface McpClientOptions {
  clientName?: string;
  clientVersion?: string;
  timeout?: number;               // default: 30000
  headers?: Record<string, string>;
  autoReconnect?: boolean;        // default: true
  maxReconnectAttempts?: number;  // default: 3
}
```

## McpMultiClient

Gere les connexions simultanees a plusieurs serveurs MCP. Agrege les listes d'outils et route les appels vers le bon serveur.

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

## Bridge postMessage

Pour l'invocation d'outils entre frames (iframes, popups) :

```ts
import {
  listenForAgentCalls,
  callToolViaPostMessage,
  isWebMCPEvent,
} from '@webmcp-auto-ui/core';

// Ecouter les appels d'outils entrants
const cleanup = listenForAgentCalls(async (event) => {
  const result = await executeToolInternal(event.name, event.args);
  return result;
});

// Envoyer un appel d'outil a une fenetre parente
const result = await callToolViaPostMessage(window.parent, 'get_data', { id: 42 });
```

## Utilitaires

```ts
import {
  dispatchAndWait,
  signalCompletion,
  sanitizeSchema,
  createToolGroup,
} from '@webmcp-auto-ui/core';
```

**`sanitizeSchema(schema)`** -- Nettoie un JSON Schema pour la compatibilite API Anthropic (supprime les champs non supportes).

**`createToolGroup(prefix, tools)`** -- Regroupe des outils lies sous un prefix commun.

**`dispatchAndWait(eventName, detail?)`** -- Dispatche un CustomEvent et attend un evenement de completion. Resout le pattern "execute must return after UI updates".

## Result builders et skill registry

```ts
import {
  textResult,
  jsonResult,
  registerSkill,
  listSkills,
} from '@webmcp-auto-ui/core';

// Result builders
return textResult('Operation terminee');
return jsonResult({ count: 42, items: ['a', 'b'] });

// Enregistrer un skill comme outil WebMCP
registerSkill({
  id: 'weather',
  name: 'Weather Dashboard',
  description: 'Affiche les conditions meteo locales',
  component: 'WeatherDash',
});
```

## Validation

```ts
import { validateJsonSchema } from '@webmcp-auto-ui/core';

const result = validateJsonSchema(someSchema);
if (!result.valid) {
  console.error(result.errors);
}
```

## Prompt caching

La propriete `cache_control` est appliquee sur le tableau d'outils (pas sur les outils individuels) pour fonctionner correctement avec l'API de prompt caching d'Anthropic. Cela assure des cache hits quand l'ensemble d'outils est stable entre les requetes consecutives.
