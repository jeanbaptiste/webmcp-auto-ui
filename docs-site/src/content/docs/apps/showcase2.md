---
title: Showcase
description: Demo dynamique avec agent IA, connexion MCP et 3 themes
sidebar:
  order: 3
---

Showcase (`apps/showcase2/`) est une vitrine interactive des composants UI pilotee par un agent IA. Elle demontre les capacites de l'architecture v0.8 avec theming dynamique.

## Fonctionnalites

- **Agent IA** : l'agent genere automatiquement des demos de composants
- **Connexion MCP** : connexion a un serveur MCP pour alimenter les composants avec des donnees reelles
- **3 themes** : Corporate (bleu/blanc), Nature (vert/beige), Neon (violet/noir)
- **Catalogue interactif** : parcourir tous les composants avec des exemples live
- **Mode smart** : utilise `component()` pour la decouverte et le rendu

## Architecture

```
showcase2/
  src/
    routes/
      +page.svelte        -- Page principale
      api/chat/+server.ts -- Proxy Anthropic
    lib/
      themes.ts           -- Definitions des 3 themes
```

Packages utilises :
- `@webmcp-auto-ui/agent` : boucle agent, providers
- `@webmcp-auto-ui/core` : `McpClient`
- `@webmcp-auto-ui/ui` : tous les composants, `ThemeProvider`

## Utilisation

```bash
npm -w apps/showcase2 run dev
```

1. Choisir un theme parmi les 3 disponibles
2. Optionnel : connecter un serveur MCP
3. Demander a l'agent de generer des demos de composants
4. Les composants s'affichent avec le theme selectionne

## Demo live

[demos.hyperskills.net/showcase2](https://demos.hyperskills.net/showcase2/)
