<script lang="ts">
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import { extractSampleData } from '@webmcp-auto-ui/sdk';
  import { LayoutGrid } from 'lucide-svelte';

  interface Props {
    currentType: string;
    activeServers: WebMcpServer[];
    onpick: (newType: string, sampleData: Record<string, unknown> | null) => void;
  }
  let { currentType, activeServers, onpick }: Props = $props();

  let open = $state(false);
  let menuEl = $state<HTMLDivElement | undefined>(undefined);

  interface WidgetItem { serverName: string; widgetName: string; recipe: string; description: string }

  const grouped = $derived.by<Array<[string, WidgetItem[]]>>(() => {
    const m = new Map<string, WidgetItem[]>();
    for (const server of activeServers) {
      const widgets = server.listWidgets();
      if (widgets.length === 0) continue;
      const list: WidgetItem[] = widgets.map(w => ({
        serverName: server.name,
        widgetName: w.name,
        recipe: w.recipe ?? '',
        description: w.description ?? '',
      }));
      m.set(server.name, list);
    }
    return [...m.entries()];
  });

  function pick(item: WidgetItem) {
    const sample = extractSampleData(item.recipe);
    onpick(item.widgetName, sample);
    open = false;
  }

  function onDocClick(ev: MouseEvent) {
    if (!open) return;
    if (menuEl && !menuEl.contains(ev.target as Node)) open = false;
  }
</script>

<svelte:window onclick={onDocClick} />

<div class="relative" bind:this={menuEl}>
  <button
    class="p-1 rounded hover:bg-surface2 text-text2 hover:text-accent transition-colors"
    onclick={(e) => { e.stopPropagation(); open = !open; }}
    title="Swap renderer (try other widgets with sample data)"
  >
    <LayoutGrid size={12} />
  </button>
  {#if open}
    <div class="absolute right-0 top-full mt-1 w-72 max-h-96 overflow-y-auto bg-surface border border-border2 rounded shadow-lg z-30">
      <div class="px-2 py-1.5 text-[9px] uppercase font-mono text-text2 bg-surface2 sticky top-0 border-b border-border2">
        Current: <span class="text-accent">{currentType}</span>
      </div>
      {#each grouped as [serverName, widgets] (serverName)}
        <div class="px-2 py-1 text-[9px] uppercase font-mono text-text2 bg-surface2/60 border-t border-border2">
          {serverName} <span class="text-text2/60">({widgets.length})</span>
        </div>
        {#each widgets as w (serverName + ':' + w.widgetName)}
          <button
            class="w-full text-left px-2 py-1 hover:bg-surface2 text-[11px] font-mono flex flex-col gap-0.5"
            class:bg-surface2={w.widgetName === currentType}
            onclick={() => pick(w)}
          >
            <span class:text-accent={w.widgetName === currentType}>{w.widgetName}</span>
            {#if w.description}
              <span class="text-[9px] text-text2 truncate">{w.description}</span>
            {/if}
          </button>
        {/each}
      {/each}
      {#if grouped.length === 0}
        <div class="px-3 py-4 text-[10px] font-mono text-text2 text-center">
          No active servers — open the servers drawer to enable some.
        </div>
      {/if}
    </div>
  {/if}
</div>
