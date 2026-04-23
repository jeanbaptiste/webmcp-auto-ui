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
    compact?: boolean;      // hide token field entirely
    showToken?: boolean;    // toggle controlled from outside
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
    showToken = $bindable(false),
  }: Props = $props();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let urlChangeTimer: ReturnType<typeof setTimeout> | null = null;

  function handleUrlInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    // Debounce onurlchange so we don't pollute the canvas store with every keystroke.
    if (urlChangeTimer) clearTimeout(urlChangeTimer);
    urlChangeTimer = setTimeout(() => {
      onurlchange?.(v);
    }, 400);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (v.startsWith('http') && !connected && !connecting) {
        onconnect?.();
      }
    }, 400);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (urlChangeTimer) { clearTimeout(urlChangeTimer); urlChangeTimer = null; }
      if (debounceTimer) clearTimeout(debounceTimer);
      // Flush current URL immediately before connecting.
      const v = (e.target as HTMLInputElement).value;
      onurlchange?.(v);
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

  {#if !compact && showToken}
    <input
      type="password"
      value={token}
      oninput={(e) => { token = (e.target as HTMLInputElement).value; onTokenChange?.(token); }}
      placeholder="Bearer token (optional)"
      class="font-mono text-xs bg-surface2 border border-border2 rounded px-2 h-7 text-text1 outline-none placeholder:text-text2/40 focus:border-accent/50 transition-colors"
    />
  {/if}

  {#if error}
    <span class="text-[10px] font-mono text-accent2">{error}</span>
  {/if}
</div>
