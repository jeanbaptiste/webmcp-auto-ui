<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { listSkills, encodeHyperSkill } from '@webmcp-auto-ui/sdk';
  import type { Skill, HyperSkill } from '@webmcp-auto-ui/sdk';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import {
    RemoteLLMProvider, WasmProvider, LocalLLMProvider, runAgentLoop, buildSystemPrompt,
    fromMcpTools, trimConversationHistory, summarizeChat, TokenTracker,
    buildToolsFromLayers, runDiagnostics, DiscoveryCache, ContextRAG,
  } from '@webmcp-auto-ui/agent';
  import type { ChatMessage, ToolLayer, McpLayer, BrowsableTool } from '@webmcp-auto-ui/agent';
  import { autoui } from '@webmcp-auto-ui/agent';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import {
    canvas2dServer, chartjsServer, cytoscapeServer, d3server,
    leafletServer, mapboxServer, mermaidServer, pixijsServer,
    plotlyServer, roughServer, threejsServer,
  } from '@webmcp-auto-ui/servers';
  import { McpStatus, GemmaLoader, AgentProgress, EphemeralBubble, TokenBubble, bus, layoutAdapter } from '@webmcp-auto-ui/ui';
  import { Menu, Terminal, LayoutGrid } from 'lucide-svelte';
  import FlexGrid from '$lib/FlexGrid.svelte';
  import HistoryModal from '$lib/HistoryModal.svelte';
  import SettingsDrawer from '$lib/SettingsDrawer.svelte';
  import RecipeBrowser from '$lib/RecipeBrowser.svelte';
  import ToolBrowser from '$lib/ToolBrowser.svelte';
  import LogDrawer from '$lib/LogDrawer.svelte';
  import DebugPanel from '$lib/DebugPanel.svelte';

  // ── State ─────────────────────────────────────────────────────────────
  let input = $state('');
  let inputHistory = $state<string[]>([]);
  let historyIndex = $state(-1);
  let savedInput = $state('');
  let mcpToken = $state('');
  let conversationHistory = $state<ChatMessage[]>([]);
  let historyLog = $state<{id:string; role:string; content:string; ts:Date}[]>([]);
  let ephemeral = $state<{id:string; role:'user'|'assistant'; html:string}[]>([]);
  let historyOpen = $state(false);
  let settingsOpen = $state(false);
  let chatTimer = $state(0);
  let chatToolCount = $state(0);
  let chatLastTool = $state('');
  let maxContextTokens = $state(120_000);
  let maxTokens = $state(4096);
  let cacheEnabled = $state(true);
  let schemaSanitize = $state(true);
  let schemaFlatten = $state(false);
  let schemaStrict = $state(false);
  let temperature = $state(1.0);
  let topK = $state(64);
  let maxTools = $state(8);
  let maxResultLength = $state(10000);
  let truncateResults = $state(false);
  let compressHistory = $state(false);
  let compressPreview = $state(500);
  let systemPrompt = $state('');
  let localUrl = $state('http://localhost:11434');
  let localModel = $state('');
  let composerMode = $state(true); // true = composer, false = consumer
  let layoutMode = $state<'float' | 'grid'>('float');
  let recipeBrowserOpen = $state(false);
  let recipeBrowserFilter = $state('');
  let toolBrowserOpen = $state(false);
  let toolBrowserFilter = $state('');
  let skills = $state<Skill[]>([]);

  // ── WebMCP servers (additional visualization packs) ─────────────
  const SERVER_REGISTRY: { id: string; label: string; description: string; server: WebMcpServer }[] = [
    { id: 'autoui', label: 'Auto-UI (natif)', description: 'Widgets natifs WebMCP (stat, table, galerie, timeline...)', server: autoui },
    { id: 'canvas2d', label: 'Canvas 2D', description: 'Dessins et animations Canvas 2D', server: canvas2dServer },
    { id: 'chartjs', label: 'Chart.js', description: 'Graphiques interactifs Chart.js (bar, line, pie, radar...)', server: chartjsServer },
    { id: 'cytoscape', label: 'Cytoscape', description: 'Graphes et reseaux (nodes, edges, layouts)', server: cytoscapeServer },
    { id: 'd3', label: 'D3.js', description: 'Visualisations D3.js avancees (treemap, force, chord...)', server: d3server },
    { id: 'leaflet', label: 'Leaflet', description: 'Cartes interactives Leaflet (markers, GeoJSON, heatmap)', server: leafletServer },
    { id: 'mapbox', label: 'Mapbox GL', description: 'Cartes 3D Mapbox GL (terrain, buildings, satellite)', server: mapboxServer },
    { id: 'mermaid', label: 'Mermaid', description: 'Diagrammes Mermaid (flowchart, sequence, gantt...)', server: mermaidServer },
    { id: 'pixijs', label: 'PixiJS', description: 'Rendus PixiJS haute performance (sprites, particles)', server: pixijsServer },
    { id: 'plotly', label: 'Plotly', description: 'Graphiques scientifiques Plotly (scatter, 3D, contour...)', server: plotlyServer },
    { id: 'rough', label: 'Rough.js', description: 'Dessins style croquis (hand-drawn look)', server: roughServer },
    { id: 'threejs', label: 'Three.js', description: 'Scenes 3D Three.js (mesh, lights, animations)', server: threejsServer },
  ];
  let enabledServers = $state(new Set<string>(['autoui']));
  let activeServers = $derived<WebMcpServer[]>(
    SERVER_REGISTRY.filter(s => enabledServers.has(s.id)).map(s => s.server)
  );

  // ── Nano-RAG (experimental, off by default) ──────────────────────
  let contextRAGEnabled = $state(false);
  let ragResidueSize = $state(200);
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

  // FlexGrid ref
  let flexGrid: { addBlock: (type: string, data: Record<string, unknown>, server?: string, component?: string) => { id: string }; clearBlocks: () => void; syncFromCanvas: () => void } | undefined;

  // ── Widget interaction → LLM pipeline ─────────────────────────────
  const INTERACTIVE_ACTIONS = new Set(['click', 'select', 'submit', 'itemclick', 'rowclick', 'cardclick', 'eventclick', 'personclick', 'groupclick', 'cellclick', 'imageclick', 'slidechange']);
  let lastInteractionTs = $state(0);
  let interactionPending = $state(false);
  const INTERACTION_DEBOUNCE_MS = 500;

  function handleWidgetInteraction(widgetId: string, widgetType: string, action: string, payload: unknown) {
    // Only allow interactive actions (no update/remove to avoid loops)
    if (!INTERACTIVE_ACTIONS.has(action)) return;
    // Debounce
    const now = Date.now();
    if (now - lastInteractionTs < INTERACTION_DEBOUNCE_MS) return;
    // Ignore if LLM is already processing
    if (canvas.generating || interactionPending) return;
    lastInteractionTs = now;

    // Build a descriptive message for the LLM
    const p = payload as Record<string, unknown> | null;
    const label = p?.name ?? p?.title ?? p?.label ?? p?.item ?? 'un element';
    const msg = `[Interaction widget] L'utilisateur a clique sur "${label}" dans le widget ${widgetType} (id: ${widgetId}). Action: ${action}. Donnees: ${JSON.stringify(payload)}`;

    // Inject into conversation and rerun agent loop
    interactionPending = true;
    sendMessage(msg).finally(() => { interactionPending = false; });
  }

  // ── Token tracking ─────────────────────────────────────────────────
  const tokenTracker = new TokenTracker();
  let tokenMetrics = $state(tokenTracker.metrics);
  let showTokens = $state(true);
  let showToolJSON = $state(false);
  let showPipelineTrace = $state(false);
  let lastLoggedToolCount = $state(0);
  tokenTracker.subscribe(m => { tokenMetrics = m; });

  let agentLogs = $state<{ ts: number; type: string; detail: string; ctxSize?: number }[]>([]);
  let abortController = $state<AbortController | null>(null);
  let exportCopied = $state(false);
  let exportState = $state<'idle' | 'loading' | 'done'>('idle');
  let exportedUrl = $state('');
  let exportModalOpen = $state(false);
  let exportedBlockSummary = $state<{count: number; types: string[]}>({count: 0, types: []});
  let includeSummary = $state(true);
  let allToolsUsed = $state<string[]>([]);

  // ── Multi-MCP ─────────────────────────────────────────────────────
  let multiClient = $state<McpMultiClient>(new McpMultiClient());
  let connectedUrls = $state<string[]>([]);
  let loadingUrls = $state<string[]>([]);
  /** Single discovery cache shared between UI and agent loop */
  const discoveryCache = new DiscoveryCache();
  let cacheVersion = $state(0);

  /** Merged recipes from discovery cache, with duplicate-name prefixing and serverUrl mapping */
  const mcpRecipes = $derived.by(() => {
    cacheVersion; // reactivity trigger
    const all = discoveryCache.allRecipes();
    const servers = multiClient.listServers();
    const nameToUrl = new Map(servers.map(s => [s.name, s.url]));
    const nameCounts = new Map<string, number>();
    for (const r of all) nameCounts.set(r.name, (nameCounts.get(r.name) ?? 0) + 1);
    return all.map(r => {
      const serverUrl = r.server ? nameToUrl.get(r.server) : undefined;
      const needsPrefix = (nameCounts.get(r.name) ?? 0) > 1 && r.server;
      return {
        ...r,
        originalName: r.name,
        name: needsPrefix ? `${r.server}: ${r.name}` : r.name,
        serverName: r.server,
        serverUrl,
      };
    });
  });

  // ── Tool call details for tooltips ──────────────────────────────────
  interface ToolCallDetail {
    name: string;
    args: Record<string, unknown>;
    result?: string;
    error?: string;
    elapsed?: number;
  }
  let toolCallDetails = $state<Map<string, ToolCallDetail>>(new Map());

  async function addMcpServer(url: string) {
    if (!url.trim()) return;
    loadingUrls = [...loadingUrls, url];
    canvas.setMcpConnecting(true);
    try {
      const opts = mcpToken.trim() ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } } : undefined;
      const { tools } = await multiClient.addServer(url.trim(), opts);
      connectedUrls = [...connectedUrls, url];
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);

      // Register server tools + recipes in the discovery cache
      const server = multiClient.listServers().find(s => s.url === url.trim());
      const serverName = server?.name ?? url.trim();
      const cacheTools = (server?.tools ?? []).map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema ?? t.input_schema,
      }));

      let cacheRecipes: any[] = [];
      if (tools.some(t => t.name === 'list_recipes')) {
        try {
          const r = await multiClient.callToolOn(url.trim(), 'list_recipes', {});
          const text = r.content?.find((c: any) => c.type === 'text') as any;
          if (text?.text) {
            const parsed = JSON.parse(text.text);
            cacheRecipes = Array.isArray(parsed) ? parsed : (parsed?.recipes ?? []);
          }
        } catch { /* no recipes */ }
      }
      discoveryCache.register(serverName, { recipes: cacheRecipes, tools: cacheTools });
      cacheVersion++;
    } catch(e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingUrls = loadingUrls.filter(u => u !== url);
      canvas.setMcpConnecting(false);
    }
  }

  async function removeMcpServer(url: string) {
    const server = multiClient.listServers().find(s => s.url === url);
    await multiClient.removeServer(url);
    connectedUrls = connectedUrls.filter(u => u !== url);
    // Clear recipes/tools for the disconnected server
    if (server) {
      discoveryCache.register(server.name, { recipes: [], tools: [] });
      cacheVersion++;
    }
    if (multiClient.serverCount === 0) {
      canvas.setMcpConnected(false, '', []);
    } else {
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);
    }
  }

  async function addAllServers() {
    const { MCP_DEMO_SERVERS } = await import('@webmcp-auto-ui/sdk');
    for (const server of MCP_DEMO_SERVERS) {
      if (!connectedUrls.includes(server.url)) await addMcpServer(server.url);
    }
  }

  // ── Gemma ──────────────────────────────────────────────────────────
  let gemmaProvider = $state<WasmProvider | null>(null);
  let gemmaStatus = $state<'idle'|'loading'|'ready'|'error'>('idle');
  let gemmaProgress = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaLoadStart = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  const anthropicProvider = new RemoteLLMProvider({ proxyUrl: `${base}/api/chat` });

  function getProvider() {
    if (canvas.llm === 'local') {
      return new LocalLLMProvider({ baseUrl: localUrl, model: localModel || 'llama3.2' });
    }
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      if (gemmaProvider && gemmaProvider.model !== canvas.llm) unloadGemma();
      if (!gemmaProvider) {
        const wasmContext = Math.min(maxContextTokens, 32768);
        gemmaProvider = new WasmProvider({
          model: canvas.llm,
          contextSize: wasmContext,
          onProgress: (p, _s, loaded, total) => {
            gemmaProgress = p * 100;
            if (loaded) gemmaLoadedMB = Math.round(loaded / 1048576 * 100) / 100;
            if (total) gemmaTotalMB = Math.round(total / 1048576 * 100) / 100;
          },
          onStatusChange: (s) => {
            gemmaStatus = s;
            if (s === 'loading') {
              gemmaLoadStart = Date.now();
              gemmaElapsed = 0;
              if (gemmaTimerInterval) clearInterval(gemmaTimerInterval);
              gemmaTimerInterval = setInterval(() => { gemmaElapsed = Math.floor((Date.now() - gemmaLoadStart) / 1000); }, 1000);
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
        if (p instanceof WasmProvider) p.initialize();
      }
    });
  });


  // Smart defaults: sanitize ON for Claude/local, flatten ON for Gemma/local
  $effect(() => {
    const isGemma = canvas.llm.startsWith('gemma');
    const isE4B = canvas.llm === 'gemma-e4b';
    const isLocal = canvas.llm === 'local';
    schemaSanitize = isLocal ? true : !isGemma;
    schemaFlatten = isGemma || isLocal;
    truncateResults = isGemma || isLocal;
    compressHistory = isGemma || isLocal;
    schemaStrict = false;
    if (isGemma) {
      maxResultLength = 2000;
      ragResidueSize = 500;
      temperature = 0.7;
      topK = 40;
      maxContextTokens = isE4B ? 16384 : 8192;
      cacheEnabled = false;
    } else if (isLocal) {
      maxResultLength = 3000;
      ragResidueSize = 300;
    } else {
      // Claude defaults
      maxResultLength = 10000;
      ragResidueSize = 200;
      temperature = 1.0;
      topK = 64;
      maxContextTokens = 120_000;
      cacheEnabled = true;
    }
  });

  // ── Layers & prompt ────────────────────────────────────────────────
  const layers = $derived.by((): ToolLayer[] => {
    cacheVersion; // reactivity trigger for discoveryCache changes
    const result: ToolLayer[] = [];
    if (canvas.mcpConnected) {
      for (const server of multiClient.listServers()) {
        const serverRecipes = discoveryCache.recipesFor(server.name);
        result.push({
          protocol: 'mcp',
          serverName: server.name,
          tools: fromMcpTools(server.tools as Parameters<typeof fromMcpTools>[0]),
          recipes: serverRecipes.length > 0 ? serverRecipes : undefined,
        } as McpLayer);
      }
    }
    // Add enabled WebMCP server layers (includes autoui when checked)
    for (const entry of SERVER_REGISTRY) {
      if (enabledServers.has(entry.id)) {
        result.push(entry.server.layer());
      }
    }
    return result;
  });

  const effectivePrompt = $derived.by(() => {
    const base = buildSystemPrompt(layers);
    // If the user customised the prompt in settings, prepend it
    const hasCustom = systemPrompt && systemPrompt.trim().length > 0;
    return hasCustom ? `${systemPrompt}\n\n${base}` : base;
  });

  const providerTools = $derived(buildToolsFromLayers(layers, { sanitize: schemaSanitize, flatten: schemaFlatten, strict: schemaStrict }).tools);

  // Sync WebMCP layers into discovery cache
  $effect(() => {
    for (const layer of layers) {
      if (layer.protocol === 'webmcp' && !discoveryCache.has(layer.serverName)) {
        const webmcpTools = layer.tools.map(t => ({ name: t.name, description: (t as any).description, inputSchema: (t as any).inputSchema }));
        discoveryCache.register(layer.serverName, {
          recipes: (layer.recipes ?? []) as any,
          tools: webmcpTools,
        });
        cacheVersion++;
      }
    }
  });

  const browsableTools = $derived.by((): BrowsableTool[] => {
    cacheVersion; // reactivity trigger
    return discoveryCache.allTools();
  });
  const toolCountByServer = $derived.by(() => {
    cacheVersion; // reactivity trigger
    return Object.fromEntries(
      multiClient.listServers().map(s => [s.url, discoveryCache.toolCount(s.name)])
    );
  });
  const recipeCountByServer = $derived.by(() => {
    cacheVersion; // reactivity trigger
    return Object.fromEntries(
      multiClient.listServers().map(s => [s.url, discoveryCache.recipeCount(s.name)])
    );
  });
  const diagnostics = $derived(runDiagnostics(layers, providerTools, effectivePrompt ?? '', { sanitize: schemaSanitize, flatten: schemaFlatten, strict: schemaStrict }));

  // ── Helpers ────────────────────────────────────────────────────────
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function pushHistory(role: string, content: string) {
    historyLog = [...historyLog, { id: uid(), role, content, ts: new Date() }];
  }
  function updateEphemeral(id: string, html: string) {
    ephemeral = ephemeral.map(e => e.id === id ? { ...e, html } : e);
  }

  // ── HyperSkill export ─────────────────────────────────────────────
  async function exportHsUrl() {
    if (exportState === 'loading') return;
    exportState = 'loading';
    try {
      canvas.setEnabledServers([...enabledServers]);
      const skill = canvas.buildSkillJSON() as Record<string, unknown>;
      if (includeSummary && conversationHistory.length > 0) {
        try {
          const result = await summarizeChat({
            messages: conversationHistory, provider: getProvider(),
            toolsUsed: allToolsUsed, toolCallCount: chatToolCount,
            mcpServers: multiClient.listServers().map(s => ({ name: s.name, url: s.url })),
            skillsReferenced: skills.map(s => s.name),
          });
          skill.chatSummary = result.chatSummary;
          skill.provenance = result.provenance;
        } catch { /* don't block export */ }
      }
      const url = await encodeHyperSkill(skill as unknown as HyperSkill, window.location.origin + base);
      await navigator.clipboard.writeText(url);
      exportedUrl = url;
      // Build block summary
      const blocks = canvas.blocks;
      const typeSet = new Set(blocks.map(b => b.type));
      exportedBlockSummary = { count: blocks.length, types: [...typeSet] };
      exportState = 'done';
      exportCopied = true;
      // Open modal
      exportModalOpen = true;
      setTimeout(() => { exportState = 'idle'; exportCopied = false; }, 3000);
    } catch {
      exportState = 'idle';
    }
  }

  // ── Agent ──────────────────────────────────────────────────────────
  async function sendMessage(msg: string) {
    if (!msg.trim() || canvas.generating) return;

    // Intercept "clear" command — handle locally without sending to LLM.
    // If sent to the LLM, it calls canvas clear then re-creates the widgets
    // from the conversation history still visible in its context.
    if (msg.trim().toLowerCase() === 'clear') {
      clearAll();
      input = '';
      return;
    }

    // Push to input history (limit 50)
    inputHistory = [...inputHistory.slice(-(49)), msg.trim()];
    historyIndex = -1;
    savedInput = '';
    input = '';
    ephemeral = [];
    allToolsUsed = [];
    agentLogs = [];
    toolCallDetails = new Map();
    pushHistory('user', msg);
    const userId = uid();
    ephemeral = [...ephemeral, { id: userId, role: 'user', html: msg }];
    const assistantId = uid();
    ephemeral = [...ephemeral, { id: assistantId, role: 'assistant', html: '...' }];

    canvas.setGenerating(true);
    chatTimer = 0; chatToolCount = 0; chatLastTool = '';
    let lastLoggedTextLen = 0;
    const timerInterval = setInterval(() => chatTimer++, 1000);
    abortController = new AbortController();

    // Resolve server name for provenance
    const currentServerName = canvas.mcpName ?? '';
    let result: Awaited<ReturnType<typeof runAgentLoop>> | null = null;

    try {
      result = await runAgentLoop(msg, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider: getProvider(),
        systemPrompt: effectivePrompt || undefined,
        maxIterations: 15, maxTokens, maxTools, maxResultLength, temperature, topK, cacheEnabled,
        truncateResults, compressHistory: compressHistory ? compressPreview : false,
        signal: abortController!.signal,
        initialMessages: trimConversationHistory(conversationHistory, maxContextTokens),
        layers,
        discoveryCache,
        contextRAG: contextRAG ?? undefined,
        ragResidueSize,
        schemaOptions: {
          sanitize: schemaSanitize,
          flatten: schemaFlatten,
          strict: schemaStrict,
        },
        callbacks: {
          onIterationStart: (i, max) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'iteration', detail: `Iteration ${i}/${max}` }];
            if (i === 1) {
              // Log the system prompt on first iteration
              agentLogs = [...agentLogs, { ts: Date.now(), type: 'prompt', detail: effectivePrompt ?? '(none)' }];
            }
          },
          onLLMRequest: (messages, tools) => {
            const ctxChars = messages.reduce((sum, m) => {
              if (typeof m.content === 'string') return sum + m.content.length;
              return sum + (m.content as any[]).reduce((s, b) => s + (b.text?.length ?? JSON.stringify(b).length ?? 0), 0);
            }, 0);
            const ctxTokens = Math.round(ctxChars / 4);
            const sanitizeLabel = schemaSanitize ? 'ON' : 'OFF';
            const flattenLabel = schemaFlatten ? 'ON' : 'OFF';
            const strictLabel = schemaStrict ? 'ON' : 'OFF';
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'request', detail: `${messages.length} messages, ${tools.length} tools (sanitize=${sanitizeLabel}, flatten=${flattenLabel}, strict=${strictLabel})`, ctxSize: ctxTokens }];
            // Log tool schemas on first call or when tool count changes (server activation)
            if (tools.length !== lastLoggedToolCount) {
              lastLoggedToolCount = tools.length;
              for (const tool of tools) {
                const props = (tool.input_schema as any)?.properties as Record<string, { type?: string }> | undefined;
                const summary = props
                  ? Object.entries(props).map(([k, v]) => `${k}: ${v.type ?? '?'}`).join(', ')
                  : '(no schema)';
                agentLogs = [...agentLogs, { ts: Date.now(), type: 'schema', detail: `${tool.name}: {${summary}}` }];
              }
            }
          },
          onLLMResponse: (response, latencyMs, tokens) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'response', detail: `${tokens?.input ?? '?'}in ${tokens?.output ?? '?'}out, ${Math.round(latencyMs)}ms, ${response.stopReason}`, ctxSize: tokens?.input }];
            if (response.usage) tokenTracker.record(response.usage, latencyMs, canvas.llm?.startsWith('gemma') ?? false);
            else if (response.stats) tokenTracker.recordEstimate(0, response.stats.totalTokens * 4, latencyMs);
          },
          onWidget: (type, data, serverName) => {
                // Use serverName from the agent loop (WebMCP server that produced the widget),
                // fall back to currentServerName (external MCP) if not set.
                const provServer = serverName || currentServerName || undefined;
                const widget = flexGrid?.addBlock(type, data, provServer, type);
                return widget ? { id: widget.id } : undefined;
              },
          onClear: () => { flexGrid?.clearBlocks(); conversationHistory = []; },
          onUpdate: (id, data) => bus.send('agent', id, 'data-update', data),
          onMove: (id, x, y) => layoutAdapter.move(id, x, y),
          onResize: (id, w, h) => layoutAdapter.resize(id, w, h),
          onStyle: (id, styles) => layoutAdapter.style(id, styles),
          onTrace: (message) => {
            if (showPipelineTrace) {
              agentLogs = [...agentLogs, { ts: Date.now(), type: 'trace', detail: message }];
            }
          },
          onToken: () => {},
          onText: (text) => {
            if (text) {
              // Log text updates every ~50 chars to avoid spam
              if (text.length < 50 || text.length - lastLoggedTextLen > 50) {
                lastLoggedTextLen = text.length;
                agentLogs = [...agentLogs, { ts: Date.now(), type: 'text', detail: text }];
              }
              // Strip Gemma tool call tags from ephemeral display
              const clean = text.replace(/<\|tool_call>[\s\S]*?(<tool_call\|>)?/g, '').replace(/<\|tool_response>[\s\S]*?(<tool_response\|>)?/g, '').replace(/<\|"\|>/g, '').trim();
              if (clean) updateEphemeral(assistantId, clean);
            }
          },
          onToolCall: (call) => {
            chatToolCount++; chatLastTool = call.name;
            allToolsUsed = [...allToolsUsed, call.name];
            const tag = call.guided ? '[recette]' : '[impro]';
            const argsJson = JSON.stringify(call.args, null, 2);
            const resultFull = call.result ?? call.error ?? '';
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'tool', detail: `${tag} ${call.name}(${argsJson}) -> ${resultFull} [${call.elapsed ?? '?'}ms]` }];
            // Store full details for tooltip
            const callId = `tc_${Date.now()}_${chatToolCount}`;
            const detail: ToolCallDetail = {
              name: call.name,
              args: call.args ?? {},
              result: call.result,
              error: call.error,
              elapsed: call.elapsed,
            };
            const nextDetails = new Map(toolCallDetails);
            nextDetails.set(callId, detail);
            toolCallDetails = nextDetails;
            updateEphemeral(assistantId, `<strong>${call.name}</strong>`);
          },
          onDone: (metrics) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'done', detail: `${metrics.iterations} iter, ${metrics.toolCalls} tools, ${metrics.totalTokens} tokens, ${Math.round(metrics.totalLatencyMs)}ms` }];
          },
        },
      });
      if (result) {
        conversationHistory = result.messages;
        if (result.text) { updateEphemeral(assistantId, result.text); pushHistory('assistant', result.text); }
      }
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updateEphemeral(assistantId, errMsg);
      pushHistory('system', errMsg);
    } finally {
      clearInterval(timerInterval);
      abortController = null;
      canvas.setGenerating(false);
      // Keep ephemeral visible longer if no blocks were rendered (text-only response)
      const hasBlocks = result?.toolCalls?.some(c => c.name === 'autoui_webmcp_widget_display' || c.name?.startsWith('render_'));
      setTimeout(() => { ephemeral = []; }, hasBlocks ? 3000 : 15000);
    }
  }

  function clearAll() {
    flexGrid?.clearBlocks();
    conversationHistory = [];
    historyLog = [];
    ephemeral = [];
    agentLogs = [];
    toolCallDetails = new Map();
    allToolsUsed = [];
    chatToolCount = 0;
    chatLastTool = '';
    chatTimer = 0;
    tokenTracker.reset();
    tokenMetrics = tokenTracker.metrics;
    lastLoggedToolCount = 0;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); return; }
    if (e.key === 'ArrowUp' && inputHistory.length > 0) {
      e.preventDefault();
      if (historyIndex === -1) {
        savedInput = input;
        historyIndex = inputHistory.length - 1;
      } else if (historyIndex > 0) {
        historyIndex--;
      }
      input = inputHistory[historyIndex];
      return;
    }
    if (e.key === 'ArrowDown' && historyIndex !== -1) {
      e.preventDefault();
      historyIndex++;
      if (historyIndex >= inputHistory.length) {
        historyIndex = -1;
        input = savedInput;
      } else {
        input = inputHistory[historyIndex];
      }
      return;
    }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('webmcp-theme', next); } catch {}
    import('@webmcp-auto-ui/ui').then(({ THEME_MAP }) => {
      const tokens = THEME_MAP[next as 'light'|'dark'];
      if (tokens) for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
    });
  }

  onMount(() => {
    const param = new URLSearchParams(window.location.search).get('hs');
    if (param) {
      canvas.loadFromParam(param).then((ok) => {
        if (!ok) return;
        // Restore enabled servers from skill data
        if (canvas.enabledServerIds.length > 0) {
          enabledServers = new Set(canvas.enabledServerIds);
        }
        // Sync FlexGrid windows from canvas blocks already loaded into the store
        flexGrid?.syncFromCanvas();
        if (canvas.mcpUrl) addMcpServer(canvas.mcpUrl);
      });
    }
    skills = listSkills();
  });

  onDestroy(() => {
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  });
</script>

