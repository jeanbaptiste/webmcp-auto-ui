<script lang="ts">
  declare const __BUILD_TIME__: string;
  declare const __GIT_HASH__: string;

  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import {
    RemoteLLMProvider, runAgentLoop, buildSystemPrompt,
    fromMcpTools, autoui,
    buildDiscoveryCache, ContextRAG,
  } from '@webmcp-auto-ui/agent';
  import type { ChatMessage, ToolLayer, McpLayer } from '@webmcp-auto-ui/agent';
  import { LLMSelector, McpStatus, AgentProgress, WidgetRenderer, getTheme } from '@webmcp-auto-ui/ui';
  import { tricoteusesServer } from '$lib/widgets/register';
  import { Sun, Moon } from 'lucide-svelte';

  // ── State ─────────────────────────────────────────────────────────────
  let input = $state('');
  let mcpUrl = $state('https://mcp.code4code.eu/mcp');
  let conversationHistory = $state<ChatMessage[]>([]);
  let chatTimer = $state(0);
  let chatToolCount = $state(0);
  let chatLastTool = $state('');

  interface Block {
    id: string;
    type: string;
    data: Record<string, unknown>;
  }
  let blocks = $state<Block[]>([]);
  let ephemeralText = $state('');

  // ── WebMCP local servers (toggleable) ──────────────────────────────────
  interface LocalWebMcpEntry { server: WebMcpServer; label: string; enabled: boolean; }
  let localWebMcpServers = $state<LocalWebMcpEntry[]>([
    { server: tricoteusesServer, label: 'Tricoteuses', enabled: true },
    { server: autoui, label: 'AutoUI', enabled: false },
  ]);

  // ── Theme ─────────────────────────────────────────────────────────────
  const theme = getTheme();

  // ── Multi-MCP ─────────────────────────────────────────────────────────
  let multiClient = $state<McpMultiClient>(new McpMultiClient());
  let connected = $state(false);
  let connecting = $state(false);
  let mcpName = $state('');

  // ── Provider ──────────────────────────────────────────────────────────
  const provider = new RemoteLLMProvider({ proxyUrl: `${base}/api/chat` });

  $effect(() => {
    provider.setModel(canvas.llm as any);
  });

  // ── Layers ────────────────────────────────────────────────────────────
  const layers = $derived.by((): ToolLayer[] => {
    const result: ToolLayer[] = [];
    if (connected) {
      for (const server of multiClient.listServers()) {
        const mcpLayer: McpLayer = {
          protocol: 'mcp',
          serverName: server.name,
          tools: fromMcpTools(server.tools as Parameters<typeof fromMcpTools>[0]),
        };
        result.push(mcpLayer);
      }
    }
    // Local WebMCP servers (only enabled ones)
    for (const entry of localWebMcpServers) {
      if (entry.enabled) result.push(entry.server.layer());
    }
    return result;
  });

  // LLM optimization options (smart defaults via $effect below)
  let schemaSanitize = $state(true);
  let schemaFlatten = $state(false);
  let maxResultLength = $state(10000);
  let truncateResults = $state(false);
  let compressHistory = $state(false);
  let compressPreview = $state(500);
  let cacheEnabled = $state(true);
  let temperature = $state(1.0);

  // Smart defaults: adjust optimization options when LLM model changes
  $effect(() => {
    const isGemma = canvas.llm.startsWith('gemma');
    const isLocal = canvas.llm === 'local';
    schemaSanitize = isLocal ? true : !isGemma;
    schemaFlatten = isGemma || isLocal;
    truncateResults = isGemma || isLocal;
    compressHistory = isLocal;
    if (isGemma) {
      maxResultLength = 2000;
      temperature = 0.7;
      cacheEnabled = false;
    } else if (isLocal) {
      maxResultLength = 3000;
    } else {
      // Claude defaults
      maxResultLength = 10000;
      temperature = 1.0;
      cacheEnabled = true;
    }
  });

  // Nano-RAG (experimental, off by default)
  let contextRAGEnabled = $state(false);
  let contextRAG = $state<ContextRAG | null>(null);

  $effect(() => {
    if (contextRAGEnabled && !contextRAG) {
      contextRAG = new ContextRAG({ topK: 5 });
    }
    if (!contextRAGEnabled && contextRAG) {
      contextRAG.destroy();
      contextRAG = null;
    }
  });

  const discoveryCache = $derived(buildDiscoveryCache(layers));
  // Boilerplate only uses RemoteLLMProvider (proxy); Gemma native syntax is not needed here.
  const systemPrompt = $derived(buildSystemPrompt(layers, { providerKind: 'generic' }));

  // ── Servers: custom WebMCP servers for WidgetRenderer ─────────────────
  const servers = $derived(localWebMcpServers.filter(e => e.enabled).map(e => e.server));

  // ── MCP connect ───────────────────────────────────────────────────────
  async function connectMcp() {
    if (!mcpUrl.trim() || connecting) return;
    connecting = true;
    canvas.setMcpConnecting(true);
    try {
      const { tools } = await multiClient.addServer(mcpUrl.trim());
      connected = true;
      mcpName = multiClient.listServers().map(s => s.name).join(', ');
      canvas.setMcpConnected(true, mcpName, tools as Parameters<typeof canvas.setMcpConnected>[2]);
    } catch (e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
    } finally {
      connecting = false;
      canvas.setMcpConnecting(false);
    }
  }

  // ── Agent ─────────────────────────────────────────────────────────────
  async function sendMessage(msg: string) {
    if (!msg.trim() || canvas.generating) return;
    input = '';
    ephemeralText = '';
    canvas.setGenerating(true);
    chatTimer = 0; chatToolCount = 0; chatLastTool = '';
    const timerInterval = setInterval(() => chatTimer++, 1000);

    try {
      const result = await runAgentLoop(msg, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider,
        systemPrompt: systemPrompt || undefined,
        maxIterations: 10,
        maxTokens: 4096,
        maxResultLength,
        truncateResults,
        compressHistory: compressHistory ? compressPreview : false,
        temperature,
        cacheEnabled,
        layers,
        discoveryCache,
        contextRAG: contextRAG ?? undefined,
        schemaOptions: { sanitize: schemaSanitize, flatten: schemaFlatten, strict: false },
        initialMessages: conversationHistory,
        callbacks: {
          onWidget: (type, data) => {
            const id = 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
            blocks = [...blocks, { id, type, data }];
            return { id };
          },
          onClear: () => { blocks = []; },
          onText: (text) => { if (text) ephemeralText = text; },
          onToolCall: (call) => { chatToolCount++; chatLastTool = call.name; },
        },
      });
      if (result) {
        conversationHistory = result.messages;
        if (result.text) ephemeralText = result.text;
      }
    } catch (e) {
      ephemeralText = e instanceof Error ? e.message : String(e);
    } finally {
      clearInterval(timerInterval);
      canvas.setGenerating(false);
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  onMount(() => {
    // Auto-connect MCP on mount
    if (mcpUrl) connectMcp();
  });
</script>

<svelte:head><title>Boilerplate Tricoteuses</title></svelte:head>

<div class="h-screen flex flex-col bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <span class="font-mono text-sm font-bold flex-shrink-0">
      <span class="text-text1">Boilerplate</span> <span class="text-accent">Tricoteuses</span>
    </span>
    <div class="flex-1"></div>
    <McpStatus
      connecting={canvas.mcpConnecting}
      connected={canvas.mcpConnected}
      name={mcpName || 'non connecte'}
      servers={multiClient.listServers().map(s => ({ url: s.url, name: s.name, toolCount: s.tools.length }))}
    />
    <label class="flex items-center gap-1.5 font-mono text-xs text-text2 cursor-pointer flex-shrink-0">
      <input type="checkbox" bind:checked={contextRAGEnabled} class="accent-accent w-3.5 h-3.5" />
      Nano-RAG <span class="text-[8px] text-text2/40">(exp.)</span>
    </label>
    <LLMSelector />
    <button class="h-7 w-7 flex items-center justify-center rounded border border-border2 text-text2 hover:text-text1 transition-colors flex-shrink-0"
            onclick={theme.toggle} aria-label="Toggle theme">
      {#if theme.mode === 'dark'}
        <Sun size={14} />
      {:else}
        <Moon size={14} />
      {/if}
    </button>
  </header>

  <!-- MAIN -->
  <div class="flex-1 overflow-auto p-6">
    <!-- MCP URL -->
    <div class="max-w-2xl mx-auto mb-6">
      <div class="flex gap-2">
        <input type="text" bind:value={mcpUrl}
          placeholder="URL du serveur MCP..."
          class="flex-1 bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1
                 outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors" />
        <button onclick={connectMcp}
          disabled={connecting}
          class="px-3 py-2 rounded-lg bg-accent text-white text-xs font-mono hover:bg-accent/80 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
          {connecting ? '...' : 'Connecter'}
        </button>
      </div>
    </div>

    <!-- WebMCP local servers -->
    <div class="max-w-2xl mx-auto mb-4">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-[10px] font-mono text-text2 uppercase tracking-wider">WebMCP</span>
        {#each localWebMcpServers as entry, i}
          <button
            onclick={() => { localWebMcpServers[i].enabled = !localWebMcpServers[i].enabled; }}
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors
                   {entry.enabled
                     ? 'border-accent/50 bg-accent/10 text-accent'
                     : 'border-border2 bg-surface2 text-text2 hover:text-text1 hover:border-border'}"
          >
            <span class="w-1.5 h-1.5 rounded-full {entry.enabled ? 'bg-accent' : 'bg-text2/30'}"></span>
            {entry.label}
            <span class="text-[10px] text-text2/60">{entry.server.listWidgets().length} widgets</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Widgets grid -->
    {#if blocks.length > 0}
      <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {#each blocks as block (block.id)}
          <div class="block-anim">
            <WidgetRenderer
              id={block.id}
              type={block.type}
              data={block.data}
              {servers}
            />
          </div>
        {/each}
      </div>
    {/if}

    <!-- Ephemeral text -->
    {#if ephemeralText}
      <div class="max-w-2xl mx-auto mb-6 p-4 bg-surface border border-border rounded-xl">
        <p class="text-sm text-text1 leading-relaxed whitespace-pre-wrap">{ephemeralText}</p>
      </div>
    {/if}

    <!-- Empty state -->
    {#if blocks.length === 0 && !ephemeralText && !canvas.generating}
      <div class="max-w-2xl mx-auto text-center py-20">
        <h2 class="text-lg font-semibold text-text1 mb-2">Boilerplate Tricoteuses</h2>
        <p class="text-sm text-text2 leading-relaxed max-w-md mx-auto">
          Template d'integration webmcp-auto-ui avec 3 widgets custom :
          fiches deputes, scrutins et amendements.
          Tapez une question pour commencer.
        </p>
        <div class="flex gap-2 justify-center mt-6 flex-wrap">
          <button onclick={() => sendMessage('Montre-moi la fiche de Jean-Luc Melenchon avec ses stats de vote')}
            class="px-3 py-1.5 rounded-lg border border-border2 text-xs font-mono text-text2 hover:text-text1 hover:border-accent/40 transition-colors">
            Fiche depute
          </button>
          <button onclick={() => sendMessage('Affiche le resultat du scrutin sur la reforme des retraites')}
            class="px-3 py-1.5 rounded-lg border border-border2 text-xs font-mono text-text2 hover:text-text1 hover:border-accent/40 transition-colors">
            Scrutin
          </button>
          <button onclick={() => sendMessage('Montre un amendement adopte sur l\'article 7 du projet de loi finances')}
            class="px-3 py-1.5 rounded-lg border border-border2 text-xs font-mono text-text2 hover:text-text1 hover:border-accent/40 transition-colors">
            Amendement
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- AGENT PROGRESS -->
  <AgentProgress active={canvas.generating} elapsed={chatTimer} toolCalls={chatToolCount} lastTool={chatLastTool} />

  <!-- INPUT BAR -->
  <div class="flex-shrink-0 px-6 py-4 bg-surface border-t border-border">
    <div class="max-w-2xl mx-auto flex gap-2">
      <input type="text" bind:value={input} onkeydown={onKeydown}
        placeholder={connected ? 'Demandez des widgets parlementaires...' : 'Connectez un serveur MCP pour commencer...'}
        disabled={canvas.generating}
        class="flex-1 bg-surface2 border border-border2 rounded-xl px-5 py-3 text-sm font-mono text-text1
               outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed" />
      {#if canvas.generating}
        <button class="px-4 py-3 rounded-xl bg-accent2/10 border border-accent2/30 text-accent2 font-mono text-sm hover:bg-accent2/20 transition-colors flex-shrink-0">
          Stop
        </button>
      {/if}
    </div>
  </div>

  <!-- Footer -->
  <footer class="flex-shrink-0 px-6 py-2 border-t border-border flex items-center justify-between">
    <span class="font-mono text-[8px] text-text2/40">boilerplate v0.1.0 · {__GIT_HASH__ ?? ''} · {__BUILD_TIME__?.replace('T', ' ').replace('Z', '').slice(0, 23)}</span>
    <a href="https://github.com/jeanbaptiste/webmcp-auto-ui"
       target="_blank" rel="noopener"
       class="font-mono text-[8px] text-text2/40 hover:text-text2 transition-colors">GitHub</a>
  </footer>
</div>
