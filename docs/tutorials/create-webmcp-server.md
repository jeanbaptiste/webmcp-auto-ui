# Creer un serveur WebMCP custom

Ce tutorial explique comment exposer vos propres widgets via le protocole WebMCP,
de la creation du composant Svelte jusqu'a l'integration dans la boucle agent.

## Vue d'ensemble

```
                          Pipeline
  .svelte               .md (recette)         createWebMcpServer()
+-----------+         +---------------+       +------------------+
| KanbanBoard| -----> | kanban.md     | ----> | monserveur       |
| interface  |        | frontmatter + |       | .registerWidget()|
| Props {...}|        | body          |       | .addTool()       |
+-----------+         +---------------+       +------------------+
                                                      |
                                                 .layer()
                                                      |
                                                      v
                                              +----------------+
                                              | runAgentLoop() |
                                              | layers: [      |
                                              |   autoui,      |
                                              |   monserveur   |
                                              | ]              |
                                              +----------------+
                                                      |
                                                      v
                                                     LLM
```

## Etape 1 -- Creer le composant Svelte

Creez le composant qui sera rendu sur le canvas. L'interface `Props` definit
le schema des donnees que le LLM devra fournir.

```svelte
<!-- src/lib/widgets/KanbanBoard.svelte -->
<script lang="ts">
  interface Props {
    title?: string;
    columns: {
      name: string;
      cards: {
        title: string;
        description?: string;
        tag?: string;
      }[];
    }[];
  }

  let { title, columns }: Props = $props();
</script>

{#if title}
  <h3>{title}</h3>
{/if}

<div class="kanban">
  {#each columns as col}
    <div class="column">
      <h4>{col.name}</h4>
      {#each col.cards as card}
        <div class="card">
          <strong>{card.title}</strong>
          {#if card.description}<p>{card.description}</p>{/if}
          {#if card.tag}<span class="tag">{card.tag}</span>{/if}
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .kanban { display: flex; gap: 1rem; }
  .column { flex: 1; background: #1a1a2e; border-radius: 8px; padding: 0.75rem; }
  .card { background: #16213e; border-radius: 6px; padding: 0.5rem; margin-bottom: 0.5rem; }
  .tag { font-size: 0.75rem; color: #888; }
</style>
```

## Etape 2 -- Ecrire la recette

La recette est un fichier Markdown avec un frontmatter YAML qui decrit le widget.
C'est ce que le LLM lira pour savoir comment l'utiliser.

```markdown
---
widget: kanban
description: Tableau Kanban avec colonnes et cartes. Gestion de projet, workflow, pipeline.
schema:
  type: object
  required:
    - columns
  properties:
    title:
      type: string
    columns:
      type: array
      items:
        type: object
        required:
          - name
          - cards
        properties:
          name:
            type: string
          cards:
            type: array
            items:
              type: object
              required:
                - title
              properties:
                title:
                  type: string
                description:
                  type: string
                tag:
                  type: string
---

## Quand utiliser

Pour afficher un workflow en colonnes : pipeline de recrutement, sprint board,
pipeline de vente, ou toute progression par etapes.

## Comment

Appeler widget_display('kanban', {columns: [{name: "A faire", cards: [{title: "Tache 1"}]}, {name: "En cours", cards: []}]}).

## Erreurs courantes

- Colonnes vides oubliees : toujours inclure les colonnes meme si elles n'ont pas de cartes (cards: [])
- Trop de colonnes : au-dela de 5 colonnes, la lisibilite baisse
```

Le frontmatter contient trois champs obligatoires :

| Champ         | Role                                                    |
|---------------|---------------------------------------------------------|
| `widget`      | Identifiant unique du widget (utilise dans widget_display) |
| `description` | Description courte pour le LLM (search_recipes)           |
| `schema`      | JSON Schema des parametres attendus par le composant       |

Le body (apres `---`) contient les instructions libres pour le LLM : quand utiliser
le widget, comment construire les parametres, et les erreurs a eviter.

## Etape 3 -- Creer le serveur

Utilisez `createWebMcpServer` du package `@webmcp-auto-ui/core` :

```typescript
// src/lib/mon-serveur.ts
import { createWebMcpServer } from '@webmcp-auto-ui/core';
import KanbanBoard from './widgets/KanbanBoard.svelte';

// La recette peut etre importee en raw string (Vite)
import kanbanRecipe from './recipes/kanban.md?raw';

const monserveur = createWebMcpServer('monserveur', {
  description: 'Widgets de gestion de projet (kanban, gantt, ...)',
});
```

## Etape 4 -- Enregistrer le widget

```typescript
monserveur.registerWidget(kanbanRecipe, KanbanBoard);
```

`registerWidget` fait trois choses :
1. Parse le frontmatter pour extraire `widget`, `description` et `schema`
2. Stocke le composant Svelte comme renderer
3. Cree automatiquement les 3 outils built-in (au premier appel) :
   - `search_recipes` -- lister les widgets disponibles
   - `get_recipe` -- obtenir le schema + instructions d'un widget
   - `widget_display` -- afficher un widget sur le canvas

## Etape 5 -- Ajouter des outils custom (optionnel)

