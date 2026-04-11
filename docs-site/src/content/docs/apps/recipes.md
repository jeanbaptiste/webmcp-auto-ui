---
title: Recipes
description: Explorateur de recettes MCP et WebMCP avec layout 3 colonnes, chat input et test live
sidebar:
  order: 4
---

Recipes (`apps/recipes/`) est un explorateur interactif pour les recettes WebMCP (UI) et MCP (serveur). Elle permet de parcourir, filtrer et tester les recettes en temps reel.

## Fonctionnalites

- **Layout 3 colonnes** : catalogue a gauche, detail au centre, preview a droite
- **Chat input** : interaction en langage naturel pour tester les recettes avec un agent
- **Catalogue complet** : liste toutes les recettes WebMCP built-in
- **Filtrage par serveur** : filtrer les recettes par nom de serveur MCP
- **Sync recettes MCP** : synchronisation automatique des recettes par serveur connecte
- **Test live** : connecter un serveur MCP et tester une recette avec des donnees reelles
- **Preview** : apercu du rendu des composants associes a chaque recette
- **Inspection** : visualiser le frontmatter YAML et le corps markdown de chaque recette

## Architecture

```
recipes/
  src/
    routes/
      +page.svelte        -- Explorateur de recettes
      api/chat/+server.ts -- Proxy Anthropic
    lib/
      explorer.ts         -- Logique de filtrage et d'affichage
```

Packages utilises :
- `@webmcp-auto-ui/agent` : `WEBMCP_RECIPES`, `filterRecipesByServer`, `parseRecipe`
- `@webmcp-auto-ui/core` : `McpClient` pour les tests live
- `@webmcp-auto-ui/ui` : `BlockRenderer`, composants

## Utilisation

```bash
npm -w apps/recipes run dev
```

1. Parcourir les recettes dans le catalogue
2. Cliquer sur une recette pour voir son detail (frontmatter, composants, conditions)
3. Connecter un serveur MCP compatible
4. Lancer un test live pour voir la recette appliquee avec des donnees reelles

## Recettes disponibles

| Recette | Composants | Quand |
|---------|-----------|-------|
| Tableau de bord KPI | stat-card, chart, table, kv | Metriques numeriques |
| Oeuvres d'art | gallery, cards, carousel | Collection d'images |
| Actualites | cards, table, stat-card | Articles |
| Biodiversite | map, stat-card, table | Donnees geographiques |
| Dossiers legislatifs | timeline, kv, table | Parcours legislatif |
| Profil parlementaire | profile, hemicycle, timeline | Fiche depute |
| Textes juridiques | list, kv, code | Textes de loi |

## Demo live

[demos.hyperskills.net/recipes](https://demos.hyperskills.net/recipes/)
