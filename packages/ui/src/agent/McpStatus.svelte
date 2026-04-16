<script lang="ts">
  interface ConnectedServerInfo {
    url: string;
    name: string;
    toolCount: number;
  }

  interface Props {
    connecting: boolean;
    connected: boolean;
    name: string;
    servers?: ConnectedServerInfo[];
    onserverclick?: (url: string) => void;
    onclick?: () => void;
    class?: string;
  }
  let { connecting, connected, name, servers = [], onserverclick, onclick, class: cls = '' }: Props = $props();

  let dropdownOpen = $state(false);

  function toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
  }

  function handleServerClick(url: string) {
    dropdownOpen = false;
    onserverclick?.(url);
  }

  function closeDropdown() {
    dropdownOpen = false;
  }

  const isMulti = $derived(servers.length > 1);
</script>

<svelte:window onclick={closeDropdown} />

<div class="relative flex items-center gap-1.5 {cls}">
  <div class="w-1.5 h-1.5 rounded-full {connecting ? 'bg-amber animate-pulse' : connected ? 'bg-teal' : 'bg-text2/30'}"></div>

  {#if isMulti}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="text-[10px] text-teal font-mono cursor-pointer hover:underline select-none"
      onclick={toggleDropdown}
    >
      multi-server ({servers.length})
    </span>

    {#if dropdownOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute top-full right-0 mt-1 min-w-[200px] bg-surface border border-border2 rounded-lg shadow-lg z-50 py-1"
        onclick={(e) => e.stopPropagation()}
      >
        {#each servers as server}
          <button
            class="w-full flex items-center gap-2 px-3 py-1.5 text-left font-mono text-xs text-text1 hover:bg-surface2 transition-colors"
            onclick={() => handleServerClick(server.url)}
          >
            <span class="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0"></span>
            <span class="truncate flex-1">{server.name}</span>
            <span class="text-text2 text-[10px] flex-shrink-0">{server.toolCount} tools</span>
          </button>
        {/each}
        {#if onclick}
          <button
            class="w-full flex items-center gap-2 px-3 py-1.5 text-left font-mono text-xs text-accent hover:bg-surface2 transition-colors border-t border-border"
            onclick={(e) => { e.stopPropagation(); dropdownOpen = false; onclick?.(); }}
          >
            Browse recipes
          </button>
        {/if}
      </div>
    {/if}
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="text-[10px] text-text2 font-mono {connected && onclick ? 'cursor-pointer hover:underline' : ''}"
      onclick={() => { if (connected) onclick?.(); }}
    >
      {connecting ? 'connecting\u2026' : connected ? name : 'not connected'}
    </span>
  {/if}
</div>
