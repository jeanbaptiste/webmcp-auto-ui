# @webmcp-auto-ui/agent

Boucle agent LLM avec providers Anthropic, Gemma LiteRT et locaux (Ollama/Llamafile), ToolLayers structurés, recettes WebMCP, `component()` unifié (56 composants), TokenTracker et summarizeChat.

## Ce que fait le package

- Boucle agent itérative : prompt -> tool calls -> LLM -> repeat jusqu'à `end_turn`
- **ToolLayers** : structuration des outils en couches `McpLayer` (données) et `UILayer` (affichage)
- **Mode smart/explicit** : `toolMode: 'smart'` = 1 seul tool `component()`, `'explicit'` = 31 `render_*`
- **Recettes WebMCP** : fichiers `.md` avec frontmatter, parsées et injectées dans le prompt
- **ComponentAdapter** : filtrage/personnalisation des composants UI exposés au LLM
- 4 providers LLM : `RemoteLLMProvider`, `WasmProvider`, `LocalLLMProvider`, + legacy `AnthropicProvider`/`GemmaProvider`
- TokenTracker temps réel + summarizeChat pour la provenance HyperSkill

## Providers

### RemoteLLMProvider (nouveau)

Provider unifié pour les API cloud (Anthropic et compatibles). Remplace `AnthropicProvider` (qui reste disponible en alias).

```ts
import { RemoteLLMProvider } from '@webmcp-auto-ui/agent';

const provider = new RemoteLLMProvider({
  proxyUrl: '/api/chat',
  model: 'haiku',          // 'haiku' | 'sonnet' | 'opus' | string
  apiKey: 'sk-ant-...',    // optionnel
});
```

### WasmProvider (nouveau)

Provider unifié pour les modèles WASM in-browser. Remplace `GemmaProvider` (qui reste disponible en alias).

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

Crée un provider à partir d'un objet de configuration :

```ts
import { createProvider, type LLMConfig } from '@webmcp-auto-ui/agent';

const config: LLMConfig = { type: 'remote', model: 'sonnet', proxyUrl: '/api/chat' };
const provider = createProvider(config);
```

Types de config : `{ type: 'remote' }`, `{ type: 'wasm' }`, `{ type: 'local' }`.

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
// { reqPerMin, inputPerMin, outputPerMin, cachedPerMin, totalRequests, totalInput, totalOutput }
```

### summarizeChat

```ts
import { summarizeChat } from '@webmcp-auto-ui/agent';

const summary = summarizeChat(messages);
// Résumé anonymisé sans PII pour la provenance HyperSkill
```

## ToolLayers

Les ToolLayers structurent les outils en couches typées. C'est la nouvelle API (v0.7.0) qui remplace le passage plat de `mcpTools[]`.

### Types

```ts
/** Couche MCP — outils et recettes d'un serveur connecté */
interface McpLayer {
  source: 'mcp';
  serverUrl: string;
  serverName?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}

/** Couche UI — component() + recettes WebMCP */
interface UILayer {
  source: 'ui';
  adapter?: ComponentAdapter;  // filtrage des composants (mode explicit uniquement)
  recipes?: Recipe[];
}

type ToolLayer = McpLayer | UILayer;
```

### buildToolsFromLayers

Convertit les layers en `AnthropicTool[]` envoyés au LLM :

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const tools = buildToolsFromLayers(layers, 'smart');
// Mode smart : tools MCP + 1 seul tool component()
// Mode explicit : tools MCP + 31 render_* + component()
```

### buildSystemPrompt

Génère le prompt système structuré en sections markdown `## mcp` et `## webmcp` :

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

// Nouvelle API — depuis les layers
const prompt = buildSystemPrompt(layers, { toolMode: 'smart' });

// Legacy — depuis un tableau plat de McpToolDef[]
const prompt2 = buildSystemPrompt(mcpTools);
```

Le prompt généré contient :
- `## mcp (serverName)` — liste des outils DATA + recettes serveur
- `## webmcp` — instructions pour `component()` (mode smart) ou liste des `render_*` (mode explicit) + recettes UI

## Mode smart vs explicit

| | Smart (defaut) | Explicit |
|--|---------------|----------|
| **Outils UI** | 1 seul : `component()` | 31 `render_*` + `component()` |
| **Discovery** | `component("help")` pour lister | Le LLM voit tous les tools |
| **Tokens** | Economique (~200 tokens schema) | Couteux (~3000 tokens) |
| **Recommandation** | Cloud (Claude) | WASM (Gemma) ou debug |

