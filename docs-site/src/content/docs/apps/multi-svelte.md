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

L'app utilise les packages :
- `@webmcp-auto-ui/agent` : `runAgentLoop`, `RemoteLLMProvider`, `WasmProvider`, `buildSystemPrompt`, `fromMcpTools`, `trimConversationHistory`, `TokenTracker`
- `@webmcp-auto-ui/core` : `McpMultiClient` pour la connexion multi-MCP
- `@webmcp-auto-ui/sdk` : canvas store pour l'etat reactif
- `@webmcp-auto-ui/ui` : `McpStatus`, `GemmaLoader`, `AgentProgress`, `EphemeralBubble`, `TokenBubble`, `LLMSelector`, `FloatingLayout`, `FlexLayout`, `WidgetRenderer`, `LinkIndicators`, `bus`, `layoutAdapter`

## Utilisation

```bash
npm -w apps/multi-svelte run dev
```

1. Configurer le modele LLM dans la sidebar (Claude haiku/sonnet/opus ou Gemma WASM)
2. Connecter un ou plusieurs serveurs MCP
3. Activer/desactiver les packs de widgets locaux
4. Poser une question en langage naturel
5. L'agent genere les widgets dans le canvas (mode float ou grid)
6. Consulter les logs agent et les metriques de tokens en temps reel

## Demo live

[demos.hyperskills.net/multi-svelte](https://demos.hyperskills.net/multi-svelte/)
