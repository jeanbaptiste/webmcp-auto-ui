<script lang="ts">
  import McpStatus from './McpStatus.svelte';

  interface Props {
    url?: string;
    token?: string;
    connecting?: boolean;
    connected?: boolean;
    serverName?: string;
    error?: string;
    onconnect?: () => void;
    ondisconnect?: () => void;
    class?: string;
    compact?: boolean;    // hide token field
  }

  let {
    url = $bindable(''),
    token = $bindable(''),
    connecting = false,
    connected = false,
    serverName = '',
    error = '',
    onconnect,
    ondisconnect,
    class: cls = '',
    compact = false,
  }: Props = $props();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleUrlInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (url.startsWith('http') && !connected && !connecting) {
        onconnect?.();
      }
    }, 400);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (debounceTimer) clearTimeout(debounceTimer);
      onconnect?.();
    }
  }
</script>

<div class="flex flex-col gap-2 {cls}">
  <div class="flex items-center gap-2">
    <input
      type="text"
      bind:value={url}
      oninput={handleUrlInput}
      onkeydown={handleKeydown}
      placeholder="https://mcp.example.com/sse"
      class="flex-1 min-w-0 font-mono text-xs bg-surface2 border border-border2 rounded px-2 h-7 text-text1 outline-none placeholder:text-text2/40 focus:border-accent/50 transition-colors"
    />
    {#if !connected}
      <button
        onclick={onconnect}
        disabled={!url.trim() || connecting}
        class="text-xs font-mono px-2 h-7 rounded border border-border2 bg-surface2 hover:border-accent/50 hover:text-accent text-text2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
      >
        {connecting ? 'connexion…' : 'connect'}
      </button>
    {:else}
      <button
        onclick={ondisconnect}
        class="text-xs font-mono px-2 h-7 rounded border border-border2 bg-surface2 hover:border-accent2/50 hover:text-accent2 text-text2 transition-colors flex-shrink-0"
      >
        disconnect
      </button>
    {/if}
    <McpStatus {connecting} {connected} name={serverName || 'non connecté'} />
  </div>

  {#if !compact}
    <input
      type="password"
      bind:value={token}
      placeholder="Bearer token (optional)"
      class="font-mono text-xs bg-surface2 border border-border2 rounded px-2 h-7 text-text1 outline-none placeholder:text-text2/40 focus:border-accent/50 transition-colors"
    />
  {/if}

  {#if error}
    <span class="text-[10px] font-mono text-accent2">{error}</span>
  {/if}
</div>
