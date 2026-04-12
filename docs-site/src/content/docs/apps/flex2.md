---
title: Flex
description: Canvas IA avec ToolLayers, component() unique, LogDrawer, RecipeModal et mode composeur/consommateur
sidebar:
  order: 1
---

Flex (`apps/flex2/`) est l'app principale de demonstration de l'architecture v0.8. Elle combine un canvas interactif, un agent LLM, et la connexion multi-MCP dans une interface unifiee.

## Fonctionnalites

- **ToolLayers** : construction automatique des `McpLayer` et `WebMcpLayer` a la connexion MCP
- **3 outils UI** : mode smart par defaut, `list_components()`, `get_component()`, `component()` pour le LLM
- **Debug panel** : visualisation en temps reel du prompt genere, des tool calls, et des metriques
- **Badges provenance** : chaque bloc affiche son origine (quel outil, quel serveur)
- **Mode composeur/consommateur** : basculer entre l'edition et la lecture seule
- **RecipeModal** : panneau modal listant les recettes WebMCP et MCP disponibles
- **LogDrawer** : tiroir lateral utilisant `AgentConsole` du package UI pour afficher les logs agent en temps reel
- **Export HyperSkill** : export gzip via SDK encode
- **SettingsPanel** : affiche le prompt effectif (effectivePrompt) en readonly
- **Multi-MCP** : connexion simultanee a plusieurs serveurs

## Architecture

```
flex2/
  src/
    routes/
      +page.svelte        -- Page principale avec canvas, chat, et panels
      api/chat/+server.ts -- Proxy Anthropic server-side
    lib/
      agent.ts            -- Construction des layers et lancement de la boucle
      panels/             -- Debug panel, recettes panel, logs panel
```

L'app utilise directement les packages :
- `@webmcp-auto-ui/agent` : `runAgentLoop`, `buildToolsFromLayers`, `buildSystemPrompt`, recettes
- `@webmcp-auto-ui/core` : `McpClient` pour la connexion MCP
- `@webmcp-auto-ui/sdk` : canvas store pour l'etat reactif
- `@webmcp-auto-ui/ui` : `BlockRenderer`, `ThemeProvider`, composants agent UI

## Utilisation

```bash
npm -w apps/flex2 run dev
```

1. Selectionner un provider LLM (Claude, Gemma, Ollama)
2. Connecter un ou plusieurs serveurs MCP
3. Poser une question en langage naturel dans le chat
4. L'agent genere automatiquement un dashboard avec les composants adaptes
5. Exporter en HyperSkill URL pour partager

## Demo live

[demos.hyperskills.net/flex2](https://demos.hyperskills.net/flex2/)