En mode smart, le LLM appelle `component("help")` pour decouvrir les composants disponibles, puis `component("nom", {params})` pour rendre.

## Agent loop

### runAgentLoop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Montre-moi le CA par trimestre', {
  provider,
  layers: [mcpLayer, uiLayer],   // nouvelle API
  toolMode: 'smart',
  maxIterations: 5,
  cacheEnabled: true,
  initialMessages: history,       // historique conversation
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
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
  client?: McpClient;
  mcpTools?: McpToolDef[];       // legacy — prefer layers
  layers?: ToolLayer[];          // nouvelle API
  toolMode?: 'smart' | 'explicit';
  maxIterations?: number;        // default: 5
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;         // override le prompt auto-genere
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
  onBlock?: (type: string, data: Record<string, unknown>) => { id: string } | void;
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

### trimConversationHistory

Tronque l'historique pour respecter un budget de tokens :

```ts
import { trimConversationHistory } from '@webmcp-auto-ui/agent';

const trimmed = trimConversationHistory(messages, 4096);
// Supprime les paires user/assistant les plus anciennes en preservant les system messages
```

### Helpers

- **`mcpToolsToAnthropic(tools)`** — Convertit `McpToolDef[]` en `AnthropicTool[]`
- **`fromMcpTools(mcpTools)`** — Convertit `McpTool[]` (from core) en `McpToolDef[]`

## Outils UI

22 tools render + actions canvas. Chaque `render_*` mappe vers un block type dans `@webmcp-auto-ui/ui`.

```ts
import { UI_TOOLS, isUITool, executeUITool } from '@webmcp-auto-ui/agent';
```

| Tool | Block type |
|------|-----------|
| `render_stat` | `stat` |
| `render_kv` | `kv` |
| `render_list` | `list` |
| `render_chart` | `chart` |
| `render_alert` | `alert` |
| `render_code` | `code` |
| `render_text` | `text` |
| `render_actions` | `actions` |
| `render_tags` | `tags` |
| `render_table` | `data-table` |
| `render_timeline` | `timeline` |
| `render_profile` | `profile` |
| `render_trombinoscope` | `trombinoscope` |
| `render_json` | `json-viewer` |
| `render_hemicycle` | `hemicycle` |
| `render_chart_rich` | `chart-rich` |
| `render_cards` | `cards` |
| `render_sankey` | `sankey` |
| `render_log` | `log` |
| `render_gallery` | `gallery` |
| `render_carousel` | `carousel` |
| `render_d3` | `d3` |
| `clear_canvas` | (action) |

## component() unifie

Tool unique qui expose 56 composants (31 renderable, 25 non-renderable). En mode smart, c'est le seul outil UI visible par le LLM.

```ts
import { COMPONENT_TOOL, executeComponent, componentRegistry } from '@webmcp-auto-ui/agent';
```

### Trois modes d'appel

| Appel | Retour |
|-------|--------|
| `component("help")` | Liste des 56 composants avec nom, description, flag `renderable` |
| `component("help", "stat-card")` | Schema + description + renderability d'un composant |
| `component("stat-card", { label: "Revenue", value: "$142K" })` | Rend le composant |

Les noms utilisent des tirets (`stat-card`). Les noms `render_*` sont acceptes en backward compat.

### Composants custom

```ts
componentRegistry.set('my-widget', {
  name: 'my-widget',
  toolName: 'my-widget',
  description: 'Widget custom.',
  inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
  renderable: false,
});
```

## ComponentAdapter

Filtre et personnalise les composants UI exposes au LLM. Utile en mode explicit pour limiter les tools envoyes.

```ts
import { ComponentAdapter, nativePreset, allNativePreset, minimalPreset } from '@webmcp-auto-ui/agent';

// Preset minimal : stat, kv, chart, table, text + clear, update
const adapter = new ComponentAdapter();
adapter.registerAll(minimalPreset());

// Preset complet
adapter.registerAll(allNativePreset());

// Preset par groupes
adapter.registerAll(nativePreset('simple', 'rich', 'canvas'));

// Utilisation dans un UILayer
const uiLayer: UILayer = { source: 'ui', adapter, recipes: myRecipes };
```

### Groupes disponibles

| Groupe | Composants |
|--------|-----------|
| `simple` | stat, kv, list, chart, alert, code, text, actions, tags |
| `rich` | table, timeline, profile, trombinoscope, json, hemicycle, chart-rich, cards, sankey, log, stat-card, grid |
| `media` | gallery, carousel, map |
| `advanced` | d3, js-sandbox |
| `canvas` | clear, update, move, resize, style |

