---
title: "Tutoriel : Creer un widget custom de A a Z"
description: Guide pas-a-pas pour creer un composant ProgressBar custom, de l'enregistrement au rendu par l'agent.
---

Ce tutoriel vous guide dans la creation d'un composant `ProgressBar` custom — une barre de progression avec label, pourcentage et couleur — integre dans le pipeline WebMCP Auto-UI.

## Ce que vous allez construire

Un composant que l'agent peut decouvrir et utiliser automatiquement :

```
Agent: list_components() → voit "progress-bar"
Agent: get_component("progress-bar") → recoit le schema JSON
Agent: component("progress-bar", {label: "Chargement", value: 75}) → barre affichee
```

## Prerequis

- Une app SvelteKit avec `@webmcp-auto-ui/agent` et `@webmcp-auto-ui/ui` installes
- Familiarite avec les concepts de [composants custom](/webmcp-auto-ui/guide/custom-components)

---

## Etape 1 — Creer le composant Svelte

Creez `src/lib/blocks/ProgressBar.svelte` dans votre app :

```svelte
<script lang="ts">
  interface Props {
    data: {
      label: string;
      value: number;
      max?: number;
      color?: string;
    };
  }

  let { data }: Props = $props();

  const max = $derived(data.max ?? 100);
  const pct = $derived(Math.min(100, Math.max(0, (data.value / max) * 100)));
  const color = $derived(data.color ?? 'var(--color-accent, #a78bfa)');
</script>

<div class="progress-bar">
  <div class="progress-header">
    <span class="progress-label">{data.label}</span>
    <span class="progress-pct">{Math.round(pct)}%</span>
  </div>
  <div class="progress-track">
    <div
      class="progress-fill"
      style="width: {pct}%; background: {color}"
    ></div>
  </div>
</div>

<style>
  .progress-bar {
    font-family: monospace;
    padding: 12px 16px;
    background: var(--color-surface2, #1e1e2e);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
  }
  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }
  .progress-label {
    font-size: 12px;
    color: var(--color-text1, #eee);
    font-weight: 600;
  }
  .progress-pct {
    font-size: 11px;
    color: var(--color-text2, #888);
  }
  .progress-track {
    height: 8px;
    background: var(--color-bg, #0e0e16);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
</style>
```

## Etape 2 — Enregistrer dans le componentRegistry

Le `componentRegistry` rend le composant visible par l'agent via `list_components()` et `get_component()`.

