---
title: Home
description: Landing page statique avec liens vers toutes les demos webmcp-auto-ui et liste des serveurs MCP disponibles
sidebar:
  order: 6
---

Home (`apps/home/`) est la landing page statique du projet. Elle liste toutes les demos disponibles avec leurs descriptions et fournit un apercu des serveurs MCP connectables.

## Fonctionnalites

- **Catalogue des demos** : liste de toutes les apps (Flex, Viewer, Showcase, Todo, Recipes, Multi-Svelte, Boilerplate) avec description et lien direct
- **Serveurs MCP** : grille des serveurs disponibles (Tricoteuses, Hacker News, Met Museum, Open-Meteo, Wikipedia, iNaturalist, data.gouv.fr, NASA)
- **Theme** : dark/light toggle via `getTheme()` du package UI
- **Build statique** : deploye en fichiers statiques via `@sveltejs/adapter-static`

## Architecture

```
home/
  src/
    routes/
      +page.svelte    -- Page unique avec catalogue demos et serveurs MCP
```

L'app utilise les packages :
- `@webmcp-auto-ui/ui` : `getTheme` pour le theme dark/light

## Utilisation

```bash
npm -w apps/home run dev
```

Pour le build de production :

```bash
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/home run build
```

La variable `PUBLIC_BASE_URL` est necessaire en production pour que les liens vers les demos pointent vers les bons chemins.

## Demo live

[demos.hyperskills.net](https://demos.hyperskills.net)
