---
title: Multi-Svelte
description: Demo multi-widgets Svelte avec sidebar configurable, multi-MCP, Gemma WASM, layouts float/grid et token tracking
sidebar:
  order: 7
---

Multi-Svelte (`apps/multi-svelte/`) est la demo la plus complete de l'architecture webmcp-auto-ui. Elle combine une sidebar de configuration, un agent IA multi-provider (Claude + Gemma WASM), la connexion multi-MCP, et deux modes de layout pour les widgets.

## Fonctionnalites

- **Multi-provider** : `RemoteLLMProvider` (Claude via proxy) et `WasmProvider` (Gemma in-browser)
- **Multi-MCP** : connexion a plusieurs serveurs MCP simultanement avec token optionnel
- **Server packs** : selecteur de packs de widgets locaux (autoui, vanilla) activables/desactivables
- **Layouts** : mode float (fenetres deplacables/redimensionnables) et mode grid (grille responsive)
- **Token tracking** : `TokenTracker` avec affichage en temps reel via `TokenBubble`
- **Sidebar configurable** : modele LLM, serveur MCP, packs, max tokens, max tools, temperature, prompt cache, system prompt custom
- **Logs agent** : panneau depliable avec historique des iterations, appels d'outils et metriques
- **Liens inter-widgets** : `LinkIndicators` et `linkGroupColor` pour la visualisation des relations
- **HyperSkill** : chargement automatique depuis le parametre URL `?hs=`
- **Gemma WASM** : chargement in-browser avec barre de progression via `GemmaLoader`
- **Ephemeral bubbles** : affichage temporaire des reponses agent via `EphemeralBubble`

## Architecture

```
multi-svelte/
  src/
    routes/
      +page.svelte           -- Page principale avec sidebar, canvas, chat
      api/chat/+server.ts    -- Proxy Anthropic server-side
    lib/
      agent-setup.ts         -- Packs de serveurs, construction des layers
      ServerSelector.svelte  -- Composant de selection des packs
```

## Lancement

```bash
npm -w apps/multi-svelte run dev
```

| Environnement | Port |
|---------------|------|
| Dev (vite)    | 3010 |
| Production    | 3012 |

En production, l'app tourne via `node index.js` sur le port 3012 (service systemd `webmcp-multi-svelte`).

1. Configurer le modele LLM dans la sidebar (Claude haiku/sonnet/opus ou Gemma WASM)
2. Connecter un ou plusieurs serveurs MCP
3. Activer/desactiver les packs de widgets locaux
4. Poser une question en langage naturel
5. L'agent genere les widgets dans le canvas (mode float ou grid)
6. Consulter les logs agent et les metriques de tokens en temps reel

## Imports

L'app utilise les packages suivants :

### `@webmcp-auto-ui/agent`

- `runAgentLoop` -- boucle agent principale
- `RemoteLLMProvider` -- provider Claude via proxy (`proxyUrl`)
- `WasmProvider` -- provider Gemma in-browser (LiteRT)
- `buildSystemPrompt` -- generation du system prompt a partir des layers
- `fromMcpTools` -- conversion des outils MCP en format provider
- `trimConversationHistory` -- troncature de l'historique pour respecter la fenetre de contexte
- `TokenTracker` -- suivi des tokens consommes par requete

### `@webmcp-auto-ui/core`

- `McpMultiClient` -- client multi-MCP (connexion simultanee a plusieurs serveurs)

### `@webmcp-auto-ui/sdk`

- `canvas` (via `@webmcp-auto-ui/sdk/canvas`) -- store reactif pour l'etat du canvas (blocs, LLM, MCP)

### `@webmcp-auto-ui/ui`

- `McpStatus` -- indicateur de connexion MCP (connecting/connected/error)
- `GemmaLoader` -- barre de progression du chargement Gemma WASM (status, progress, elapsed, MB)
- `AgentProgress` -- barre de progression de la boucle agent (elapsed, toolCalls, lastTool)
- `LLMSelector` -- selecteur de modele LLM (haiku/sonnet/opus/gemma)
- `WidgetRenderer` -- rendu d'un widget par type et data, avec support des serveurs WebMCP locaux
- `EphemeralBubble` -- bulle temporaire affichant les reponses textuelles de l'agent pendant la generation ; accepte un tableau `{id, role, html}` et disparait apres un delai
- `TokenBubble` -- pastille affichant les metriques de tokens en temps reel (input, output, cache, cout) ; recoit les `TokenMetrics` du `TokenTracker`
- `FloatingLayout` -- layout flottant avec fenetres deplacables et redimensionnables ; expose `move(id, x, y)` et `resize(id, w, h)` via `bind:this`
- `FlexLayout` -- layout grille responsive avec largeur min/max configurable ; affiche les widgets dans un flow CSS flex-wrap
- `LinkIndicators` -- indicateurs visuels (pastilles colorees) des liens entre widgets, affiches dans la barre de titre de chaque fenetre ; recoit un `busId` correspondant a l'id du widget
- `linkGroupColor` -- fonction utilitaire retournant une couleur CSS deterministe pour un `groupId` de lien (utilisee pour le border-left des fenetres liees)
- `layoutAdapter` -- adaptateur pour les outils agent `move_block`, `resize_block`, `style_block` ; l'app enregistre les callbacks via `layoutAdapter.register({ move, resize, style })` et les desinscrit via `layoutAdapter.unregister()` au `onDestroy`
- `bus` -- bus de messages FONC pour la communication inter-widgets (utilise pour `data-update` via `bus.send`)

Types importes : `ManagedWindow` (etat d'une fenetre dans le layout)

## Demo live

[demos.hyperskills.net/multi-svelte](https://demos.hyperskills.net/multi-svelte/)
