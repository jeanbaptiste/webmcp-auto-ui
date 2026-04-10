# Integration MCP -- Guide Agent

> Ce document est concu pour etre injecte dans le contexte d'un agent IA. Il couvre la connexion multi-MCP, les ToolLayers, et les recettes serveur.

## Qu'est-ce que MCP ?

MCP (Model Context Protocol) est un protocole JSON-RPC 2.0 qui permet aux agents IA de decouvrir et appeler des outils exposes par des serveurs distants. Dans webmcp-auto-ui, MCP est le pont entre les sources de donnees et l'UI.

## Architecture v0.8 : ToolLayers

```
User prompt --> Agent Loop --> LLM (Claude/Gemma/Ollama)
                  |                    |
                  |              tool_use blocks
                  |                    |
         +--------+--------+          |
         |                  |          v
    McpLayer 1         McpLayer 2     UILayer
    (Tricoteuses)      (iNaturalist)  (component())
         |                  |
    MCP Client 1       MCP Client 2
         |                  |
    MCP Server 1       MCP Server 2
```

Chaque serveur MCP connecte produit un `McpLayer` avec ses outils et ses recettes serveur. Le tout est agrege dans un `ToolLayer[]` passe a `runAgentLoop`.

### Construction des layers

```ts
import type { McpLayer, UILayer, ToolLayer } from '@webmcp-auto-ui/agent';
import { WEBMCP_RECIPES, filterRecipesByServer } from '@webmcp-auto-ui/agent';

// Layer MCP pour chaque serveur connecte
const mcpLayer1: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client1.listTools(),
  recipes: [
    { name: 'profil-depute', description: 'Fiche complete depute' },
    { name: 'scrutin-detail', description: 'Analyse scrutin public' },
  ],
};

const mcpLayer2: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://other-mcp.example.com/mcp',
  serverName: 'iNaturalist',
  tools: await client2.listTools(),
};

// Layer UI avec recettes filtrees par serveurs connectes
const serverNames = ['Tricoteuses', 'iNaturalist'];
const uiLayer: UILayer = {
  source: 'ui',
  recipes: filterRecipesByServer(WEBMCP_RECIPES, serverNames),
};

const layers: ToolLayer[] = [mcpLayer1, mcpLayer2, uiLayer];
```

### Ce que le LLM voit (prompt genere)

```
## mcp (Tricoteuses, iNaturalist)

### outils DATA (12)
- query_sql: Execute une requete SQL
- list_tables: Liste les tables disponibles
- describe_table: Schema d'une table
- search_recipes: Recherche des recettes
...

### recettes serveur (2)
- profil-depute: Fiche complete depute
- scrutin-detail: Analyse scrutin public

## webmcp

### 3 outils UI (list_components, get_component, component)
Appelle list_components() pour decouvrir, get_component(nom) pour le schema, component(nom, {params}) pour rendre.
Composants disponibles : stat, kv, list, chart, alert, ...
```

## McpClient et McpMultiClient

### McpClient (connexion simple)

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

### McpMultiClient (multi-serveur)

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

## Recettes serveur (MCP recipes)

Les recettes MCP viennent du serveur et decrivent ce que les outils retournent et comment les combiner. Elles sont distinctes des recettes WebMCP (UI) qui guident le LLM sur la presentation.

### Obtenir les recettes

```ts
// Certains serveurs exposent list_recipes / get_recipe
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);

// Ajouter au McpLayer
const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: client.url,
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: mcpRecipes,
};
```

### Difference WebMCP vs MCP recipes

| | Recette WebMCP (UI) | Recette MCP (serveur) |
|--|---------------------|----------------------|
| Source | Package agent (fichiers .md) | Serveur MCP (`list_recipes`) |
| Contenu | Comment presenter avec component() | Ce que les outils retournent |
| Section prompt | `## webmcp > recettes UI` | `## mcp > recettes serveur` |
| Type | `Recipe` | `McpRecipe` |
| Porte par | `UILayer.recipes` | `McpLayer.recipes` |

## Transport : Streamable HTTP

Le client MCP utilise HTTP POST avec JSON-RPC 2.0 :

- **Content-Type** : `application/json`
- **Accept** : `application/json, text/event-stream`
- **Session** : header `Mcp-Session-Id` gere automatiquement
- **Auto-reconnect** : re-initialise sur 404 (session expiree), backoff exponentiel
- **SSE** : le client parse les reponses `text/event-stream`

## Pattern : generation auto d'UI

```
1. L'utilisateur connecte un serveur MCP
2. L'app appelle client.listTools() -> decouverte des outils
3. L'app construit les ToolLayers (McpLayer + UILayer)
4. L'utilisateur pose une question en langage naturel
5. runAgentLoop:
   - LLM appelle un outil MCP (donnees)
   - LLM appelle component() (affichage)
   - Repete jusqu'a end_turn
6. Resultat : dashboard genere sans composition manuelle
```

### Exemple complet

```ts
import { McpClient } from '@webmcp-auto-ui/core';
import { runAgentLoop, WEBMCP_RECIPES, filterRecipesByServer } from '@webmcp-auto-ui/agent';
import type { McpLayer, UILayer } from '@webmcp-auto-ui/agent';

// 1. Connecter
const client = new McpClient('https://mcp.code4code.eu/mcp');
await client.connect();
const tools = await client.listTools();

// 2. Construire les layers
const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools,
};

const uiLayer: UILayer = {
  source: 'ui',
  recipes: filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']),
};

// 3. Lancer
const result = await runAgentLoop('Liste les deputes du groupe Ecologiste', {
  provider: claudeProvider,
  layers: [mcpLayer, uiLayer],
  toolMode: 'smart',
  callbacks: {
    onBlock: (type, data) => blocks.push({ type, data }),
    onText: (text) => console.log('Assistant:', text),
  },
});
```

## Authentification

```ts
const client = new McpClient('https://mcp.example.com/mcp', {
  headers: { 'Authorization': 'Bearer eyJhbGci...' },
});
```

Le token est envoye avec chaque requete (initialize, tools/list, tools/call).

## Options McpClient

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

## Contraintes

- Le serveur MCP doit supporter Streamable HTTP (POST JSON-RPC 2.0).
- `connect()` obligatoire avant `listTools()` ou `callTool()`.
- Les resultats sont text-based : parser le JSON depuis `content[0].text`.
- La boucle agent tronque les resultats a 10 000 caracteres.
- CORS : le serveur doit autoriser les requetes depuis votre domaine.

## Erreurs courantes

| Erreur | Consequence | Correction |
|--------|-------------|-----------|
| `listTools()` avant `connect()` | Erreur session | Toujours `connect()` d'abord |
| Header `Authorization` manquant | 401/403 | Passer le Bearer token |
| Ignorer `isError` sur les resultats | Donnees incorrectes affichees | Verifier `result.isError` |
| `timeout` trop bas | Requete abortee | Augmenter pour les queries lourdes (60000+) |
| Pas de `disconnect()` | Fuite de session serveur | Appeler au unmount |
