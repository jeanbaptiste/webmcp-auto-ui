<script lang="ts">
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { McpConnector, LLMSelector, SettingsPanel, RemoteMCPserversDemo } from '@webmcp-auto-ui/ui';

  interface Props {
    open: boolean;
    mcpToken?: string;
    systemPrompt?: string;
    maxTokens?: number;
    maxContextTokens?: number;
    cacheEnabled?: boolean;
    temperature?: number;
    topK?: number;
    showTokens?: boolean;
    showToolJSON?: boolean;
    toolMode?: 'smart' | 'explicit';
    onconnect: () => void;
    connectedUrls?: string[];
    loadingUrls?: string[];
    onaddserver?: (url: string) => void;
    onaddall?: () => void;
    onremoveserver?: (url: string) => void;
  }

  let {
    open = $bindable(false),
    mcpToken = $bindable(''),
    systemPrompt = $bindable(''),
    maxTokens = $bindable(4096),
    maxContextTokens = $bindable(150_000),
    cacheEnabled = $bindable(true),
    temperature = $bindable(1.0),
    topK = $bindable(64),
    showTokens = $bindable(true),
    showToolJSON = $bindable(false),
    toolMode = $bindable<'smart' | 'explicit'>('smart'),
    onconnect,
    connectedUrls = [],
    loadingUrls = [],
    onaddserver,
    onaddall,
    onremoveserver,
  }: Props = $props();
</script>

<!-- Backdrop -->
{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/40 z-40" onclick={() => open = false}></div>
{/if}

<!-- Drawer -->
<aside class="settings-drawer {open ? 'open' : ''}">

  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
    <span class="font-mono text-sm font-bold text-text1">Paramètres</span>
    <button class="text-text2 hover:text-text1 text-lg leading-none transition-colors"
            onclick={() => open = false}>✕</button>
  </div>

  <div class="flex flex-col gap-6 p-5 overflow-y-auto flex-1">

    <!-- MCP — custom URL -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Serveur MCP (URL manuelle)</div>
      <McpConnector
        url={canvas.mcpUrl}
        onurlchange={(v) => canvas.setMcpUrl(v)}
        bind:token={mcpToken}
        connecting={canvas.mcpConnecting}
        connected={canvas.mcpConnected}
        serverName={connectedUrls.length > 1 ? `multi-serveurs (${connectedUrls.length})` : canvas.mcpName ?? ''}
        onconnect={onconnect}
      />
    </section>

    <!-- I — MCP demo servers -->
    <section class="flex flex-col gap-2">
      <RemoteMCPserversDemo
        servers={MCP_DEMO_SERVERS}
        {connectedUrls}
        loading={loadingUrls}
        onconnect={(url) => onaddserver?.(url)}
        onconnectall={() => onaddall?.()}
        ondisconnect={(url) => onremoveserver?.(url)}
      />
    </section>

    <!-- LLM -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Modèle LLM</div>
      <LLMSelector
        value={canvas.llm}
        onchange={(v) => canvas.setLlm(v as 'haiku'|'sonnet'|'gemma-e2b'|'gemma-e4b')}
        class="w-full"
      />
    </section>

    <!-- Agent settings -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Agent</div>
      <SettingsPanel
        bind:systemPrompt
        bind:maxTokens
        bind:maxContextTokens
        bind:cacheEnabled
        bind:temperature
        bind:topK
        modelType={canvas.llm.startsWith('gemma') ? 'wasm' : 'remote'}
        modelId={canvas.llm}
      />
    </section>

    <!-- Tools -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Outils UI</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" checked={toolMode === 'smart'} onchange={() => toolMode = toolMode === 'smart' ? 'explicit' : 'smart'} class="accent-accent w-3.5 h-3.5" />
        Smart (1 tool component)
      </label>
      <div class="text-[9px] font-mono text-text2/60 pl-5">
        {toolMode === 'smart' ? '1 tool component() — ~300 tokens' : '31 render_* + component() — ~4000 tokens'}
      </div>
    </section>

    <!-- Display -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Affichage</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={showTokens} class="accent-accent w-3.5 h-3.5" />
        Token usage
      </label>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={showToolJSON} class="accent-accent w-3.5 h-3.5" />
        Show tool call JSON
      </label>
    </section>

  </div>
</aside>

<style>
  .settings-drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 320px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border2);
    z-index: 50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 4px 0 32px rgba(0,0,0,0.2);
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .settings-drawer.open {
    transform: translateX(0);
  }
</style>
