---
title: Custom components
description: Register custom UI components, Svelte renderers, and parameter coercions.
---

## Register a component

The `componentRegistry` lets you declare a new component that the LLM can discover and use via the `list_components`, `get_component` and `component` tools.

```ts
import { componentRegistry } from '@webmcp-auto-ui/agent';

componentRegistry.set('kanban', {
  name: 'kanban',
  toolName: 'render_kanban',
  description: 'Kanban board with draggable columns and cards',
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

After registration:

- `list_components()` lists "kanban" with its description
- `get_component("kanban")` returns the full JSON schema
- The LLM calls `component("kanban", {columns: [...]})`

## Register a custom renderer

The `ComponentAdapter` maps a block type to a Svelte component for rendering.

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

Pass the adapter to `BlockRenderer`:

```svelte
<BlockRenderer type={block.type} data={block.data} {adapter} />
```

Without an adapter, `BlockRenderer` uses its native map (`NATIVE_MAP`) which covers all built-in block types.

## Add a custom coercion

LLMs sometimes send parameters in unexpected formats. `registerCoercion` normalizes the data before rendering.

```ts
import { registerCoercion } from '@webmcp-auto-ui/agent';

registerCoercion('kanban', (params) => {
  // Convert common formats the LLM might send
  if (params.boards) return { columns: params.boards };
  if (params.lists) return { columns: params.lists };
  return params;
});
```

The custom coercion is called **before** built-in coercions. If it returns a result, built-in coercions are skipped.

## Full pipeline

```
1. componentRegistry.set('kanban', {...})         -> discovery (LLM sees the component)
2. adapter.register({type: 'kanban', renderer})   -> rendering (Svelte knows how to display it)
3. registerCoercion('kanban', fn)                 -> robustness (params normalized)
4. LLM calls component("kanban", {columns: [...]})
5. executeComponent -> coerceParams -> executeUITool -> onBlock
6. BlockRenderer -> adapter.getRenderer("kanban") -> KanbanBoard.svelte
```
