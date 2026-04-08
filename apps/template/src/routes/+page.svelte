<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, GemmaProvider, runAgentLoop, fromMcpTools, trimConversationHistory } from '@webmcp-auto-ui/agent';
  import type { ChatMessage } from '@webmcp-auto-ui/agent';
  import {
    McpConnector, LLMSelector, ChatPanel, AgentConsole, BlockRenderer,
    McpStatus, GemmaLoader, AgentProgress, RemoteMCPserversDemo, THEME_MAP,
  } from '@webmcp-auto-ui/ui';
  import type { ChatFeedItem } from '@webmcp-auto-ui/ui';

  // ── State ──────────────────────────────────────────────────────────────────
  let input = $state('');
  let mcpToken = $state('');
  let conversationHistory = $state<ChatMessage[]>([]);
  let feed = $state<ChatFeedItem[]>([]);
  let blocks = $state<{ id: string; type: string; data: Record<string, unknown> }[]>([]);
  let consoleLogs = $state<string[]>([]);
  let consoleOpen = $state(false);
  let timer = $state(0);
  let toolCount = $state(0);
  let lastTool = $state('');
  let serversOpen = $state(false);

  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  // ── Provider singleton ─────────────────────────────────────────────────────
  const anthropicProvider = new AnthropicProvider({ proxyUrl: `${base}/api/chat` });

  // ── Gemma ──────────────────────────────────────────────────────────────────
  let gemmaProvider = $state<GemmaProvider | null>(null);
  let gemmaStatus = $state<'idle'|'loading'|'ready'|'error'>('idle');
  let gemmaProgress = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaLoadStart = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  function getProvider() {
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      if (!gemmaProvider) {
        gemmaProvider = new GemmaProvider({
          workerFactory: () => new Worker(new URL('@webmcp-auto-ui/agent/gemma-worker', import.meta.url), { type: 'module' }),
          model: canvas.llm,
          onProgress: (p, _s, loaded, total) => {
            gemmaProgress = p;
            if (loaded) gemmaLoadedMB = Math.round(loaded / 1048576 * 100) / 100;
            if (total) gemmaTotalMB = Math.round(total / 1048576 * 100) / 100;
          },
          onStatusChange: (s) => {
            gemmaStatus = s;
            if (s === 'loading') {
              gemmaLoadStart = Date.now();
              gemmaElapsed = 0;
              if (gemmaTimerInterval) clearInterval(gemmaTimerInterval);
              gemmaTimerInterval = setInterval(() => {
                gemmaElapsed = Math.floor((Date.now() - gemmaLoadStart) / 1000);
              }, 1000);
            }
            if (s === 'ready' || s === 'error') {
              if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
            }
          },
        });
      }
      return gemmaProvider;
    }
    anthropicProvider.setModel(canvas.llm as any);
    return anthropicProvider;
  }

  function unloadGemma() {
    (gemmaProvider as unknown as { destroy?: () => void })?.destroy?.();
    gemmaProvider = null;
    gemmaStatus = 'idle';
    gemmaProgress = 0;
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  }

  $effect(() => {
    const llm = canvas.llm;
    untrack(() => {
      if ((llm === 'gemma-e2b' || llm === 'gemma-e4b') && gemmaStatus === 'idle') {
        const p = getProvider();
        if (p instanceof GemmaProvider) p.initialize();
      }
    });
  });

  // ── Multi-MCP ──────────────────────────────────────────────────────────────
  let multiClient = $state<McpMultiClient>(new McpMultiClient());
  let connectedUrls = $state<string[]>([]);
  let loadingUrls = $state<string[]>([]);

  // Legacy single-server connect (from McpConnector)
  let mcpUrl = $state('');

  async function addMcpServer(url: string) {
    if (!url.trim()) return;
    loadingUrls = [...loadingUrls, url];
    canvas.setMcpConnecting(true);
    try {
      const opts = mcpToken.trim() ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } } : undefined;
      await multiClient.addServer(url.trim(), opts);
      connectedUrls = [...connectedUrls, url];
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);
    } catch (e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingUrls = loadingUrls.filter(u => u !== url);
      canvas.setMcpConnecting(false);
    }
  }

  async function removeMcpServer(url: string) {
    await multiClient.removeServer(url);
    connectedUrls = connectedUrls.filter(u => u !== url);
    if (multiClient.serverCount === 0) {
      canvas.setMcpConnected(false, '', []);
    } else {
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);
    }
  }

  async function addAllServers() {
    for (const server of MCP_DEMO_SERVERS) {
      if (!connectedUrls.includes(server.url)) {
        await addMcpServer(server.url);
      }
    }
  }

  async function connectMcp() {
    if (mcpUrl.trim()) await addMcpServer(mcpUrl.trim());
  }

  // ── Theme toggle ───────────────────────────────────────────────────────────
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('webmcp-theme', next); } catch {}
    const tokens = THEME_MAP[next as 'light'|'dark'];
    if (tokens) for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
  }

  // ── Agent ──────────────────────────────────────────────────────────────────
  async function sendMessage(msg: string) {
    const assistantId = uid();
    feed = [...feed,
      { kind: 'bubble', id: uid(), role: 'user', html: msg },
      { kind: 'bubble', id: assistantId, role: 'assistant', html: '...' },
    ];
    canvas.setGenerating(true);
    timer = 0; toolCount = 0; lastTool = '';
    const timerInterval = setInterval(() => timer++, 1000);
    try {
      const result = await runAgentLoop(msg, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider: getProvider(),
        maxTokens: 4096,
        cacheEnabled: true,
        initialMessages: trimConversationHistory(conversationHistory, 150_000),
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => {
            const block = canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data);
            blocks = [...blocks, { id: block.id, type, data }];
            feed = [...feed, { kind: 'block', id: block.id, type, data }];
          },
          onClear: () => { canvas.clearBlocks(); blocks = []; },
          onText: (text) => { feed = feed.map(f => f.id === assistantId ? { ...f, html: text } : f); },
          onToolCall: (call) => {
            toolCount++; lastTool = call.name;
            consoleLogs = [...consoleLogs, `[tool] ${call.name}`];
          },
        },
      });
      conversationHistory = result.messages;
    } finally {
      clearInterval(timerInterval);
      canvas.setGenerating(false);
    }
  }

  // ── HyperSkill ?hs= support ───────────────────────────────────────────────
  onMount(() => {
    const param = new URLSearchParams(window.location.search).get('hs');
    if (param) {
      canvas.loadFromParam(param);
      if (canvas.mcpUrl) addMcpServer(canvas.mcpUrl);
    }
  });
