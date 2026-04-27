<svelte:options customElement={{ tag: 'auto-mcp-servers-list', shadow: 'none' }} />

<script lang="ts">
  interface Server {
    id: string;
    label: string;
    description: string;
    url: string;
    tags?: string[];
  }

  interface Props {
    servers: Server[];
    /** Set of registry ids currently enabled/connected. Aligned with WebMCPserversList. */
    enabledServers?: Set<string>;
    /** Set of registry ids currently in a loading/connecting state. */
    loading?: Set<string>;
    onconnect?: (id: string) => void;
    onconnectall?: () => void;
    ondisconnect?: (id: string) => void;
    /** Recipe counts keyed by registry id. */
    recipeCountByServer?: Record<string, number>;
    onrecipeclick?: (id: string) => void;
    /** Tool counts keyed by registry id. */
    toolCountByServer?: Record<string, number>;
    ontoolclick?: (id: string) => void;
    /** Hide the built-in "Available MCP servers" header (when caller wraps the
     * list in its own disclosure/section that already provides a title). */
    hideHeader?: boolean;
  }

  const EMPTY_SET: Set<string> = new Set();

  let {
    servers,
    enabledServers = EMPTY_SET,
    loading = EMPTY_SET,
    onconnect,
    onconnectall,
    ondisconnect,
    recipeCountByServer,
    onrecipeclick,
    toolCountByServer,
    ontoolclick,
    hideHeader = false,
  }: Props = $props();

  const allConnected = $derived(
    servers.length > 0 && servers.every(s => enabledServers.has(s.id))
  );
  const anyConnected = $derived(
    servers.some(s => enabledServers.has(s.id))
  );

  function isConnected(id: string) {
    return enabledServers.has(id);
  }
  function isLoading(id: string) {
    return loading.has(id);
  }
</script>

<div class="flex flex-col gap-2">
  {#if !hideHeader}
    <span class="text-[9px] font-mono uppercase tracking-wider text-text2">
      Available MCP servers
    </span>
  {/if}

  <div class="flex flex-col gap-1">
    {#each servers as server (server.id)}
      {@const connected = isConnected(server.id)}
      {@const busy = isLoading(server.id)}
      <div
        class="group flex items-center gap-2 px-2 py-1.5 rounded border border-border2 bg-surface2 hover:border-accent/30 transition-colors"
      >
        <!-- status dot -->
        <div
          class="w-1.5 h-1.5 rounded-full flex-shrink-0 {busy
            ? 'bg-amber animate-pulse'
            : connected
              ? 'bg-teal'
              : 'bg-text2/30'}"
        ></div>

        <!-- info -->
        <div class="flex-1 min-w-0 flex flex-col">
          <span class="font-mono text-xs font-medium text-text1">{server.label}</span>
          <span class="text-[10px] text-text2 truncate">{server.description}</span>
          {#if connected && (recipeCountByServer?.[server.id] || toolCountByServer?.[server.id])}
            <span class="flex items-center gap-1.5 mt-0.5">
              {#if recipeCountByServer?.[server.id]}
                <button class="text-[10px] font-mono text-accent hover:underline"
                        onclick={(e) => { e.stopPropagation(); onrecipeclick?.(server.id); }}>
                  {recipeCountByServer[server.id]} recipes
                </button>
              {/if}
              {#if recipeCountByServer?.[server.id] && toolCountByServer?.[server.id]}
                <span class="text-[10px] text-text2">·</span>
              {/if}
              {#if toolCountByServer?.[server.id]}
                <button class="text-[10px] font-mono text-accent hover:underline"
                        onclick={(e) => { e.stopPropagation(); ontoolclick?.(server.id); }}>
                  {toolCountByServer[server.id]} tools
                </button>
              {/if}
            </span>
          {/if}
        </div>

        <!-- action -->
        <div class="flex-shrink-0">
          {#if busy}
            <div class="w-4 h-4 border border-accent/50 border-t-accent rounded-full animate-spin"></div>
          {:else if connected}
            <button
              onclick={() => ondisconnect?.(server.id)}
              class="text-xs font-mono px-1.5 h-6 rounded text-teal group-hover:text-accent2 transition-colors"
              title="Disconnect"
            >
              <span class="group-hover:hidden">&#10003;</span>
              <span class="hidden group-hover:inline text-accent2">&#215;</span>
            </button>
          {:else}
            <button
              onclick={() => onconnect?.(server.id)}
              class="text-[10px] font-mono px-1.5 h-6 rounded border border-border2 bg-surface2 hover:border-accent/50 hover:text-accent text-text2 transition-colors"
            >
              connect
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- bottom actions -->
  <div class="flex items-center gap-2 mt-1">
    <button
      onclick={onconnectall}
      disabled={allConnected}
      class="text-xs font-mono px-2 h-7 rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Load all
    </button>
    {#if anyConnected}
      <button
        onclick={() => {
          for (const s of servers) {
            if (isConnected(s.id)) ondisconnect?.(s.id);
          }
        }}
        class="text-xs font-mono px-2 h-7 rounded border border-border2 bg-surface2 hover:border-accent2/50 hover:text-accent2 text-text2 transition-colors"
      >
        Disconnect all
      </button>
    {/if}
  </div>
</div>
