---
title: Boilerplate
description: Template SvelteKit avec 3 widgets Tricoteuses (FicheDepute, ResultatScrutin, Amendement) — point de depart pour integrer webmcp-auto-ui
sidebar:
  order: 0
---

Boilerplate (`apps/boilerplate/`) est le template de demarrage pour integrer webmcp-auto-ui dans un projet SvelteKit. Il inclut 3 widgets custom enregistres via `createWebMcpServer` et une interface complete avec agent IA, connexion MCP et rendu de widgets.

## Fonctionnalites

- **3 widgets Tricoteuses** : FicheDepute, ResultatScrutin, Amendement — enregistres comme serveur WebMCP local
- **Agent IA** : boucle agent via `runAgentLoop` avec `RemoteLLMProvider` (proxy Anthropic)
- **Multi-MCP** : connexion a un ou plusieurs serveurs MCP distants via `McpMultiClient`
- **ToolLayers** : layers MCP distants + serveur WebMCP local + autoui natif
- **Composants UI** : `LLMSelector`, `McpStatus`, `AgentProgress`, `WidgetRenderer` du package UI
- **Theme** : dark/light toggle via `getTheme()`
- **Suggestions** : boutons de requetes pre-remplies (fiche depute, scrutin, amendement)

## Architecture

```
boilerplate/
  src/
    routes/
      +page.svelte           -- Page principale avec chat, canvas widgets, agent
      api/chat/+server.ts    -- Proxy Anthropic server-side
    lib/
      widgets/
        register.ts           -- Enregistrement des 3 widgets via createWebMcpServer
        FicheDepute.svelte    -- Widget fiche depute
        ResultatScrutin.svelte -- Widget resultat de scrutin
        Amendement.svelte     -- Widget amendement parlementaire
```

L'app utilise les packages :
- `@webmcp-auto-ui/core` : `createWebMcpServer`, `McpMultiClient`
- `@webmcp-auto-ui/agent` : `runAgentLoop`, `RemoteLLMProvider`, `buildSystemPrompt`, `fromMcpTools`, `autoui`
- `@webmcp-auto-ui/sdk` : canvas store pour l'etat reactif
- `@webmcp-auto-ui/ui` : `LLMSelector`, `McpStatus`, `AgentProgress`, `WidgetRenderer`, `getTheme`

## Utilisation

Cloner le template :

```bash
npx degit hyperskills/webmcp-auto-ui/apps/boilerplate my-app
cd my-app
npm install
npm run dev
```

Ou depuis le monorepo :

```bash
npm -w apps/boilerplate run dev
```

1. L'app se connecte automatiquement au serveur MCP par defaut au chargement
2. Taper une question en langage naturel (ex: "Montre la fiche de Jean-Luc Melenchon")
3. L'agent genere les widgets correspondants dans la grille
4. Utiliser les boutons de suggestions pour tester les 3 types de widgets