Vous pouvez ajouter des outils supplementaires au serveur. Ces outils
apparaitront dans le meme namespace que les widgets :

```typescript
monserveur.addTool({
  name: 'move_card',
  description: 'Deplacer une carte entre colonnes du kanban.',
  inputSchema: {
    type: 'object',
    properties: {
      cardTitle: { type: 'string', description: 'Titre de la carte' },
      targetColumn: { type: 'string', description: 'Nom de la colonne cible' },
    },
    required: ['cardTitle', 'targetColumn'],
  },
  execute: async (params) => {
    const { cardTitle, targetColumn } = params as { cardTitle: string; targetColumn: string };
    // Logique metier ici
    return { ok: true, message: `Carte "${cardTitle}" deplacee vers "${targetColumn}"` };
  },
});
```

## Etape 6 -- Connecter a la boucle agent

Appelez `.layer()` pour obtenir la couche de tools, puis passez-la a `runAgentLoop` :

```typescript
import { runAgentLoop } from '@webmcp-auto-ui/agent';
import { autoui } from '@webmcp-auto-ui/agent'; // serveur built-in

const layers = [
  autoui.layer(),        // widgets natifs (stat, chart, table, ...)
  monserveur.layer(),    // vos widgets custom
];

const result = await runAgentLoop({
  provider,
  messages,
  layers,
  // ...
});
```

Le prefixage des outils est automatique. Chaque outil est expose au LLM sous
la forme `{serverName}_{protocol}_{toolName}` :

| Outil brut          | Nom expose au LLM                        |
|---------------------|-------------------------------------------|
| `search_recipes`    | `monserveur_webmcp_search_recipes`        |
| `get_recipe`        | `monserveur_webmcp_get_recipe`            |
| `widget_display`    | `monserveur_webmcp_widget_display`        |
| `move_card`         | `monserveur_webmcp_move_card`             |

Ce prefixage evite les collisions quand plusieurs serveurs (MCP + WebMCP) coexistent.

## Etape 7 -- Tester

### Verifier la decouverte

Dans le chat, demandez quelque chose qui declenche la recherche de recettes :

```
User: "Montre-moi un kanban de mon sprint"
```

Le LLM va suivre cette sequence :

```
Flow du tool calling
--------------------

LLM                                          Serveur
 |                                              |
 |-- monserveur_webmcp_search_recipes() ------->|
 |<-- [{name:"kanban", description:"..."}] -----|
 |                                              |
 |-- monserveur_webmcp_get_recipe("kanban") --->|
 |<-- {schema: {...}, recipe: "## Quand..."} ---|
 |                                              |
 |   (le LLM construit les parametres           |
 |    en suivant le schema + la recette)        |
 |                                              |
 |-- monserveur_webmcp_widget_display --------->|
 |   ("kanban", {columns: [...]})               |
 |<-- {widget:"kanban", data:{...}, id:"w_x"} -|
 |                                              |
 v                                              v
        Le renderer affiche KanbanBoard.svelte
        sur le canvas avec les donnees retournees
```

### Verifier le rendu

Le resultat de `widget_display` contient un `id` (ex: `w_a3f2k1`). L'UI
utilise ce retour pour :
1. Trouver le renderer (`KanbanBoard.svelte`) via `getWidget('kanban')`
2. Passer `data` comme props au composant
3. Afficher le widget sur le canvas

### Exemple de conversation complete

```
User: "Organise ces taches en kanban : implémenter auth, écrire tests,
       déployer en prod, review PR #42"

LLM:  [tool_use] monserveur_webmcp_search_recipes({query: "kanban"})
      -> [{name: "kanban", description: "Tableau Kanban..."}]

LLM:  [tool_use] monserveur_webmcp_get_recipe({name: "kanban"})
      -> {schema: {...}, recipe: "## Quand utiliser\n..."}

LLM:  [tool_use] monserveur_webmcp_widget_display({
        name: "kanban",
        params: {
          title: "Sprint en cours",
          columns: [
            {name: "A faire", cards: [
              {title: "Ecrire tests", tag: "test"},
              {title: "Deployer en prod", tag: "ops"}
            ]},
            {name: "En cours", cards: [
              {title: "Implementer auth", tag: "feature"}
            ]},
            {name: "Review", cards: [
              {title: "Review PR #42", tag: "review"}
            ]}
          ]
        }
      })
      -> {widget: "kanban", data: {...}, id: "w_k8m2p1"}

LLM:  "Voici votre kanban. J'ai reparti les taches en 3 colonnes selon
       leur nature. Voulez-vous deplacer une carte ?"
```

## Resume

```
Checklist
---------
[1] Composant .svelte avec interface Props
[2] Recette .md avec frontmatter (widget, description, schema) + body
[3] createWebMcpServer('nom', {description})
[4] server.registerWidget(recette, composant)
[5] server.addTool({...}) si besoin
[6] layers: [..., server.layer()]
[7] Tester : search_recipes -> get_recipe -> widget_display
```

Le serveur WebMCP est symetrique au protocole MCP : la ou MCP fournit des
donnees depuis des sources distantes, WebMCP fournit des capacites d'affichage
locales. Les deux coexistent dans la meme boucle agent via le systeme de layers.