Dans le fichier principal de votre app (ex: `+page.svelte` ou un fichier d'initialisation) :

```ts
import { componentRegistry } from '@webmcp-auto-ui/agent';

componentRegistry.set('progress-bar', {
  name: 'progress-bar',
  toolName: 'render_progress_bar',
  description: 'Barre de progression avec label, pourcentage et couleur configurable.',
  inputSchema: {
    type: 'object',
    properties: {
      label: {
        type: 'string',
        description: 'Texte affiche au-dessus de la barre',
      },
      value: {
        type: 'number',
        description: 'Valeur courante (ex: 75)',
      },
      max: {
        type: 'number',
        description: 'Valeur maximale (defaut: 100)',
      },
      color: {
        type: 'string',
        description: 'Couleur CSS de la barre (ex: "#22c55e", "var(--color-teal)")',
      },
    },
    required: ['label', 'value'],
  },
  renderable: true,
});
```

Apres cette etape, l'agent peut decouvrir le composant :

```
list_components() → [..., { name: "progress-bar", description: "Barre de progression..." }]
get_component("progress-bar") → { schema: { properties: { label, value, max, color } } }
```

## Etape 3 — Enregistrer le renderer avec ComponentAdapter

Le `ComponentAdapter` associe le type de bloc au composant Svelte pour le rendu visuel.

```ts
import { ComponentAdapter } from '@webmcp-auto-ui/agent';
import ProgressBar from '$lib/blocks/ProgressBar.svelte';

const adapter = new ComponentAdapter();

adapter.register({
  type: 'progress-bar',
  tool: {
    name: 'render_progress_bar',
    description: 'Barre de progression avec label, pourcentage et couleur configurable.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        value: { type: 'number' },
        max: { type: 'number' },
        color: { type: 'string' },
      },
      required: ['label', 'value'],
    },
  },
  renderer: ProgressBar,
  group: 'custom',
});
```

## Etape 4 — Ajouter une coercion

Les LLMs envoient parfois les parametres dans des formats inattendus. La coercion normalise les donnees avant le rendu.

```ts
import { registerCoercion } from '@webmcp-auto-ui/agent';

registerCoercion('progress-bar', (params: Record<string, unknown>) => {
  // Le LLM pourrait envoyer "percentage" au lieu de "value"
  if (params.percentage !== undefined && params.value === undefined) {
    return { ...params, value: params.percentage };
  }
  // Le LLM pourrait envoyer "title" au lieu de "label"
  if (params.title !== undefined && params.label === undefined) {
    return { ...params, label: params.title };
  }
  // Le LLM pourrait envoyer value comme string
  if (typeof params.value === 'string') {
    return { ...params, value: parseFloat(params.value as string) || 0 };
  }
  return params;
});
```

## Etape 5 — Passer l'adapter au BlockRenderer

Dans votre template Svelte, passez l'adapter au `BlockRenderer` pour que le rendu utilise votre composant custom :

```svelte
<script lang="ts">
  import { BlockRenderer } from '@webmcp-auto-ui/ui';

  // adapter cree a l'etape 3
  // blocks = tableau de blocs rendus par l'agent

  interface Props {
    blocks: { id: string; type: string; data: Record<string, unknown> }[];
  }
  let { blocks }: Props = $props();
</script>

{#each blocks as block (block.id)}
  <BlockRenderer type={block.type} data={block.data} {adapter} />
{/each}
```

Sans l'adapter, le `BlockRenderer` utilise sa map native (`NATIVE_MAP`) qui couvre les types integres. Avec l'adapter, il cherche d'abord dans vos composants custom.

## Etape 6 — Tester

Lancez votre app et envoyez un message a l'agent. Voici ce qui se passe en interne :

```
1. Agent: list_components()
   → voit "progress-bar" dans la liste

2. Agent: get_component("progress-bar")
   → recoit le schema: { label: string, value: number, max?: number, color?: string }

3. Agent: component("progress-bar", {
     label: "Chargement des donnees",
     value: 75,
     color: "#22c55e"
   })

4. Pipeline interne:
   executeComponent → registerCoercion (normalisation) → executeUITool → onBlock callback

5. BlockRenderer recoit le bloc:
   adapter.getRenderer("progress-bar") → ProgressBar.svelte → rendu visuel
```

## Code complet d'integration

Voici un exemple complet dans un `+page.svelte` :

```svelte
<script lang="ts">
  import { componentRegistry, ComponentAdapter, registerCoercion } from '@webmcp-auto-ui/agent';
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
  import ProgressBar from '$lib/blocks/ProgressBar.svelte';

  // 1. Discovery — l'agent voit le composant
  componentRegistry.set('progress-bar', {
    name: 'progress-bar',
    toolName: 'render_progress_bar',
    description: 'Barre de progression avec label, pourcentage et couleur configurable.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Texte affiche au-dessus de la barre' },
        value: { type: 'number', description: 'Valeur courante' },
        max: { type: 'number', description: 'Valeur maximale (defaut: 100)' },
        color: { type: 'string', description: 'Couleur CSS de la barre' },
      },
      required: ['label', 'value'],
    },
    renderable: true,
  });

  // 2. Renderer — Svelte sait l'afficher
  const adapter = new ComponentAdapter();
  adapter.register({
    type: 'progress-bar',
    tool: {
      name: 'render_progress_bar',
      description: 'Barre de progression avec label, pourcentage et couleur configurable.',
      input_schema: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'number' },
          max: { type: 'number' },
          color: { type: 'string' },
        },
        required: ['label', 'value'],
      },
    },
    renderer: ProgressBar,
    group: 'custom',
  });

  // 3. Coercion — robustesse face aux formats LLM
  registerCoercion('progress-bar', (params: Record<string, unknown>) => {
    if (params.percentage !== undefined && params.value === undefined) {
      return { ...params, value: params.percentage };
    }
    if (params.title !== undefined && params.label === undefined) {
      return { ...params, label: params.title };
    }
    if (typeof params.value === 'string') {
      return { ...params, value: parseFloat(params.value as string) || 0 };
    }
    return params;
  });

  // 4. Blocs rendus par l'agent
  let blocks = $state<{ id: string; type: string; data: Record<string, unknown> }[]>([]);
</script>

{#each blocks as block (block.id)}
  <BlockRenderer type={block.type} data={block.data} {adapter} />
{/each}
```

## Pipeline complet

```
1. componentRegistry.set('progress-bar', {...})       → discovery (LLM voit le composant)
2. adapter.register({type: 'progress-bar', renderer}) → rendu (Svelte sait l'afficher)
3. registerCoercion('progress-bar', fn)               → robustesse (params normalises)
4. Le LLM appelle component("progress-bar", {label: "...", value: 75})
5. executeComponent → coerceParams → executeUITool → onBlock
6. BlockRenderer → adapter.getRenderer("progress-bar") → ProgressBar.svelte
```