</script>

<svelte:head><title>Auto-UI template</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <span class="font-mono text-sm font-bold flex-shrink-0">
      Auto-UI <span class="text-accent">template</span>
    </span>
    <McpConnector compact url={mcpUrl} onurlchange={v => mcpUrl = v}
      token={mcpToken} onTokenChange={v => mcpToken = v}
      connecting={canvas.mcpConnecting} connected={canvas.mcpConnected}
      serverName={canvas.mcpName ?? ''} error=""
      onconnect={connectMcp}
      class="flex-1 min-w-0" />
    <LLMSelector value={canvas.llm} onchange={v => { canvas.llm = v as typeof canvas.llm; }} />
    <McpStatus connecting={canvas.mcpConnecting} connected={canvas.mcpConnected} name={canvas.mcpName ?? 'non connect\u00e9'} />
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex-shrink-0"
            onclick={() => serversOpen = !serversOpen}>MCP</button>
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex-shrink-0"
            onclick={toggleTheme} aria-label="Toggle theme">{'\u2600'}</button>
  </header>

  <!-- GEMMA LOADER -->
  <GemmaLoader
    status={gemmaStatus}
    progress={gemmaProgress}
    elapsed={gemmaElapsed}
    loadedMB={gemmaLoadedMB}
    totalMB={gemmaTotalMB}
    modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
    onunload={unloadGemma}
  />

  <!-- MAIN -->
  <div class="flex-1 flex overflow-hidden">

    <!-- MCP servers drawer -->
    {#if serversOpen}
      <div class="w-72 flex-shrink-0 border-r border-border bg-surface overflow-y-auto p-3">
        <RemoteMCPserversDemo
          servers={MCP_DEMO_SERVERS}
          {connectedUrls}
          loading={loadingUrls}
          onconnect={addMcpServer}
          onconnectall={addAllServers}
          ondisconnect={removeMcpServer}
        />
      </div>
    {/if}

    <!-- Canvas — blocks stack -->
    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {#each blocks as block (block.id)}
        <div class="block-anim">
          <BlockRenderer type={block.type} data={block.data} id={block.id} />
        </div>
      {/each}
    </div>

    <!-- Chat panel -->
    <div class="w-80 flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
      <ChatPanel
        {feed} bind:input generating={canvas.generating}
        {timer} toolCalls={toolCount} {lastTool}
        onsend={sendMessage}
        class="flex-1 min-h-0"
      />
    </div>

  </div>

  <!-- AGENT PROGRESS -->
  <AgentProgress
    active={canvas.generating}
    elapsed={timer}
    toolCalls={toolCount}
    lastTool={lastTool}
  />

  <!-- Agent console -->
  <AgentConsole logs={consoleLogs} bind:open={consoleOpen} />

</div>
