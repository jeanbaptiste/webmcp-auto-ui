---
title: Recettes
description: Recettes WebMCP (UI) et recettes MCP (serveur) pour guider le LLM
sidebar:
  order: 3
---

Le systeme a deux types de recettes qui guident le LLM dans la composition d'interfaces.

## Vue d'ensemble

| Concept | Source | Role |
|---------|--------|------|
| **Recette WebMCP** | Package agent (fichiers `.md`) | Guide le LLM sur comment presenter les donnees avec les composants UI |
| **Recette MCP** | Serveur MCP (`list_recipes`/`get_recipe`) | Decrit ce que les outils retournent et comment les combiner |

## Recettes WebMCP (UI)

Les recettes WebMCP guident le LLM sur le choix des composants. Ce sont des fichiers `.md` avec frontmatter YAML, parses au build et injectes dans le prompt via `UILayer.recipes`.

### Format

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
  arrangement: stat-cards en ligne, chart + table en dessous
---

## Quand utiliser
Les resultats MCP contiennent des metriques numeriques...

## Comment
1. Identifier les 3-5 KPIs principaux
2. Afficher chaque KPI en stat-card
3. Ajouter un chart si series temporelles
```

### Type Recipe

```ts
interface Recipe {
  id: string;
  name: string;
  description?: string;
  components_used?: string[];
  layout?: { type: string; columns?: number; arrangement?: string };
  when: string;            // condition de declenchement (texte libre)
  servers?: string[];      // serveurs MCP cibles (vide = universel)
  body: string;            // contenu markdown
}
```

### API

```ts
import {
  WEBMCP_RECIPES,           // 8+ recettes built-in, auto-enregistrees
  parseRecipe,               // parser un .md brut -> Recipe
  parseRecipes,              // parser un lot de .md -> Recipe[]
  recipeRegistry,            // registre singleton read-only
  registerRecipes,           // ajouter au registre
  filterRecipesByServer,     // filtrer par nom de serveur connecte
  formatRecipesForPrompt,    // formater pour injection prompt
} from '@webmcp-auto-ui/agent';
```

### Recettes built-in

| ID | Quand | Composants |
|----|-------|-----------|
| `composer-tableau-de-bord-kpi` | Metriques numeriques | stat-card, chart, table, kv |
| `afficher-oeuvres-art-collection-musee` | Collection d'images/oeuvres | gallery, cards, carousel |
| `analyser-actualites-hacker-news` | Articles/actualites | cards, table, stat-card |
| `cartographier-observations-biodiversite` | Donnees geographiques | map, stat-card, table |
| `explorer-dossiers-legislatifs` | Parcours legislatif | timeline, kv, table |
| `gallery-images` | Images multiples | gallery, carousel |
| `parlementaire-profile` | Profil depute/senateur | profile, hemicycle, timeline |
| `rechercher-textes-juridiques` | Textes de loi | list, kv, code |
| `weather-viz` | Donnees meteo | stat-card, chart |
| `cross-server` | Donnees multi-serveurs | table, chart, kv |

### Filtrage par serveur

```ts
const recipes = filterRecipesByServer(WEBMCP_RECIPES, ['tricoteuses']);
// Retourne les recettes dont servers contient "tricoteuses" + les universelles (servers: [])
```

### Injection dans le prompt

Les recettes sont injectees dans la section `## webmcp` du prompt :

```
### recettes UI (3)
- Composer un tableau de bord KPI: metriques numeriques [stat-card, chart, table, kv]
- Parlementaire profile: profil depute [profile, hemicycle, timeline]
```

Format compact : <500 tokens pour 5 recettes.

## Recettes MCP (serveur)

Les recettes MCP viennent du serveur via les outils `list_recipes` et `get_recipe`. Elles decrivent ce que les outils retournent.

### Type McpRecipe

```ts
interface McpRecipe {
  name: string;
  description?: string;
}
```

### Utilisation

```ts
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);

const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: mcpRecipes,
};
```

Elles apparaissent dans le prompt sous :

```
## mcp (Tricoteuses)
### recettes serveur (2)
- profil-depute: Fiche complete avec votes et mandats
- scrutin-detail: Analyse detaillee d'un scrutin public
```

## WebMCP vs MCP : comparaison

| | Recette WebMCP (UI) | Recette MCP (serveur) |
|--|---------------------|----------------------|
| Source | Package agent (fichiers .md) | Serveur MCP (`list_recipes`) |
| Contenu | Comment presenter avec component() | Ce que les outils retournent |
| Section prompt | `## webmcp > recettes UI` | `## mcp > recettes serveur` |
| Type | `Recipe` | `McpRecipe` |
| Porte par | `UILayer.recipes` | `McpLayer.recipes` |