<svelte:head><title>Auto-UI flex</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <button class="flex items-center gap-2 text-text2 hover:text-text1 transition-colors flex-shrink-0"
            onclick={() => settingsOpen = true} aria-label="Settings">
      <Menu size={18} />
      <span class="font-mono text-sm font-bold">
        <span class="text-text1">Auto-UI</span> <span class="text-accent">flex</span>
      </span>
    </button>
    <TokenBubble metrics={tokenMetrics} {maxContextTokens} visible={showTokens && composerMode} />
    <div class="flex-1"></div>

    {#if composerMode}
      <button class="flex items-center h-7 px-1.5 rounded border transition-all flex-shrink-0
                     {layoutMode === 'grid' ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
              onclick={() => layoutMode = layoutMode === 'float' ? 'grid' : 'float'}
              aria-label="Toggle layout" title={layoutMode === 'grid' ? 'Vue grille' : 'Vue flottante'}>
        <LayoutGrid size={14} />
      </button>
    {/if}
    <McpStatus
      connecting={canvas.mcpConnecting}
      connected={canvas.mcpConnected}
      name={canvas.mcpName ?? 'not connected'}
      servers={multiClient.listServers().map(s => ({ url: s.url, name: s.name, toolCount: s.tools.length }))}
      onclick={() => { recipeBrowserOpen = true; recipeBrowserFilter = ''; }}
    />
    {#if gemmaStatus === 'ready'}
      <span class="font-mono text-[10px] text-teal flex items-center gap-1 flex-shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-teal"></span>
        {({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
      </span>
    {/if}
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex-shrink-0"
            onclick={toggleTheme} aria-label="Toggle theme">*</button>
  </header>

  <!-- GEMMA LOADER -->
  {#if gemmaStatus === 'loading' || gemmaStatus === 'error'}
    <GemmaLoader
      status={gemmaStatus} progress={gemmaProgress} elapsed={gemmaElapsed}
      loadedMB={gemmaLoadedMB} totalMB={gemmaTotalMB}
      modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
      onunload={unloadGemma}
    />
  {/if}

  <!-- CANVAS + EPHEMERAL -->
  <div class="flex-1 relative overflow-hidden">
    <FlexGrid bind:this={flexGrid} class="w-full h-full" {layoutMode} servers={activeServers} oninteract={handleWidgetInteraction} />

    {#if composerMode}
      <div class="absolute bottom-3 left-[50px] right-[50px] flex flex-col gap-2 pointer-events-none z-20">
        <EphemeralBubble {ephemeral} />
      </div>
    {/if}
  </div>

  <!-- LOG DRAWER (bottom, resizable) -->
  {#if composerMode}
    <LogDrawer open={showToolJSON} logs={agentLogs} onclear={() => agentLogs = []} />
  {/if}

  <!-- AGENT PROGRESS -->
  {#if composerMode}
    <AgentProgress active={canvas.generating} elapsed={chatTimer} toolCalls={chatToolCount} lastTool={chatLastTool} />
  {/if}

  <!-- INPUT BAR (composer only) -->
  {#if composerMode}
    <div class="flex-shrink-0 px-[50px] py-4 bg-surface border-t border-border">
      <div class="flex gap-2 items-center">
        <button
          class="relative flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border transition-colors
                 {showToolJSON ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
          onclick={() => showToolJSON = !showToolJSON}
          aria-label="Toggle logs">
          <Terminal size={14} />
          {#if canvas.generating && agentLogs.length > 0}
            <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal"></span>
          {/if}
        </button>
        <input type="text" bind:value={input} onkeydown={onKeydown}
          placeholder={canvas.mcpConnected ? `Ask for a UI about ${canvas.mcpName}...` : 'Open the menu to connect an MCP server...'}
          disabled={canvas.generating}
          class="flex-1 bg-surface2 border border-border2 rounded-xl px-5 py-3 text-sm font-mono text-text1
                 outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed" />
        {#if canvas.generating}
          <button class="px-4 py-3 rounded-xl bg-accent2/10 border border-accent2/30 text-accent2 font-mono text-sm hover:bg-accent2/20 transition-colors flex-shrink-0"
                  onclick={() => abortController?.abort()}>
            Stop
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- SETTINGS DRAWER -->
<!-- onconnect closure: safe because setMcpUrl is synchronous, so canvas.mcpUrl is always current -->
<SettingsDrawer
  bind:open={settingsOpen}
  bind:composerMode bind:layoutMode bind:includeSummary
  onexport={exportHsUrl} {exportState} onhistory={() => historyOpen = true} onclear={clearAll}
  bind:mcpToken bind:systemPrompt {effectivePrompt} bind:maxTokens bind:maxContextTokens bind:maxTools bind:maxResultLength
  bind:cacheEnabled bind:temperature bind:topK bind:showTokens bind:showToolJSON bind:showPipelineTrace
  bind:schemaSanitize bind:schemaFlatten bind:schemaStrict bind:compressHistory bind:compressPreview
  bind:contextRAGEnabled bind:ragResidueSize
  bind:localUrl bind:localModel
  onconnect={() => addMcpServer(canvas.mcpUrl)}
  {connectedUrls} {loadingUrls}
  onaddserver={addMcpServer} onaddall={addAllServers} onremoveserver={removeMcpServer}
  {mcpRecipes}
  webmcpRecipes={layers.find(l => l.protocol === 'webmcp')?.recipes ?? []}
  onbrowserecipes={() => { settingsOpen = false; recipeBrowserOpen = true; recipeBrowserFilter = ''; }}
  {recipeCountByServer}
  onrecipeclick={(url) => { settingsOpen = false; recipeBrowserOpen = true; recipeBrowserFilter = multiClient.listServers().find(s => s.url === url)?.name ?? ''; }}
  {toolCountByServer}
  ontoolclick={(url) => { settingsOpen = false; toolBrowserOpen = true; const srv = multiClient.listServers().find(s => s.url === url); toolBrowserFilter = srv?.name ?? ''; }}
  {diagnostics}
  serverRegistry={SERVER_REGISTRY.map(s => ({ id: s.id, label: s.label, description: s.description, widgetCount: s.server.listWidgets().length }))}
  bind:enabledServers
/>

<!-- EXPORT MODAL -->
{#if exportModalOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-10"
       onclick={(e) => { if (e.target === e.currentTarget) exportModalOpen = false; }}>
    <div class="w-full max-w-xl bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
      <div class="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        <span class="font-mono text-sm font-bold text-text1">HyperSkill exported</span>
        <div class="flex-1"></div>
        <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                onclick={() => exportModalOpen = false}>x</button>
      </div>
      <div class="flex flex-col gap-4 p-6">
        <p class="font-mono text-xs text-text2 leading-relaxed">
          This HyperSkill contains your widgets, settings, and conversation summary.
          Share this link so others can reproduce your session.
        </p>
        <div class="bg-surface2 border border-border2 rounded-lg p-3 break-all">
          <a href={exportedUrl} target="_blank" rel="noopener"
             class="font-mono text-[11px] text-accent hover:underline">{exportedUrl}</a>
        </div>
        {#if exportedBlockSummary.count > 0}
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono text-[10px] text-text2">{exportedBlockSummary.count} widget{exportedBlockSummary.count > 1 ? 's' : ''} inclus :</span>
            {#each exportedBlockSummary.types as t}
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-accent/30 text-accent bg-accent/5">{t}</span>
            {/each}
          </div>
        {/if}
        <button class="font-mono text-xs h-8 px-4 rounded-lg border border-accent text-accent hover:bg-accent/10 transition-colors self-end"
                onclick={async () => { await navigator.clipboard.writeText(exportedUrl); }}>
          Copier le lien
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- HISTORY MODAL -->
<HistoryModal bind:open={historyOpen} messages={historyLog} />

<!-- DEBUG PANEL (Ctrl+Shift+D) -->
<DebugPanel prompt={effectivePrompt} {layers} />

<!-- RECIPE BROWSER -->
<RecipeBrowser bind:open={recipeBrowserOpen} {mcpRecipes} webmcpRecipes={layers.find(l => l.protocol === 'webmcp')?.recipes ?? []} initialFilter={recipeBrowserFilter} {multiClient} />
<ToolBrowser bind:open={toolBrowserOpen} tools={browsableTools} initialFilter={toolBrowserFilter} />
