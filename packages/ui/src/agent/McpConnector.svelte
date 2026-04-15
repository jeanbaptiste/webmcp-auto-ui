<script lang="ts">
  import McpStatus from './McpStatus.svelte';

  interface Props {
    url?: string;
    onurlchange?: (v: string) => void;
    token?: string;
    onTokenChange?: (v: string) => void;
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
    url = '',
    onurlchange,
    token = $bindable(''),
    onTokenChange,
    connecting = false,
    connected = false,
    serverName = '',
    error = '',
    onconnect,
    ondisconnect,
    class: cls = '',
    compact = false,
  }: Props = $props();

  let showToken = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleUrlInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    onurlchange?.(v);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (v.startsWith('http') && !connected && !connecting) {
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
      value={url}
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
        {connecting ? 'connecting…' : 'connect'}
      </button>
    {:else}
      <button
        onclick={ondisconnect}
        class="text-xs font-mono px-2 h-7 rounded border border-border2 bg-surface2 hover:border-accent2/50 hover:text-accent2 text-text2 transition-colors flex-shrink-0"
      >
        disconnect
      </button>
    {/if}
    <McpStatus {connecting} {connected} name={serverName || 'not connected'} />
  </div>

  {#if !compact}
    <div class="flex items-center gap-2">
      <button
        onclick={() => showToken = !showToken}
        class="text-text2 hover:text-text1 transition-colors flex-shrink-0"
        title="Bearer token"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      {#if showToken}
        <input
          type="password"
          value={token}
          oninput={(e) => { token = (e.target as HTMLInputElement).value; onTokenChange?.(token); }}
          placeholder="Bearer token (optional)"
          class="flex-1 font-mono text-xs bg-surface2 border border-border2 rounded px-2 h-7 text-text1 outline-none placeholder:text-text2/40 focus:border-accent/50 transition-colors"
        />
      {/if}
    </div>
  {/if}

  {#if error}
    <span class="text-[10px] font-mono text-accent2">{error}</span>
  {/if}
</div>
