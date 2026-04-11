# @webmcp-auto-ui/agent

Boucle agent LLM avec providers Anthropic, Gemma LiteRT et locaux (Ollama/Llamafile), ToolLayers structures, serveur `autoui` pre-configure, lazy loading, TokenTracker et summarizeChat.

## Ce que fait le package

- Boucle agent iterative : prompt -> tool calls -> LLM -> repeat jusqu'a `end_turn`
- **ToolLayers** : structuration des outils en couches `McpLayer` (donnees) et `WebMcpLayer` (affichage)
- **autoui** : serveur WebMCP pre-configure avec 26 widgets natifs + outils canvas/recall
- **Lazy loading** : `buildDiscoveryTools()` au demarrage, `activateServerTools()` a la demande
- **Tool naming** : `{serverName}_{protocol}_{toolName}` pour le routage automatique
- 4 providers LLM : `RemoteLLMProvider`, `WasmProvider`, `LocalLLMProvider`, + legacy `AnthropicProvider`/`GemmaProvider`
- TokenTracker temps reel + summarizeChat pour la provenance HyperSkill

## autoui — serveur WebMCP built-in

Le package exporte un serveur WebMCP pre-configure `autoui` avec 26 widgets natifs et 2 outils custom (canvas, recall) :

```ts
import { autoui } from '@webmcp-auto-ui/agent';

// Obtenir le layer pour la boucle agent
const autouiLayer = autoui.layer();
// { protocol: 'webmcp', serverName: 'autoui', description: '...', tools: [...] }

// Le layer contient automatiquement :
// - search_recipes : lister les recettes des 26 widgets
// - get_recipe : obtenir le schema + instructions d'un widget
// - widget_display : afficher un widget sur le canvas
// - canvas : manipuler les widgets (clear, update, move, resize, style)
// - recall : relire un resultat d'outil precedent
```

Les 26 widgets natifs : stat, kv, list, chart, alert, code, text, actions, tags, data-table, timeline, profile, trombinoscope, json-viewer, hemicycle, chart-rich, cards, sankey, log, gallery, carousel, map, stat-card, grid-data, d3, js-sandbox.

```ts
import { NATIVE_WIDGET_NAMES } from '@webmcp-auto-ui/agent';
// readonly array of all 26 widget names
```

## Providers

### RemoteLLMProvider (nouveau)

Provider unifie pour les API cloud (Anthropic et compatibles). Remplace `AnthropicProvider` (qui reste disponible en alias).

```ts
import { RemoteLLMProvider } from '@webmcp-auto-ui/agent';

const provider = new RemoteLLMProvider({
  proxyUrl: '/api/chat',
  model: 'haiku',          // 'haiku' | 'sonnet' | 'opus' | string
  apiKey: 'sk-ant-...',    // optionnel
});
```

### WasmProvider (nouveau)

Provider unifie pour les modeles WASM in-browser. Remplace `GemmaProvider` (qui reste disponible en alias).

```ts
import { WasmProvider } from '@webmcp-auto-ui/agent';

const provider = new WasmProvider({
  model: 'gemma-e2b',      // 'gemma-e2b' | 'gemma-e4b' | string
  onProgress: (pct, status, loaded, total) => console.log(`${pct}%`),
  onStatusChange: (status) => console.log(status),
});
```

Tourne sur le main thread via `@mediapipe/tasks-genai` (LiteRT). WebGPU si disponible. Cache OPFS.

### LocalLLMProvider (nouveau)

Provider pour les LLM locaux via API OpenAI-compatible (Ollama, Llamafile, LM Studio).

```ts
import { LocalLLMProvider } from '@webmcp-auto-ui/agent';

const provider = new LocalLLMProvider({
  baseUrl: 'http://localhost:11434',  // Ollama
  model: 'llama3.2',
  backend: 'ollama',                  // 'ollama' | 'llamafile' | 'lm-studio' | string
});
```

### createProvider (factory)

Cree un provider a partir d'un objet de configuration :

```ts
import { createProvider, type LLMConfig } from '@webmcp-auto-ui/agent';

const config: LLMConfig = { type: 'remote', model: 'sonnet', proxyUrl: '/api/chat' };
const provider = createProvider(config);
```

### LLMProvider interface

```ts
interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: {
      signal?: AbortSignal;
      cacheEnabled?: boolean;
      system?: string;
      temperature?: number;
      topK?: number;
      maxTokens?: number;
      maxTools?: number;
      onToken?: (token: string) => void;
    }
  ): Promise<LLMResponse>;
}
```

### TokenTracker

