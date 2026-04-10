---
title: "Tutorial: Build a custom widget from scratch"
description: Step-by-step guide to create a ProgressBar custom component, from registration to agent rendering.
---

This tutorial walks you through creating a custom `ProgressBar` component — a progress bar with label, percentage, and color — fully integrated into the WebMCP Auto-UI pipeline.

## What you will build

A component that the agent can discover and use automatically:

```
Agent: list_components() → sees "progress-bar"
Agent: get_component("progress-bar") → gets the JSON schema
Agent: component("progress-bar", {label: "Loading", value: 75}) → bar rendered
```

## Prerequisites

- A SvelteKit app with `@webmcp-auto-ui/agent` and `@webmcp-auto-ui/ui` installed
- Familiarity with [custom components](/en/guide/custom-components) concepts

---

## Step 1 — Create the Svelte component

Create `src/lib/blocks/ProgressBar.svelte` in your app:

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

## Step 2 — Register in the componentRegistry

The `componentRegistry` makes the component visible to the agent via `list_components()` and `get_component()`.

In your app's main file (e.g. `+page.svelte` or an initialization file):

```ts
import { componentRegistry } from '@webmcp-auto-ui/agent';

componentRegistry.set('progress-bar', {
  name: 'progress-bar',
  toolName: 'render_progress_bar',
  description: 'Progress bar with label, percentage, and configurable color.',
  inputSchema: {
    type: 'object',
    properties: {
      label: {
        type: 'string',
        description: 'Text displayed above the bar',
      },
      value: {
        type: 'number',
        description: 'Current value (e.g. 75)',
      },
      max: {
        type: 'number',
        description: 'Maximum value (default: 100)',
      },
      color: {
        type: 'string',
        description: 'CSS color for the bar (e.g. "#22c55e", "var(--color-teal)")',
      },
    },
    required: ['label', 'value'],
  },
  renderable: true,
});
```

After this step, the agent can discover the component:

```
list_components() → [..., { name: "progress-bar", description: "Progress bar..." }]
get_component("progress-bar") → { schema: { properties: { label, value, max, color } } }
```

## Step 3 — Register the renderer with ComponentAdapter

The `ComponentAdapter` maps the block type to the Svelte component for visual rendering.

```ts
import { ComponentAdapter } from '@webmcp-auto-ui/agent';
import ProgressBar from '$lib/blocks/ProgressBar.svelte';

const adapter = new ComponentAdapter();

adapter.register({
  type: 'progress-bar',
  tool: {
    name: 'render_progress_bar',
    description: 'Progress bar with label, percentage, and configurable color.',
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

## Step 4 — Add a coercion

LLMs sometimes send parameters in unexpected formats. Coercions normalize the data before rendering.

```ts
import { registerCoercion } from '@webmcp-auto-ui/agent';

registerCoercion('progress-bar', (params: Record<string, unknown>) => {
  // The LLM might send "percentage" instead of "value"
  if (params.percentage !== undefined && params.value === undefined) {
    return { ...params, value: params.percentage };
  }
  // The LLM might send "title" instead of "label"
  if (params.title !== undefined && params.label === undefined) {
    return { ...params, label: params.title };
  }
  // The LLM might send value as a string
  if (typeof params.value === 'string') {
    return { ...params, value: parseFloat(params.value as string) || 0 };
  }
  return params;
});
```

## Step 5 — Pass the adapter to BlockRenderer

In your Svelte template, pass the adapter to `BlockRenderer` so rendering uses your custom component:

```svelte
<script lang="ts">
  import { BlockRenderer } from '@webmcp-auto-ui/ui';

  // adapter created in step 3
  // blocks = array of blocks rendered by the agent

  interface Props {
    blocks: { id: string; type: string; data: Record<string, unknown> }[];
  }
  let { blocks }: Props = $props();
</script>

{#each blocks as block (block.id)}
  <BlockRenderer type={block.type} data={block.data} {adapter} />
{/each}
```

Without the adapter, `BlockRenderer` uses its native map (`NATIVE_MAP`) which covers built-in types. With the adapter, it checks your custom components first.

## Step 6 — Test it

Launch your app and send a message to the agent. Here is what happens internally:

```
1. Agent: list_components()
   → sees "progress-bar" in the list

2. Agent: get_component("progress-bar")
   → gets the schema: { label: string, value: number, max?: number, color?: string }

3. Agent: component("progress-bar", {
     label: "Loading data",
     value: 75,
     color: "#22c55e"
   })

4. Internal pipeline:
   executeComponent → registerCoercion (normalization) → executeUITool → onBlock callback

5. BlockRenderer receives the block:
   adapter.getRenderer("progress-bar") → ProgressBar.svelte → visual rendering
```

## Complete integration code

Here is a full example in a `+page.svelte`:

```svelte
<script lang="ts">
  import { componentRegistry, ComponentAdapter, registerCoercion } from '@webmcp-auto-ui/agent';
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
  import ProgressBar from '$lib/blocks/ProgressBar.svelte';

  // 1. Discovery — agent sees the component
  componentRegistry.set('progress-bar', {
    name: 'progress-bar',
    toolName: 'render_progress_bar',
    description: 'Progress bar with label, percentage, and configurable color.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Text displayed above the bar' },
        value: { type: 'number', description: 'Current value' },
        max: { type: 'number', description: 'Maximum value (default: 100)' },
        color: { type: 'string', description: 'CSS color for the bar' },
      },
      required: ['label', 'value'],
    },
    renderable: true,
  });

  // 2. Renderer — Svelte knows how to display it
  const adapter = new ComponentAdapter();
  adapter.register({
    type: 'progress-bar',
    tool: {
      name: 'render_progress_bar',
      description: 'Progress bar with label, percentage, and configurable color.',
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

  // 3. Coercion — robustness against LLM format variations
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

  // 4. Blocks rendered by the agent
  let blocks = $state<{ id: string; type: string; data: Record<string, unknown> }[]>([]);
</script>

{#each blocks as block (block.id)}
  <BlockRenderer type={block.type} data={block.data} {adapter} />
{/each}
```

## Full pipeline

```
1. componentRegistry.set('progress-bar', {...})       → discovery (LLM sees the component)
2. adapter.register({type: 'progress-bar', renderer}) → rendering (Svelte knows how to display it)
3. registerCoercion('progress-bar', fn)               → robustness (params normalized)
4. LLM calls component("progress-bar", {label: "...", value: 75})
5. executeComponent → coerceParams → executeUITool → onBlock
6. BlockRenderer → adapter.getRenderer("progress-bar") → ProgressBar.svelte
```
