---
title: Composants custom
description: Enregistrer des composants UI personnalisés, des renderers Svelte et des coercions de parametres.
---

## Enregistrer un composant

Le `componentRegistry` permet de declarer un nouveau composant que le LLM pourra decouvrir et utiliser via les outils `list_components`, `get_component` et `component`.

```ts
import { componentRegistry } from '@webmcp-auto-ui/agent';

componentRegistry.set('kanban', {
  name: 'kanban',
  toolName: 'render_kanban',
  description: 'Tableau Kanban avec colonnes et cartes draggables',
  inputSchema: {
    type: 'object',
    properties: {
      columns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            cards: {
              type: 'array',
              items: {
                type: 'object',
                properties: { title: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    required: ['columns'],
  },
  renderable: true,
});
```

Apres enregistrement :

- `list_components()` liste "kanban" avec sa description
- `get_component("kanban")` retourne le schema JSON complet
- Le LLM appelle `component("kanban", {columns: [...]})`

## Enregistrer un renderer custom

Le `ComponentAdapter` associe un type de bloc a un composant Svelte pour le rendu.

```ts
import { ComponentAdapter } from '@webmcp-auto-ui/agent';
import KanbanBoard from './KanbanBoard.svelte';

const adapter = new ComponentAdapter();
adapter.register({
  type: 'kanban',
  tool: { name: 'render_kanban', description: '...', input_schema: { type: 'object', properties: {} } },
  renderer: KanbanBoard,
  group: 'custom',
});
```

Passer l'adapter au `BlockRenderer` :

```svelte
<BlockRenderer type={block.type} data={block.data} {adapter} />
```

Sans adapter, le `BlockRenderer` utilise sa map native (`NATIVE_MAP`) qui couvre tous les types de blocs integres.

## Ajouter une coercion custom

Les LLMs envoient parfois des parametres dans des formats inattendus. `registerCoercion` permet de normaliser les donnees avant le rendu.

```ts
import { registerCoercion } from '@webmcp-auto-ui/agent';

registerCoercion('kanban', (params) => {
  // Convertir les formats courants que le LLM pourrait envoyer
  if (params.boards) return { columns: params.boards };
  if (params.lists) return { columns: params.lists };
  return params;
});
```

La coercion custom est appelee **avant** les coercions integrees. Si elle retourne un resultat, les coercions integrees sont ignorees.

## Pipeline complet

```
1. componentRegistry.set('kanban', {...})         -> discovery (LLM voit le composant)
2. adapter.register({type: 'kanban', renderer})   -> rendu (Svelte sait l'afficher)
3. registerCoercion('kanban', fn)                 -> robustesse (params normalises)
4. Le LLM appelle component("kanban", {columns: [...]})
5. executeComponent -> coerceParams -> executeUITool -> onBlock
6. BlockRenderer -> adapter.getRenderer("kanban") -> KanbanBoard.svelte
```
