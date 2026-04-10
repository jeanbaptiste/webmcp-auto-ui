---
title: Workflow
description: Le flux complet layers, prompt, tools, LLM, component(), render
sidebar:
  order: 3
---

## Vue d'ensemble

Le workflow v0.8 suit un flux lineaire en 7 etapes :

```
App                      Agent Package                     LLM
 |                            |                             |
 |  1. Construit ToolLayer[]  |                             |
 |    - McpLayer (par serveur)|                             |
 |    - UILayer (+ adapter)   |                             |
 |                            |                             |
 |  2. buildSystemPrompt()    |                             |
 |  ----layers, toolMode----> |                             |
 |  <--- prompt structure --- |                             |
 |       ## mcp / ## webmcp   |                             |
 |                            |                             |
 |  3. buildToolsFromLayers() |                             |
 |  ----layers, toolMode----> |                             |
 |  <--- AnthropicTool[] ---  |                             |
 |                            |                             |
 |  4. runAgentLoop(msg, {layers})                          |
 |  ------------------------------------->  prompt + tools  |
 |                            |             |               |
 |                            |   5. list_components()      |
 |                            |   <----------------------   |
 |                            |   --- liste composants -->  |
 |                            |             |               |
 |                            |   6. query_sql({sql})       |
 |                            |   <----------------------   |
 |                   MCP call |   --- donnees ----------->  |
 |                            |             |               |
 |                            |   7. component("table",     |
 |                            |      {rows, columns})       |
 |  <-- onBlock(type, data) - |   <----------------------   |
 |  Canvas affiche le bloc    |                             |
```

## Etape par etape

### 1. Construire les ToolLayers

L'app construit un tableau de `ToolLayer[]` : un `McpLayer` par serveur MCP connecte, plus un `UILayer` unique.

```ts
import type { McpLayer, UILayer, ToolLayer } from '@webmcp-auto-ui/agent';
import { WEBMCP_RECIPES, filterRecipesByServer } from '@webmcp-auto-ui/agent';

const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: [{ name: 'profil-depute', description: 'Fiche complete depute' }],
};

const uiLayer: UILayer = {
  source: 'ui',
  recipes: filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']),
};

const layers: ToolLayer[] = [mcpLayer, uiLayer];
```

### 2. Generer le prompt systeme

`buildSystemPrompt()` produit un prompt structure en sections markdown :

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

const prompt = buildSystemPrompt(layers, { toolMode: 'smart' });
```

Le prompt genere contient :
- `## mcp (Tricoteuses)` -- liste des outils DATA + recettes serveur
- `## webmcp` -- instructions pour `component()` + recettes UI

### 3. Construire les outils

`buildToolsFromLayers()` convertit les layers en `AnthropicTool[]` :

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const tools = buildToolsFromLayers(layers, 'smart');
// Mode smart : tools MCP + 3 outils UI (list_components, get_component, component)
// Mode explicit : tools MCP + 31 render_* + component()
```

### 4. Lancer la boucle agent

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Qui est le depute de Paris 1er ?', {
  provider,
  layers,
  toolMode: 'smart',
  maxIterations: 5,
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
    onText: (text) => console.log('LLM:', text),
    onToolCall: (call) => console.log('Tool:', call.name),
  },
  signal: abortController.signal,
});
```

### 5. Discovery (mode smart)

En mode smart, le LLM dispose de 3 outils UI. Il appelle `list_components()` pour decouvrir les 56 composants disponibles, puis `get_component(nom)` pour le schema detaille :

```
LLM -> list_components()
    <- liste de 56 composants avec nom, description, flag renderable

LLM -> get_component("stat-card")
    <- schema JSON detaille de stat-card
```

### 6. Appels DATA (MCP)

Le LLM appelle les outils du serveur MCP pour obtenir des donnees :

```
LLM -> query_sql({ sql: "SELECT * FROM deputes WHERE circo = 'Paris 1'" })
    <- { content: [{ text: "[{nom: 'Dupont', ...}]" }] }
```

### 7. Rendu (component)

Le LLM appelle `component()` avec un type et des parametres pour rendre le resultat :

```
LLM -> component("profile", { name: "Jean Dupont", subtitle: "Depute de Paris 1" })
    -> onBlock("profile", { name: "Jean Dupont", ... })
    -> Canvas affiche le bloc
```

## Mode smart vs explicit

| | Smart (defaut) | Explicit |
|--|---------------|----------|
| **Outils UI** | 3 : `list_components()`, `get_component()`, `component()` | 31 `render_*` + `component()` |
| **Discovery** | `list_components()` + `get_component(nom)` | Le LLM voit tous les tools |
| **Tokens schema** | ~200 tokens | ~3000 tokens |
| **Recommandation** | Cloud (Claude) | WASM (Gemma) ou debug |

## Resultat de la boucle

```ts
console.log(result.text);       // texte final du LLM
console.log(result.toolCalls);  // liste des tool calls effectues
console.log(result.metrics);    // metriques (tokens, latence, iterations)
console.log(result.stopReason); // 'end_turn' | 'max_iterations' | 'error'
console.log(result.messages);   // conversation complete pour reprise
```

## Recettes dans le workflow

Les recettes s'integrent dans le flow layers -> prompt -> LLM -> component() a trois niveaux :

### Au moment de la connexion (etape 1)

L'app collecte les recettes des deux cotes :

```ts
// Recettes MCP : du serveur
const mcpRecipes = JSON.parse(
  (await client.callTool('list_recipes', {})).content[0].text
);

// Recettes WebMCP : fichiers .md locaux, filtrees par serveur
const uiRecipes = filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']);
```

Les deux sont injectees dans les layers :

```ts
const mcpLayer: McpLayer = { source: 'mcp', ..., recipes: mcpRecipes };
const uiLayer: UILayer = { source: 'ui', recipes: uiRecipes };
```

### Dans le prompt (etape 2)

`buildSystemPrompt()` injecte des resumes compacts — pas le body :

```
## mcp (Tricoteuses)
### recettes serveur (2)
- profil-depute: Fiche complete avec votes et mandats

## webmcp
### recettes UI (3)
- Composer un tableau de bord KPI: metriques numeriques [stat-card, chart, table, kv]
```

### Pendant la boucle agent (etapes 5-7)

Le LLM decouvre les details a la demande (lazy loading) :

```
LLM -> list_components()               <- liste composants + recettes WebMCP
LLM -> get_component("weather-viz")    <- body complet recette WebMCP
LLM -> get_recipe("profil-depute")      <- body complet recette MCP serveur
LLM -> component("stat-card", {label: "Temperature", value: "22°C"})
    -> onBlock -> Canvas
```

Les recettes WebMCP guident le **View** (comment afficher), les recettes MCP guident le **Model/Data** (quoi demander). L'agent utilise les deux ensemble.

Voir [Recettes](/fr/concepts/recipes/) pour le detail complet des types et du lazy loading.

## Pattern generation auto d'UI

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
