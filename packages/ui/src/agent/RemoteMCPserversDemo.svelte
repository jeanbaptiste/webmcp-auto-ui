<script lang="ts">
  interface Server {
    id: string;
    name: string;
    description: string;
    url: string;
    tags?: string[];
  }

  interface Props {
    servers: Server[];
    connectedUrls?: string[];
    loading?: string[];
    onconnect?: (url: string) => void;
    onconnectall?: () => void;
    ondisconnect?: (url: string) => void;
    recipeCountByServer?: Record<string, number>;
    onrecipeclick?: (url: string) => void;
    toolCountByServer?: Record<string, number>;
    ontoolclick?: (url: string) => void;
  }

  let {
    servers,
    connectedUrls = [],
    loading = [],
    onconnect,
    onconnectall,
    ondisconnect,
    recipeCountByServer,
    onrecipeclick,
    toolCountByServer,
    ontoolclick,
  }: Props = $props();

  const allConnected = $derived(
    servers.length > 0 && servers.every(s => connectedUrls.includes(s.url))
  );
  const anyConnected = $derived(
    servers.some(s => connectedUrls.includes(s.url))
  );

  function isConnected(url: string) {
    return connectedUrls.includes(url);
  }
  function isLoading(url: string) {
    return loading.includes(url);
  }
</script>

<div class="flex flex-col gap-2">
  <span class="text-[9px] font-mono uppercase tracking-wider text-text2">
    Available MCP servers
  </span>

  <div class="flex flex-col gap-1">
    {#each servers as server (server.id)}
      {@const connected = isConnected(server.url)}
      {@const busy = isLoading(server.url)}
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
          <span class="font-mono text-xs font-medium text-text1">{server.name}</span>
          <span class="text-[10px] text-text2 truncate">{server.description}</span>
          {#if connected && (recipeCountByServer?.[server.url] || toolCountByServer?.[server.url])}
            <span class="flex items-center gap-1.5 mt-0.5">
              {#if recipeCountByServer?.[server.url]}
                <button class="text-[10px] font-mono text-accent hover:underline"
                        onclick={(e) => { e.stopPropagation(); onrecipeclick?.(server.url); }}>
                  {recipeCountByServer[server.url]} recipes
                </button>
              {/if}
              {#if recipeCountByServer?.[server.url] && toolCountByServer?.[server.url]}
                <span class="text-[10px] text-text2">·</span>
              {/if}
              {#if toolCountByServer?.[server.url]}
                <button class="text-[10px] font-mono text-accent hover:underline"
                        onclick={(e) => { e.stopPropagation(); ontoolclick?.(server.url); }}>
                  {toolCountByServer[server.url]} tools
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
              onclick={() => ondisconnect?.(server.url)}
              class="text-xs font-mono px-1.5 h-6 rounded text-teal group-hover:text-accent2 transition-colors"
              title="Disconnect"
            >
              <span class="group-hover:hidden">&#10003;</span>
              <span class="hidden group-hover:inline text-accent2">&#215;</span>
            </button>
          {:else}
            <button
              onclick={() => onconnect?.(server.url)}
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
            if (isConnected(s.url)) ondisconnect?.(s.url);
          }
        }}
        class="text-xs font-mono px-2 h-7 rounded border border-border2 bg-surface2 hover:border-accent2/50 hover:text-accent2 text-text2 transition-colors"
      >
        Disconnect all
      </button>
    {/if}
  </div>
</div>