### API

```ts
class ComponentAdapter {
  register(def: ComponentDef): this;
  registerAll(defs: ComponentDef[]): this;
  unregister(type: string): this;
  tools(): AnthropicTool[];         // definitions a envoyer au LLM
  types(): string[];
  get(type: string): ComponentDef | undefined;
  getRenderer(type: string): unknown | undefined;
  byGroup(group: string): ComponentDef[];
  get size(): number;
}
```

## Recettes WebMCP

Les recettes guident le LLM sur comment presenter les donnees. Ce sont des fichiers `.md` avec un frontmatter YAML.

### Format d'une recette

```markdown
---
id: composer-tableau-de-bord-kpi
name: Composer un tableau de bord KPI
components_used: [stat-card, chart, table, kv]
when: les donnees contiennent des metriques numeriques
servers: []
layout:
  type: grid
  columns: 3
---

## Quand utiliser
Les resultats MCP contiennent des metriques numeriques...

## Comment
1. Identifier les 3-5 KPIs principaux
2. Afficher chaque KPI en stat-card
3. Ajouter un chart pour les series temporelles
```

### Types

```ts
interface Recipe {
  id: string;
  name: string;
  description?: string;
  components_used?: string[];
  layout?: { type: string; columns?: number; arrangement?: string };
  when: string;
  servers?: string[];
  body: string;
}

interface McpRecipe {
  name: string;
  description?: string;
}
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

// Les recettes built-in sont auto-enregistrees a l'import
console.log(WEBMCP_RECIPES.length); // 8+ recettes

// Filtrer par serveur connecte
const relevant = filterRecipesByServer(WEBMCP_RECIPES, ['tricoteuses']);

// Formater pour le prompt (compact, <500 tokens pour 5 recettes)
const text = formatRecipesForPrompt(relevant);
```

### Recettes MCP (serveur)

Les recettes MCP viennent du serveur via `list_recipes` / `get_recipe`. Elles decrivent ce que les outils retournent et comment les combiner. Elles sont portees par `McpLayer.recipes` et injectees dans la section `## mcp` du prompt.

## Workflow complet (v0.7.0)

```
1. L'app construit des ToolLayer[]
   - McpLayer pour chaque serveur MCP connecte
   - UILayer avec adapter optionnel + recettes WebMCP

2. buildSystemPrompt(layers, { toolMode })
   -> prompt francais structure: ## mcp / ## webmcp

3. buildToolsFromLayers(layers, toolMode)
   -> AnthropicTool[] (smart: MCP + component(), explicit: MCP + 31 render_* + component())

4. runAgentLoop(msg, { layers, toolMode, ... })
   -> boucle LLM iterative

5. En mode smart:
   LLM appelle component("help") -> decouverte
   LLM appelle component("stat-card", {params}) -> rendu
   LLM appelle query_sql({sql}) -> donnees MCP
   LLM appelle component("table", {rows}) -> affichage

6. Les recettes WebMCP guident le LLM sur le choix des composants
7. Les recettes MCP decrivent les donnees retournees par les outils
```

## Exports complets

```ts
// Providers
export { RemoteLLMProvider, WasmProvider, LocalLLMProvider, createProvider };
export { AnthropicProvider, GemmaProvider };  // backward compat

// Agent loop
export { runAgentLoop, buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools, trimConversationHistory };

// UI tools
export { UI_TOOLS, isUITool, executeUITool };
export { COMPONENT_TOOL, executeComponent, componentRegistry };

// Recettes
export { WEBMCP_RECIPES, parseRecipe, parseRecipes };
export { recipeRegistry, registerRecipes, filterRecipesByServer, formatRecipesForPrompt, formatMcpRecipesForPrompt };

// Tool layers
export { buildToolsFromLayers };
export type { ToolLayer, McpLayer, UILayer };

// Component adapter
export { ComponentAdapter, nativePreset, allNativePreset, minimalPreset };
export type { ComponentDef };

// Utilitaires
export { TokenTracker, summarizeChat };

// Types
export type {
  RemoteModelId, WasmModelId, LLMId, ModelId,
  ChatMessage, ContentBlock, McpToolDef, AnthropicTool,
  LLMProvider, LLMResponse, ToolCall, AgentMetrics, AgentResult, AgentCallbacks,
  Recipe, McpRecipe, AgentLoopOptions, ComponentEntry,
};
```
