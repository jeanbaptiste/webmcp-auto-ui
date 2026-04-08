<script lang="ts">
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpClient } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, runAgentLoop, fromMcpTools, trimConversationHistory } from '@webmcp-auto-ui/agent';
  import type { ChatMessage } from '@webmcp-auto-ui/agent';
  import { McpConnector, LLMSelector, ChatPanel, AgentConsole, BlockRenderer } from '@webmcp-auto-ui/ui';
  import type { ChatFeedItem } from '@webmcp-auto-ui/ui';

  // ── State ──────────────────────────────────────────────────────────────────
  let input = $state('');
  let mcpClient = $state<McpClient | null>(null);
  let mcpUrl = $state('');
  let mcpToken = $state('');
  let conversationHistory = $state<ChatMessage[]>([]);
  let feed = $state<ChatFeedItem[]>([]);
  let blocks = $state<{ id: string; type: string; data: Record<string, unknown> }[]>([]);
  let consoleLogs = $state<string[]>([]);
  let consoleOpen = $state(false);
  let timer = $state(0);
  let toolCount = $state(0);
  let lastTool = $state('');

  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  // ── MCP ────────────────────────────────────────────────────────────────────
  async function connectMcp() {
    canvas.setMcpConnecting(true);
    try {
      const opts = mcpToken.trim() ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } } : undefined;
      const client = new McpClient(mcpUrl.trim(), opts);
      const init = await client.connect();
      const tools = await client.listTools();
      mcpClient = client;
      canvas.setMcpConnected(true, init.serverInfo.name, tools as Parameters<typeof canvas.setMcpConnected>[2]);
    } catch (e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
    } finally {
      canvas.setMcpConnecting(false);
    }
  }

  // ── Agent ──────────────────────────────────────────────────────────────────
  async function sendMessage(msg: string) {
    const assistantId = uid();
    feed = [...feed,
      { kind: 'bubble', id: uid(), role: 'user', html: msg },
      { kind: 'bubble', id: assistantId, role: 'assistant', html: '…' },
    ];
    canvas.setGenerating(true);
    timer = 0; toolCount = 0; lastTool = '';
    const timerInterval = setInterval(() => timer++, 1000);
    try {
      const result = await runAgentLoop(msg, {
        client: mcpClient ?? undefined,
        provider: new AnthropicProvider({ proxyUrl: `${base}/api/chat`, model: canvas.llm }),
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
  </header>

  <!-- MAIN -->
  <div class="flex-1 flex overflow-hidden">

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

  <!-- Agent console -->
  <AgentConsole logs={consoleLogs} bind:open={consoleOpen} />

</div>
