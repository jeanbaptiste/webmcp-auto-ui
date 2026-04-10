---
title: todo2
description: Todo app WebMCP avec la nouvelle architecture layers, template minimal
sidebar:
  order: 5
---

todo2 est une app todo minimale qui sert de template pour demarrer un projet avec l'architecture v0.7.0. Elle demontre l'integration MCP CRUD dans un contexte simple.

## Fonctionnalites

- **Architecture layers** : utilise les `ToolLayer[]` pour structurer les outils
- **MCP CRUD** : creer, lire, mettre a jour, supprimer des todos via un serveur MCP
- **Agent LLM** : interaction en langage naturel pour gerer les todos
- **Template minimal** : code volontairement simple pour servir de point de depart

## Architecture

```
todo2/
  src/
    routes/
      +page.svelte        -- Page principale
      api/chat/+server.ts -- Proxy Anthropic
    lib/
      agent.ts            -- Construction des layers
```

Packages utilises :
- `@webmcp-auto-ui/agent` : `runAgentLoop`, providers
- `@webmcp-auto-ui/core` : `McpClient`
- `@webmcp-auto-ui/sdk` : canvas store
- `@webmcp-auto-ui/ui` : `BlockRenderer`, composants de base

## Utilisation

```bash
npm -w apps/todo2 run dev
```

1. Connecter un serveur MCP qui expose des outils CRUD (create, read, update, delete)
2. Demander a l'agent "Ajoute une tache : deployer la v0.7"
3. L'agent appelle le serveur MCP pour creer la tache et affiche le resultat

## Comme template

todo2 est concu pour etre copie et adapte :

```bash
cp -r apps/todo2 apps/mon-app
```

Modifier :
1. `package.json` : changer le nom du workspace
2. `+page.svelte` : adapter l'UI
3. `agent.ts` : configurer les layers pour votre cas d'usage

## Demo live

[demos.hyperskills.net/todo2](https://demos.hyperskills.net/todo2/)
