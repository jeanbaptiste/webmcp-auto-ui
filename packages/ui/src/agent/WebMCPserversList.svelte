<svelte:options customElement={{ tag: 'auto-webmcp-servers-list', shadow: 'none' }} />

<script lang="ts">
  interface Server {
    id: string;
    label: string;
    description: string;
    widgetCount: number;
    category?: string;
  }

  interface CategoryGroup {
    key: string;
    label: string;
  }

  interface Props {
    servers: Server[];
    enabledServers?: Set<string>;
    onToggle?: (id: string) => void;
    recipeCountByServer?: Record<string, number>;
    toolCountByServer?: Record<string, number>;
    onrecipeclick?: (id: string) => void;
    ontoolclick?: (id: string) => void;
    /** Optional category grouping. When provided AND any server has a `category`,
     * servers are rendered grouped under category headers. Order from this array
     * is preserved; servers whose category isn't listed fall into a tail "Other"
     * group. When absent, behavior is unchanged (flat list). */
    categories?: CategoryGroup[];
    initialCollapsed?: boolean;
  }

  let {
    servers,
    enabledServers = new Set<string>(),
    onToggle,
    recipeCountByServer,
    toolCountByServer,
    onrecipeclick,
    ontoolclick,
    categories,
    initialCollapsed = true,
  }: Props = $props();

  let collapsed = $state(initialCollapsed);

  const grouped = $derived.by(() => {
    if (!categories || categories.length === 0) return null;
    if (!servers.some(s => s.category)) return null;
    const groups = categories.map(c => ({
      key: c.key,
      label: c.label,
      items: servers.filter(s => (s.category ?? '') === c.key),
    }));
    const known = new Set(categories.map(c => c.key));
    const others = servers.filter(s => !s.category || !known.has(s.category));
    if (others.length > 0) groups.push({ key: '_other', label: 'Other', items: others });
    return groups.filter(g => g.items.length > 0);
  });
</script>

<div class="flex flex-col gap-2">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex items-center gap-1 cursor-pointer select-none"
       onclick={() => collapsed = !collapsed}>
    <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">WebMCP servers</span>
    <span class="text-[9px] text-text2/60 font-mono">({enabledServers.size}/{servers.length})</span>
    <span class="text-[10px] text-text2 ml-auto transition-transform {collapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
  </div>

  {#snippet row(srv: Server)}
    {@const enabled = enabledServers.has(srv.id)}
    {@const recipes = recipeCountByServer?.[srv.id] ?? 0}
    {@const tools = toolCountByServer?.[srv.id] ?? 0}
    <div class="group flex items-center gap-2 px-2 py-1.5 rounded border border-border2 bg-surface2 hover:border-accent/30 transition-colors">
      <input
        type="checkbox"
        checked={enabled}
        onchange={() => onToggle?.(srv.id)}
        class="w-3.5 h-3.5 rounded border-border2 accent-accent cursor-pointer flex-shrink-0"
      />
      <div class="flex-1 min-w-0 flex flex-col">
        <span class="font-mono text-xs font-medium text-text1 truncate">{srv.label}</span>
        {#if srv.description}
          <span class="text-[10px] text-text2 truncate">{srv.description}</span>
        {/if}
        {#if enabled && (recipes > 0 || tools > 0)}
          <span class="flex items-center gap-1.5 mt-0.5">
            {#if recipes > 0}
              <button class="text-[10px] font-mono text-accent hover:underline"
                      onclick={(e) => { e.stopPropagation(); onrecipeclick?.(srv.id); }}>
                {recipes} recipes
              </button>
            {/if}
            {#if recipes > 0 && tools > 0}
              <span class="text-[10px] text-text2">·</span>
            {/if}
            {#if tools > 0}
              <button class="text-[10px] font-mono text-accent hover:underline"
                      onclick={(e) => { e.stopPropagation(); ontoolclick?.(srv.id); }}>
                {tools} tools
              </button>
            {/if}
          </span>
        {/if}
      </div>
      <span class="text-[9px] font-mono text-text2/50 flex-shrink-0">{srv.widgetCount}w</span>
    </div>
  {/snippet}

  {#if !collapsed}
    {#if grouped}
      <div class="flex flex-col gap-3">
        {#each grouped as group (group.key)}
          <div class="flex flex-col gap-1">
            <div class="text-[9px] font-mono text-text2/70 uppercase tracking-wider pl-0.5">{group.label}</div>
            {#each group.items as srv (srv.id)}
              {@render row(srv)}
            {/each}
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-1">
        {#each servers as srv (srv.id)}
          {@render row(srv)}
        {/each}
      </div>
    {/if}
  {/if}
</div>
