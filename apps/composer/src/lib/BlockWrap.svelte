<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GripVertical, Pencil, X } from 'lucide-svelte';
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { createToolGroup, textResult, jsonResult } from '@webmcp-auto-ui/core';

  let {
    block,
    onEdit,
    onDragStart,
    onDrop,
  }: {
    block: { id: string; type: string; data: Record<string, unknown> };
    onEdit: (id: string) => void;
    onDragStart: (e: DragEvent, id: string) => void;
    onDrop: (e: DragEvent, id: string) => void;
  } = $props();

  // ── Auto-generate description from block data ────────────────────────────
  function describeBlock(type: string, data: Record<string, unknown>): string {
    const pairs = Object.entries(data)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .slice(0, 4)
      .map(([k, v]) => `${k}="${String(v).slice(0, 40)}"`)
      .join(' ');
    return `${type.toUpperCase()} block — ${pairs || 'no scalar fields'}`;
  }

  // ── Input schema from block type ──────────────────────────────────────────
  const SCHEMAS: Record<string, Record<string, unknown>> = {
    stat:       { label: { type: 'string' }, value: { type: 'string' }, trend: { type: 'string' }, trendDir: { type: 'string', enum: ['up','down','neutral'] } },
    kv:         { title: { type: 'string' }, rows: { type: 'array' } },
    list:       { title: { type: 'string' }, items: { type: 'array' } },
    chart:      { title: { type: 'string' }, bars: { type: 'array' } },
    alert:      { title: { type: 'string' }, message: { type: 'string' }, level: { type: 'string', enum: ['info','warn','error'] } },
    code:       { lang: { type: 'string' }, content: { type: 'string' } },
    text:       { content: { type: 'string' } },
    actions:    { buttons: { type: 'array' } },
    tags:       { label: { type: 'string' }, tags: { type: 'array' } },
    'stat-card':   { label: { type: 'string' }, value: { type: 'string' }, variant: { type: 'string' } },
    'data-table':  { title: { type: 'string' }, rows: { type: 'array' }, columns: { type: 'array' } },
    timeline:      { title: { type: 'string' }, events: { type: 'array' } },
    profile:       { name: { type: 'string' }, subtitle: { type: 'string' }, fields: { type: 'array' } },
    hemicycle:     { title: { type: 'string' }, groups: { type: 'array' }, totalSeats: { type: 'number' } },
    cards:         { title: { type: 'string' }, cards: { type: 'array' } },
    'json-viewer': { title: { type: 'string' }, data: {} },
    sankey:        { title: { type: 'string' }, nodes: { type: 'array' }, links: { type: 'array' } },
    log:           { title: { type: 'string' }, entries: { type: 'array' } },
  };

  // ── Register 3 WebMCP tools on mount, abort on destroy ───────────────────
  let group: ReturnType<typeof createToolGroup> | null = null;

  onMount(() => {
    group = createToolGroup(`block-${block.id}`);

    const mc = (navigator as unknown as Record<string, unknown>).modelContext as {
      registerTool: (t: unknown) => void;
      unregisterTool: (n: string) => void;
    } | undefined;

    if (!mc) return;

    const desc = describeBlock(block.type, block.data);
    const schema = SCHEMAS[block.type] ?? {};

    mc.registerTool({
      name: `block_${block.id}_get`,
      description: `${desc}. Read its current data.`,
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult({ type: block.type, data: block.data }),
      annotations: { readOnlyHint: true },
    });

    mc.registerTool({
      name: `block_${block.id}_update`,
      description: `Update this ${block.type} block. ${desc}`,
      inputSchema: { type: 'object', properties: schema },
      execute: (args: Record<string, unknown>) => {
        canvas.updateBlock(block.id, args);
        return textResult(`block_${block.id} updated`);
      },
    });

    mc.registerTool({
      name: `block_${block.id}_remove`,
      description: `Remove this ${block.type} block from the canvas.`,
      inputSchema: { type: 'object', properties: {} },
      execute: () => {
        canvas.removeBlock(block.id);
        return textResult(`block_${block.id} removed`);
      },
      annotations: { destructiveHint: true },
    });
  });

  onDestroy(() => {
    group?.abort();
    const mc = (navigator as unknown as Record<string, unknown>).modelContext as {
      unregisterTool: (n: string) => void;
    } | undefined;
    if (mc) {
      [`block_${block.id}_get`, `block_${block.id}_update`, `block_${block.id}_remove`]
        .forEach(n => { try { mc.unregisterTool(n); } catch { /* ok */ } });
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="relative group rounded-lg border transition-all bg-surface border-border hover:border-border2"
  draggable="true"
  ondragstart={(e) => onDragStart(e, block.id)}
  ondragover={(e) => e.preventDefault()}
  ondrop={(e) => onDrop(e, block.id)}
  role="listitem"
>
  <!-- Drag handle -->
  <div class="absolute left-0 top-0 bottom-0 flex items-center px-1 opacity-0 group-hover:opacity-100 cursor-grab z-10">
    <GripVertical size={14} class="text-zinc-600" />
  </div>

  <!-- Block content -->
  <div class="pl-1">
    <BlockRenderer type={block.type} data={block.data} />
  </div>

  <!-- WebMCP badge — visible on hover -->
  <div class="absolute bottom-2 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
    <span class="text-[9px] font-mono text-zinc-700 bg-black/30 px-1.5 py-0.5 rounded">
      ⬡ {block.id.slice(0, 10)}
    </span>
  </div>

  <!-- Actions -->
  <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
    <button
      class="p-1 rounded border border-border2 bg-surface2 text-zinc-500 hover:text-white transition-colors"
      aria-label="Edit block"
      onclick={() => onEdit(block.id)}
    >
      <Pencil size={11} />
    </button>
    <button
      class="p-1 rounded border border-border2 bg-surface2 text-zinc-500 hover:text-red-400 hover:border-red-800 transition-colors"
      aria-label="Remove block"
      onclick={() => canvas.removeBlock(block.id)}
    >
      <X size={11} />
    </button>
  </div>
</div>