```ts
import { TokenTracker } from '@webmcp-auto-ui/agent';

const tracker = new TokenTracker();
tracker.record({ inputTokens: 500, outputTokens: 120, cached: 400, latencyMs: 850 });
console.log(tracker.stats);
```

### summarizeChat

```ts
import { summarizeChat } from '@webmcp-auto-ui/agent';

const summary = summarizeChat(messages);
// Resume anonymise sans PII pour la provenance HyperSkill
```

## ToolLayers

Les ToolLayers structurent les outils en couches typees. Chaque layer porte un `protocol` et un `serverName`.

### Types

```ts
/** Couche MCP — outils et recettes d'un serveur connecte */
interface McpLayer {
  protocol: 'mcp';
  serverName: string;
  description?: string;
  serverUrl?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}

/** Couche WebMCP — outils d'un serveur WebMCP (autoui, custom) */
interface WebMcpLayer {
  protocol: 'webmcp';
  serverName: string;
  description: string;
  tools: WebMcpToolDef[];
}

type ToolLayer = McpLayer | WebMcpLayer;
```

### buildDiscoveryTools

Construit le jeu d'outils initial (decouverte seulement). Envoye au LLM au premier tour :

```ts
import { buildDiscoveryTools } from '@webmcp-auto-ui/agent';

const tools = buildDiscoveryTools(layers);
// Pour chaque serveur : search_recipes, get_recipe
// Pour les serveurs WebMCP : + widget_display, canvas, recall
```

### activateServerTools

Ajoute tous les outils d'un serveur au jeu actif. Appele quand le LLM touche un serveur pour la premiere fois :

```ts
import { activateServerTools } from '@webmcp-auto-ui/agent';

const updatedTools = activateServerTools(currentTools, layer);
// Ajoute les outils du layer qui ne sont pas deja presents
```

### buildToolsFromLayers

Construit tous les outils de tous les layers (sans lazy loading) :

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const allTools = buildToolsFromLayers(layers);
// Tous les outils de tous les layers, prefixes {server}_{protocol}_{tool}
```

### buildSystemPrompt

Genere le prompt systeme dynamique a partir des layers connectes :

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

const prompt = buildSystemPrompt(layers);
```

Le prompt genere contient :
- Liste des serveurs connectes (nom, protocole, description)
- Strategie en 3 etapes : recettes d'abord, donnees, affichage
- Instructions sur les prefixes d'outils

## Agent loop

### runAgentLoop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Montre-moi le CA par trimestre', {
  provider,
  layers: [mcpLayer, autoui.layer()],
  maxIterations: 5,
  cacheEnabled: true,
  initialMessages: history,
  callbacks: {
    onWidget: (type, data) => canvas.addWidget(type, data),
    onText: (text) => console.log('LLM:', text),
    onToolCall: (call) => console.log('Tool:', call.name),
    onToken: (token) => process.stdout.write(token),
  },
  signal: abortController.signal,
});

console.log(result.text);
console.log(result.toolCalls);
console.log(result.metrics);
console.log(result.stopReason);  // 'end_turn' | 'max_iterations' | 'error'
console.log(result.messages);    // conversation complete pour reprise
```

### AgentLoopOptions

```ts
interface AgentLoopOptions {
  provider: LLMProvider;
  client?: McpClient;             // MCP client — optionnel si WebMCP only
  layers?: ToolLayer[];           // layers structures
  maxIterations?: number;         // default: 5
  maxTokens?: number;
  maxTools?: number;
  temperature?: number;
  topK?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;          // override le prompt auto-genere
  initialMessages?: ChatMessage[];
  callbacks?: AgentCallbacks;
  signal?: AbortSignal;
}
```

### AgentCallbacks

```ts
interface AgentCallbacks {
  onIterationStart?: (iteration: number, maxIterations: number) => void;
  onLLMRequest?: (messages: ChatMessage[], tools: AnthropicTool[]) => void;
  onLLMResponse?: (response: LLMResponse, latencyMs: number, tokens?: { input: number; output: number }) => void;
  onToolCall?: (call: ToolCall) => void;
  onWidget?: (type: string, data: Record<string, unknown>) => { id: string } | void;
  onClear?: () => void;
  onText?: (text: string) => void;
  onToken?: (token: string) => void;
  onDone?: (metrics: AgentMetrics) => void;
  onUpdate?: (id: string, data: Record<string, unknown>) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onStyle?: (id: string, styles: Record<string, string>) => void;
}
```

> **Note** : `onWidget` remplace `onBlock`. Appele quand `widget_display` est invoque avec succes.

### trimConversationHistory

Tronque l'historique pour respecter un budget de tokens :

```ts
import { trimConversationHistory } from '@webmcp-auto-ui/agent';

