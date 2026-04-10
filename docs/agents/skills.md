# Recettes et Skills -- Guide Agent

> Ce document est concu pour etre injecte dans le contexte d'un agent IA. Il couvre les recettes WebMCP (UI), les recettes MCP (serveur), et les skills (format HyperSkill).

## Vue d'ensemble

Le systeme a deux types de recettes + un format de persistence :

| Concept | Source | Role |
|---------|--------|------|
| **Recette WebMCP** | Package agent (fichiers `.md`) | Guide le LLM sur comment presenter les donnees avec les composants UI |
| **Recette MCP** | Serveur MCP (`list_recipes`/`get_recipe`) | Decrit ce que les outils retournent et comment les combiner |
| **Skill** | SDK (localStorage/HyperSkill URL) | Persistence : blocs + metadata + theme, encodable en URL |

## Recettes WebMCP (UI)

Les recettes WebMCP guident le LLM sur le choix des composants. Elles sont des fichiers `.md` avec un frontmatter YAML, parsees au build et injectees dans le prompt via `UILayer.recipes`.

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
  formatRecipesForPrompt,    // formater pour injection prompt (<500 tokens/5 recettes)
} from '@webmcp-auto-ui/agent';
```

### Recettes built-in

| ID | Quand | Composants |
|----|-------|-----------|
| `composer-tableau-de-bord-kpi` | Metriques numeriques, compteurs, totaux | stat-card, chart, table, kv |
| `afficher-oeuvres-art-collection-musee` | Collection d'images/oeuvres | gallery, cards, carousel |
| `analyser-actualites-hacker-news` | Articles/actualites | cards, table, stat-card |
| `cartographier-observations-biodiversite` | Donnees geographiques/observations | map, stat-card, table |
| `explorer-dossiers-legislatifs` | Parcours legislatif | timeline, kv, table |
| `gallery-images` | Images multiples | gallery, carousel |
| `parlementaire-profile` | Profil depute/senateur | profile, hemicycle, timeline |
| `rechercher-textes-juridiques` | Textes de loi | list, kv, code |
| `weather-viz` | Donnees meteo | stat-card, chart |
| `cross-server` | Donnees de plusieurs serveurs MCP | table, chart, kv |

### Filtrage par serveur

Les recettes ont un champ `servers[]` optionnel. La fonction `filterRecipesByServer` fait un matching substring (insensible a la casse) :

```ts
const recipes = filterRecipesByServer(WEBMCP_RECIPES, ['tricoteuses']);
// Retourne les recettes dont servers contient "tricoteuses" + les universelles (servers: [])
```

### Injection dans le prompt

Les recettes sont injectees dans la section `## webmcp` du prompt via `formatRecipesForPrompt()` :

```
### recettes UI (3)
- Composer un tableau de bord KPI: les donnees contiennent des metriques numeriques [stat-card, chart, table, kv]
- Afficher oeuvres art: collection d'images [gallery, cards, carousel]
- Parlementaire profile: profil depute [profile, hemicycle, timeline]
```

## Recettes MCP (serveur)

Les recettes MCP viennent du serveur connecte via les outils `list_recipes` et `get_recipe`. Elles decrivent ce que les outils retournent et comment les combiner.

### Type McpRecipe

```ts
interface McpRecipe {
  name: string;
  description?: string;
}
```

### Utilisation dans les layers

```ts
const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: [
    { name: 'profil-depute', description: 'Fiche complete avec votes et mandats' },
    { name: 'scrutin-detail', description: 'Analyse detaillee d\'un scrutin public' },
  ],
};
```

Elles apparaissent dans le prompt sous :

```
## mcp (Tricoteuses)
### recettes serveur (2)
- profil-depute: Fiche complete avec votes et mandats
- scrutin-detail: Analyse detaillee d'un scrutin public
```

### Comment les obtenir

Beaucoup de serveurs MCP exposent les outils `list_recipes` et `get_recipe`. L'app peut les appeler au moment de la connexion :

```ts
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);
```

## Skills (format HyperSkill)

Les skills sont le format de persistence. Un skill combine des blocs, des metadata, et un theme optionnel.

### Format Skill

```ts
interface Skill {
  id: string;                        // auto-genere
  name: string;                      // requis
  description?: string;
  mcp?: string;                      // URL serveur MCP
  mcpName?: string;
  llm?: string;                      // modele prefere
  tags?: string[];
  theme?: Record<string, string>;    // overrides CSS tokens
  blocks: SkillBlock[];              // requis
  createdAt: number;
  updatedAt: number;
}
```

### CRUD

```ts
import { createSkill, getSkill, listSkills, updateSkill, deleteSkill } from '@webmcp-auto-ui/sdk';

const skill = createSkill({ name: 'sales-dashboard', blocks: [...] });
const all = listSkills();
const updated = updateSkill(skill.id, { name: 'v2' });
deleteSkill(skill.id);
```

### Encodage HyperSkill URL

```ts
import { encode, decode, getHsParam } from '@webmcp-auto-ui/sdk';

// Encoder
const url = await encode('https://app.com/viewer', JSON.stringify(hsSkill));
// "https://app.com/viewer?hs=eyJtZXRhIjp7..."

// Decoder
const { content: raw } = await decode(hsParam);
const skill = JSON.parse(raw);
```

Regles d'encodage :
- JSON -> base64
- Si > 6KB : gzip + prefix `gz.`
- Points d'entree : `/viewer?hs=` (lecture seule) ou `/flex?hs=` (editable)

### Provenance et summary

```ts
import { summarizeChat } from '@webmcp-auto-ui/agent';

const hsSkill: HyperSkill = {
  meta: {
    title: 'Dashboard',
    chatSummary: summarizeChat(messages),
    provenance: { model: 'claude-sonnet', mcp: 'https://mcp.example.com', timestamp: Date.now() },
  },
  content: blocks,
};
```

### Hashing et diff

```ts
import { hash, diff } from '@webmcp-auto-ui/sdk';

const h = await hash('https://app.com/viewer', JSON.stringify(skill.content));
const changed = diff(oldContent, newContent); // ["blocks", "meta"]
```

## Workflow : Creer une skill

> Avec `component()`, l'agent decouvre les composants via `component("help")` puis rend via `component("nom", {params})`.

1. **Definir l'objectif** : quelles donnees, quel besoin
2. **Choisir les blocs** : 2-5 types (voir composing.md)
3. **Ecrire les data** : remplir chaque bloc
4. **Ajouter les metadata** : name, description, tags, MCP, LLM
5. **Theme** (optionnel) : overrides couleurs
6. **Creer** : `createSkill()` 
7. **Encoder** (optionnel) : `encode()` pour URL partageable

## Contraintes

- `name` requis, non vide.
- `blocks` requis, au moins un bloc.
- `type` de bloc = un des 24 types valides.
- Taille HyperSkill URL : ~2-8KB selon navigateur, gzip au-dela de 6KB.
- `theme` : cles plates (`"color-accent"`, pas d'objet imbrique).

## Erreurs courantes

| Erreur | Consequence | Correction |
|--------|-------------|-----------|
| Data trop volumineuses (1000 lignes) | URL depasse limites navigateur | Limiter les donnees, paginer cote serveur |
| `blocks` manquant | Skill vide | Toujours inclure >= 1 bloc |
| Oublier `await` sur encode/decode | Promise au lieu de valeur | Les deux sont async |
| Confondre recette WebMCP et skill | Recette = guide pour le LLM, skill = donnees persistees | Les recettes guident, les skills stockent |
