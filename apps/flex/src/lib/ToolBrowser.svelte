<script lang="ts">
  import { filterRecipes, sortRecipes, groupToolsByServer, formatToolSchema } from '@webmcp-auto-ui/agent';
  import type { BrowsableTool } from '@webmcp-auto-ui/agent';

  interface Props {
    open: boolean;
    tools: BrowsableTool[];
    initialFilter?: string;
  }

  let { open = $bindable(false), tools = [], initialFilter = '' }: Props = $props();

  let query = $state('');
  let selected = $state<BrowsableTool | null>(null);

  $effect(() => {
    if (open) {
      query = initialFilter || '';
      selected = null;
    }
  });

  const filtered = $derived(sortRecipes(filterRecipes(tools, query)));
  const grouped = $derived(groupToolsByServer(filtered));

  function close() {
    open = false;
    selected = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (selected) selected = null;
      else close();
    }
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
       onclick={close}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-surface border border-border2 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
         onclick={(e) => e.stopPropagation()}>

      <!-- Header -->
      <div class="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        {#if selected}
          <button class="text-text2 hover:text-text1 transition-colors" onclick={() => selected = null}>
            &larr;
          </button>
          <span class="font-mono text-sm font-bold text-text1 truncate flex-1">{selected.name}</span>
        {:else}
          <span class="font-mono text-sm font-bold text-text1 flex-1">Tool Browser</span>
          <span class="text-[10px] font-mono text-text2">{tools.length} tools</span>
        {/if}
        <button class="text-text2 hover:text-text1 text-lg leading-none transition-colors"
                onclick={close}>x</button>
      </div>

      {#if selected}
        <!-- Detail view -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {#if selected.description}
            <p class="text-sm text-text2 leading-relaxed">{selected.description}</p>
          {:else}
            <p class="text-sm text-text2 italic">No description available</p>
          {/if}

          {#if selected.server}
            <div class="flex flex-col gap-1">
              <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Server</span>
              <span class="font-mono text-xs text-text1 bg-surface2 rounded px-3 py-2 border border-border2">{selected.server}</span>
            </div>
          {/if}

          {#if selected.inputSchema}
            <div class="flex flex-col gap-1">
              <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Input schema</span>
              <pre class="text-[11px] font-mono text-text1 bg-surface2 rounded px-3 py-2 border border-border2 whitespace-pre-wrap break-words overflow-x-auto max-h-[400px] overflow-y-auto">{formatToolSchema(selected)}</pre>
            </div>
          {/if}
        </div>

      {:else}
        <!-- Search -->
        <div class="px-4 py-3 border-b border-border flex-shrink-0">
          <input
            type="text"
            bind:value={query}
            placeholder="Search tools..."
            class="w-full bg-surface2 border border-border2 rounded-lg px-3 h-8 text-xs font-mono text-text1
                   outline-none placeholder:text-text2/40 focus:border-accent/50 transition-colors"
          />
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto min-h-0">
          {#each [...grouped.entries()] as [serverName, serverTools] (serverName)}
            <div class="px-4 pt-3 pb-1">
              <span class="text-[9px] font-mono uppercase tracking-wider text-text2">
                {serverName} ({serverTools.length})
              </span>
            </div>
            {#each serverTools as tool, i (`${serverName}:${tool.name}:${i}`)}
              <button
                class="w-full text-left px-4 py-2 border-b border-border/30 hover:bg-surface2/80 transition-colors"
                onclick={() => selected = tool}
              >
                <div class="font-mono text-xs font-medium text-text1">{tool.name}</div>
                {#if tool.description}
                  <div class="text-[10px] text-text2 truncate mt-0.5">{tool.description}</div>
                {/if}
              </button>
            {/each}
          {/each}

          {#if filtered.length === 0}
            <div class="p-8 text-center text-text2 text-xs font-mono">No tools found</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