const trimmed = trimConversationHistory(messages, 4096);
```

### Helpers

- **`mcpToolsToAnthropic(tools)`** — Convertit `McpToolDef[]` en `AnthropicTool[]`
- **`fromMcpTools(mcpTools)`** — Convertit `McpTool[]` (from core) en `McpToolDef[]`

## Recettes WebMCP

Les recettes guident le LLM sur comment presenter les donnees. Ce sont des fichiers `.md` avec un frontmatter YAML.

### Format d'une recette

```markdown
---
widget: stat
description: Statistique cle (KPI, compteur, total).
schema:
  type: object
  required:
    - label
    - value
  properties:
    label:
      type: string
    value:
      type: string
---

## Quand utiliser
Pour afficher un chiffre cle unique (KPI, total, compteur).

## Comment
Appeler widget_display('stat', {label: "Total", value: "42"}).
```

### API

```ts
import {
  WEBMCP_RECIPES,        // recettes built-in parsees
  parseRecipe,            // parser une recette .md brute
  parseRecipes,           // parser un lot de recettes
  recipeRegistry,         // registre singleton (read-only)
  registerRecipes,        // populer le registre
  filterRecipesByServer,  // filtrer par nom de serveur connecte
  formatRecipesForPrompt, // formater pour injection dans le prompt
} from '@webmcp-auto-ui/agent';
```

## Workflow complet (Phase 8)

```
1. L'app construit des ToolLayer[]
   - McpLayer pour chaque serveur MCP connecte
   - WebMcpLayer via autoui.layer() + serveurs custom optionnels

2. buildDiscoveryTools(layers)
   -> outils de decouverte uniquement (search_recipes, get_recipe, widget_display, canvas, recall)

3. buildSystemPrompt(layers)
   -> prompt dynamique: serveurs connectes + strategie

4. runAgentLoop(msg, { layers, ... })
   -> boucle LLM iterative avec lazy loading

5. Deroulement type:
   LLM appelle autoui_webmcp_search_recipes() -> decouverte widgets
   LLM appelle tricoteuses_mcp_search_recipes() -> decouverte donnees
     -> activateServerTools() charge les outils tricoteuses
   LLM appelle tricoteuses_mcp_query_sql({sql}) -> donnees
   LLM appelle autoui_webmcp_get_recipe('data-table') -> schema
   LLM appelle autoui_webmcp_widget_display({name:'data-table', params:{rows}}) -> affichage
     -> callbacks.onWidget('data-table', {rows}) -> canvas.addWidget(...)

6. Les recettes guident le LLM sur le choix des widgets
```

## Exports complets

```ts
// Providers
export { RemoteLLMProvider, WasmProvider, LocalLLMProvider, createProvider };
export { AnthropicProvider, GemmaProvider };  // backward compat

// autoui server
export { autoui, NATIVE_WIDGET_NAMES };

// Agent loop
export { runAgentLoop, buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools, trimConversationHistory };

// Tool layers
export { buildToolsFromLayers, buildDiscoveryTools, activateServerTools };
export type { ToolLayer, McpLayer, WebMcpLayer };

// Re-export core WebMCP types
export type { WebMcpServer, WebMcpToolDef, WidgetEntry };

// Recettes
export { WEBMCP_RECIPES, parseRecipe, parseRecipes };
export { recipeRegistry, registerRecipes, filterRecipesByServer, formatRecipesForPrompt, formatMcpRecipesForPrompt };

// Utilitaires
export { TokenTracker, summarizeChat };

// Types
export type {
  RemoteModelId, WasmModelId, LLMId, ModelId,
  ChatMessage, ContentBlock, McpToolDef, AnthropicTool,
  LLMProvider, LLMResponse, ToolCall, AgentMetrics, AgentResult, AgentCallbacks,
  Recipe, McpRecipe, AgentLoopOptions,
};
```

## Supprime en Phase 8

Les exports suivants ont ete supprimes :

- `UILayer` — remplace par `WebMcpLayer`
- `SkillLayer` — supprime
- `componentRegistry` — remplace par le registre interne de `autoui`
- `ComponentAdapter` — remplace par `createWebMcpServer` + `registerWidget`
- `UI_TOOLS`, `isUITool`, `executeUITool` — remplaces par les outils generes par les serveurs WebMCP
- `COMPONENT_TOOL`, `executeComponent` — remplace par `widget_display` dans les serveurs WebMCP
- `toolMode` ('smart' / 'explicit') — plus de distinction, le lazy loading remplace
