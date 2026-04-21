<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { listSkills, encodeHyperSkill } from '@webmcp-auto-ui/sdk';
  import type { Skill, HyperSkill, RecipeData } from '@webmcp-auto-ui/sdk';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import {
    RemoteLLMProvider, WasmProvider, TransformersProvider, LocalLLMProvider, runAgentLoop, buildSystemPrompt,
    fromMcpTools, trimConversationHistory, summarizeChat, TokenTracker,
    buildToolsFromLayers, runDiagnostics, DiscoveryCache, DISCOVERY_TOOL_NAMES, ContextRAG,
    buildGemmaPrompt,
    createTraceObserver,
    TRANSFORMERS_MODELS,
  } from '@webmcp-auto-ui/agent';
  import type { ChatMessage, ContentBlock, ToolLayer, McpLayer, BrowsableTool, TraceObserver } from '@webmcp-auto-ui/agent';
  import { autoui } from '@webmcp-auto-ui/agent';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import {
    canvas2dServer, chartjsServer, cytoscapeServer, d3server,
    leafletServer, mermaidServer, pixijsServer,
    plotlyServer, roughServer, threejsServer,
  } from '@webmcp-auto-ui/servers';
  import { McpStatus, ModelLoader, AgentProgress, EphemeralBubble, TokenBubble, bus, layoutAdapter } from '@webmcp-auto-ui/ui';
  import { Menu, Terminal, LayoutGrid, Paperclip, X as XIcon } from 'lucide-svelte';
  import FlexGrid from '$lib/FlexGrid.svelte';
  import HistoryModal from '$lib/HistoryModal.svelte';
  import SettingsDrawer from '$lib/SettingsDrawer.svelte';
  import RecipeBrowser from '$lib/RecipeBrowser.svelte';
  import RecipeModal from '$lib/RecipeModal.svelte';
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
  let schemaFlatten = $state(false);
  let schemaStrict = $state(false);
  let temperature = $state(1.0);
  let topK = $state(64);
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

  // ── Vision input (image attachment for VLM models) ─────────────────
  let attachedImage = $state<{ dataUrl: string; mediaType: string; name: string } | null>(null);
  let fileInputEl: HTMLInputElement | null = $state(null);
  const isVisionModel = $derived.by(() => {
    const id = canvas.llm;
    if (!id || !id.startsWith('transformers-')) return false;
    const entry = TRANSFORMERS_MODELS[id as keyof typeof TRANSFORMERS_MODELS];
    return entry?.vision === true;
  });

  function onImagePicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      attachedImage = {
        dataUrl: String(reader.result),
        mediaType: file.type || 'image/png',
        name: file.name,
      };
    };
    reader.readAsDataURL(file);
    // reset so the same file can be picked again later
    input.value = '';
  }

  // ── WebMCP servers (additional visualization packs) ─────────────
  const SERVER_REGISTRY: { id: string; label: string; description: string; server: WebMcpServer }[] = [
    { id: 'autoui', label: 'Auto-UI (natif)', description: 'Widgets natifs WebMCP (stat, table, galerie, timeline...)', server: autoui },
    { id: 'canvas2d', label: 'Canvas 2D', description: 'Dessins et animations Canvas 2D', server: canvas2dServer },
    { id: 'chartjs', label: 'Chart.js', description: 'Graphiques interactifs Chart.js (bar, line, pie, radar...)', server: chartjsServer },
    { id: 'cytoscape', label: 'Cytoscape', description: 'Graphes et reseaux (nodes, edges, layouts)', server: cytoscapeServer },
    { id: 'd3', label: 'D3.js', description: 'Visualisations D3.js avancees (treemap, force, chord...)', server: d3server },
    { id: 'leaflet', label: 'Leaflet', description: 'Cartes interactives Leaflet (markers, GeoJSON, heatmap)', server: leafletServer },
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
    // Internal bus data-update: apply to canvas store so widget re-renders.
    // Must be handled BEFORE the INTERACTIVE_ACTIONS filter drops it.
    if (action === 'bus-update') {
      canvas.updateBlock(widgetId, payload as Record<string, unknown>);
      return;
    }
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
    const label = p?.name ?? p?.title ?? p?.label ?? p?.item ?? 'an element';
    const msg = `[Widget interaction] The user clicked "${label}" in widget ${widgetType} (id: ${widgetId}). Action: ${action}. Data: ${JSON.stringify(payload)}`;

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
  let visualTrace = $state(false);
  // Always-on observer: instantiated once, collects events continuously.
  // Toggle only controls mount/detach of the 3 canvas widgets, so enabling
  // visualTrace mid-run rebuilds the full trace retroactively from the buffer.
  const traceObserver: TraceObserver = createTraceObserver({
    addWidget: (type, data, serverName) => {
      const widget = flexGrid?.addBlock(type, data, serverName, type);
      return widget ? { id: widget.id } : undefined;
    },
    updateWidget: (id, data) => bus.send('agent', id, 'data-update', data),
  });
  let traceMountedIds = $state<{ dagId: string; treeId: string; sankeyId: string } | null>(null);
  let flexGridReady = $state(false);

  // When visual trace is toggled ON, ensure the WebMCP servers needed by the
  // trace widgets are enabled. We union into enabledServers (never remove), so
  // any server the user had already enabled stays on. We also don't disable on
  // OFF — the user may want to keep using these servers for their own widgets.
  // autoui is required for the sankey widget; cytoscape for animated-flow;
  // d3 for the tree. mermaid + plotly are no longer needed here.
  const TRACE_REQUIRED_SERVERS = ['autoui', 'cytoscape', 'd3'];
  $effect(() => {
    if (!visualTrace) return;
    untrack(() => {
      const missing = TRACE_REQUIRED_SERVERS.filter(id => !enabledServers.has(id));
      if (missing.length === 0) return;
      const next = new Set(enabledServers);
      for (const id of missing) next.add(id);
      enabledServers = next;
    });
  });

  $effect(() => {
    if (visualTrace && flexGridReady && !traceMountedIds) {
      // Retry up to 5× @100ms in case flexGrid is momentarily unavailable.
      let attempts = 0;
      const tryMount = (): void => {
        const mounted = traceObserver.mount();
        if (mounted) { traceMountedIds = mounted; return; }
        attempts += 1;
        if (attempts < 5) setTimeout(tryMount, 100);
        else console.warn('[visual-trace] mount failed after 5 attempts');
      };
      tryMount();
    } else if (!visualTrace && traceMountedIds) {
      traceObserver.detach();
      traceMountedIds = null;
    }
  });

  // Double-click on a trace node → spawn 1-2 detail widgets routed by node kind.
  // Recipe detail modal, opened from dblclick when a tool call matches a loaded recipe.
  let detailRecipe = $state<RecipeData | null>(null);
  let detailOpen = $state(false);
  let detailAnchor = $state<string | undefined>(undefined);
  function asObj(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }
  /**
   * Look for the origin recipe of a given tool_call/tool_result by substring matching
   * a piece of the tool args (sql / script) against bodies of recipes loaded during
   * the run. Returns the first match (recipe name + body + the anchor text to locate).
   */
  function findRecipeAnchor(
    detail: ReturnType<typeof traceObserver.getNodeDetail>,
  ): { name: string; body: string; anchorText: string } | null {
    if (!detail) return null;
    const loaded = traceObserver.getLoadedRecipes();
    if (loaded.size === 0) return null;
    // Preferred: use the explicit origin recipe tagged by the trace observer
    if (detail.originRecipe) {
      const body = loaded.get(detail.originRecipe);
      if (body) {
        const a = asObj(detail.toolArgs);
        const sqlOrScript = (a.sql ?? a.query ?? a.statement ?? a.script ?? a.code) as string | undefined;
        const anchor = typeof sqlOrScript === 'string' && sqlOrScript.trim().length >= 10
          ? sqlOrScript.trim().split(/\s+/).slice(0, 6).join(' ')
          : '';
        console.log('[trace-anchor] using explicit originRecipe:', detail.originRecipe);
        return { name: detail.originRecipe, body, anchorText: anchor };
      }
    }
    const args = asObj(detail.toolArgs);
    const name = detail.toolName ?? '';
    const ends = (s: string): boolean => name === s || name.endsWith('_' + s);
    let needle: string | undefined;
    if (ends('query_sql') || /sql/i.test(name)) {
      needle = (args.sql ?? args.query ?? args.statement) as string | undefined;
    } else if (ends('run_script')) {
      needle = (args.script ?? args.code) as string | undefined;
    }
    if (!needle || typeof needle !== 'string' || needle.trim().length < 10) return null;
    // Normalize aggressively: collapse whitespace, lowercase, strip quotes/parens
    const norm = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const needleN = norm(needle);
    // Try progressively shorter probes so formatting differences (line breaks,
    // indentation, code fences) don't prevent a match.
    const probes = [120, 80, 50, 30, 20]
      .map(n => needleN.slice(0, n))
      .filter(p => p.length >= 20);
    if (probes.length === 0) return null;
    for (const [rName, rBody] of loaded) {
      const bodyN = norm(rBody);
      for (const probe of probes) {
        if (bodyN.includes(probe)) {
          // Map normalized probe back to original casing in body to use as DOM anchor
          const idx = bodyN.indexOf(probe);
          // Use a shorter slice of the original needle as anchor text (what the
          // modal will search for verbatim in segment.content).
          const anchor = needle.trim().split(/\s+/).slice(0, 6).join(' ');
          console.log('[trace-anchor] match:', rName, '| probe length:', probe.length, '| anchor:', anchor);
          return { name: rName, body: rBody, anchorText: anchor };
        }
      }
    }
    console.log('[trace-anchor] no match. loaded recipes:', [...loaded.keys()], '| needle:', needleN.slice(0, 100));
    return null;
  }
  function extractRecipeBody(raw: string): string {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && typeof (p as any).content === 'string') return (p as any).content;
    } catch { /* not JSON */ }
    return raw;
  }
  function onTraceNodeDblClick(ev: Event): void {
    const ce = ev as CustomEvent<{ nodeId: string; nodeData: Record<string, unknown> }>;
    const nodeId = ce.detail?.nodeId;
    if (!nodeId) return;
    const detail = traceObserver.getNodeDetail(nodeId);
    if (!detail) return;

    const add = (type: string, data: Record<string, unknown>) =>
      flexGrid?.addBlock(type, data, 'autoui', type);

    // 1. tool_error (tool_result with toolError) → alert
    if (detail.kind === 'tool_result' && detail.toolError) {
      add('alert', {
        title: `${detail.toolName ?? 'tool'} error`,
        message: detail.toolError,
        level: 'error',
      });
      return;
    }

    // 2. iteration → text with label
    if (detail.kind === 'iteration') {
      add('text', { content: `# ${detail.label ?? 'Iteration'}\n\nStart: ${new Date(detail.startMs).toLocaleTimeString()}` });
      return;
    }

    // 3. llm_req → kv (counts) + code (prompt preview if available)
    if (detail.kind === 'llm_req') {
      add('kv', {
        title: 'LLM request',
        rows: [
          ['messages', String(detail.messageCount ?? '?')],
          ['tools', String(detail.toolCount ?? '?')],
          ['iteration', String(detail.iteration ?? '?')],
        ],
      });
      return;
    }

    // 4. llm_resp → code (stop reason) + stat (tokens/latency)
    if (detail.kind === 'llm_resp') {
      add('stat', {
        label: `LLM · ${detail.stopReason ?? '?'}`,
        value: `${detail.inputTokens ?? 0}in / ${detail.outputTokens ?? 0}out`,
        trend: `${Math.round(detail.latencyMs ?? 0)}ms`,
        trendDir: 'neutral',
      });
      return;
    }

    // 5. tool_call / tool_result — routed by toolName
    if (detail.kind === 'tool_call' || detail.kind === 'tool_result') {
      const name = detail.toolName ?? '';
      const args = asObj(detail.toolArgs);

      const endsToolWith = (s: string): boolean => name === s || name.endsWith('_' + s);

      // 5a. get_recipe → open RecipeModal with the recipe body
      if (endsToolWith('get_recipe')) {
        const rArgs = (detail.toolArgs ?? {}) as Record<string, unknown>;
        const rName = (typeof rArgs.name === 'string' && rArgs.name)
          || (typeof rArgs.id === 'string' && rArgs.id)
          || 'recipe';
        // Prefer toolResult (fresh), fall back to loadedRecipes map
        let body: string | undefined;
        if (detail.toolResult) body = extractRecipeBody(detail.toolResult);
        if (!body) body = traceObserver.getLoadedRecipes().get(rName);
        if (body) {
          detailRecipe = { name: rName, description: '', body };
          detailAnchor = undefined;
          detailOpen = true;
          return;
        }
      }

      // 5ab. Origin recipe match — if this sql/script matches a previously loaded
      // recipe body, open that recipe with a scroll+highlight to the match.
      const originMatch = findRecipeAnchor(detail);
      if (originMatch) {
        detailRecipe = { name: originMatch.name, description: '', body: originMatch.body };
        detailAnchor = originMatch.anchorText;
        detailOpen = true;
        return;
      }

      // 5b. SQL tool → code lang=sql with query
      if (endsToolWith('query_sql') || /sql/i.test(name)) {
        const sql = (args.sql ?? args.query ?? args.statement ?? '') as string;
        add('code', { lang: 'sql', content: String(sql) });
        return;
      }

      // 5c. run_script → code lang=javascript with the script
      if (endsToolWith('run_script')) {
        const script = args.script ?? args.code ?? args.agentTask ?? JSON.stringify(args, null, 2);
        add('code', { lang: 'javascript', content: String(script) });
        return;
      }

      // 5d. generic tool_call → json-viewer args + json-viewer result
      add('json-viewer', { title: `${name} · args`, data: args, expanded: true });
      if (detail.toolResult !== undefined) {
        let resultValue: unknown = detail.toolResult;
        try { resultValue = JSON.parse(detail.toolResult); } catch { /* keep string */ }
        add('json-viewer', { title: `${name} · result`, data: resultValue, expanded: true });
      }
      return;
    }

    // Fallback: text with label
    add('text', { content: detail.label ?? '(no detail)' });
  }
  let lastLoggedToolCount = $state(0);
  tokenTracker.subscribe(m => { tokenMetrics = m; });

  let agentLogs = $state<{ ts: number; type: string; detail: string; ctxSize?: number }[]>([]);
  let abortController = $state<AbortController | null>(null);
  let exportCopied = $state(false);
  let exportState = $state<'idle' | 'loading' | 'done'>('idle');
  let exportedUrl = $state('');
  let exportModalOpen = $state(false);
  let exportedBlockSummary = $state<{count: number; types: string[]}>({count: 0, types: []});
  let includeSummary = $state(false);
  let exportError = $state<string | null>(null);
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
    const mcpServerNames = new Set(multiClient.listServers().map(s => s.name));
    const all = discoveryCache.allRecipes().filter(r => r.server && mcpServerNames.has(r.server));
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

  const webmcpRecipes = $derived.by(() => {
    return layers.filter(l => l.protocol === 'webmcp').flatMap((l) => {
      const webmcpLayer = l as { serverName: string; recipes?: unknown[] };
      return (webmcpLayer.recipes ?? []).map((r) => ({
        ...(r as Record<string, unknown>),
        serverName: webmcpLayer.serverName,
      }));
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
            const rawRecipes: any[] = Array.isArray(parsed) ? parsed : (parsed?.recipes ?? []);
            cacheRecipes = rawRecipes.map((r) => ({
              ...r,
              name: r.name ?? r.id ?? r.recipe_id ?? '(unnamed)',
              id: r.id ?? r.name,
            }));
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
  let transformersProvider = $state<TransformersProvider | null>(null);
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
    if (canvas.llm.startsWith('transformers-')) {
      if (transformersProvider && transformersProvider.model !== canvas.llm) unloadTransformers();
      if (!transformersProvider) {
        transformersProvider = new TransformersProvider({
          model: canvas.llm,
          onProgress: (p, _s, loaded, total) => {
            gemmaProgress = p * 100;
            if (loaded) gemmaLoadedMB = Math.round(loaded / 1048576 * 100) / 100;
            if (total) gemmaTotalMB = Math.round(total / 1048576 * 100) / 100;
          },
          onStatusChange: (s) => {
            gemmaStatus = s === 'ready' ? 'ready' : s === 'error' ? 'error' : s === 'loading' ? 'loading' : 'idle';
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
      return transformersProvider;
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

  function unloadTransformers() {
    transformersProvider?.destroy();
    transformersProvider = null;
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
      if (llm.startsWith('transformers-') && gemmaStatus === 'idle') {
        const p = getProvider();
        if (p instanceof TransformersProvider) p.initialize();
      }
    });
  });


  // Smart defaults: sanitize ON for Claude/local, flatten ON for Gemma/local
  $effect(() => {
    const isGemma = canvas.llm.startsWith('gemma');
    const isE4B = canvas.llm === 'gemma-e4b';
    const isLocal = canvas.llm === 'local';
    schemaFlatten = isGemma || isLocal;
    truncateResults = isGemma || isLocal;
    compressHistory = isLocal;
    schemaStrict = false;
    if (isGemma) {
      maxResultLength = 2000;
      ragResidueSize = 500;
      // Google's AI Edge Gallery default for Gemma — sweet spot for quality
      temperature = 1.0;
      topK = 64;
      maxContextTokens = isE4B ? 32768 : 32768;
      cacheEnabled = false;
    } else if (isLocal) {
      maxResultLength = 3000;
      ragResidueSize = 300;
    } else {
      // Claude defaults
      maxResultLength = 10000;
      ragResidueSize = 200;
      temperature = 0.7;
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

  const providerKind = $derived<'remote' | 'wasm' | 'gemma' | 'local'>(
    canvas.llm.startsWith('gemma') ? 'gemma'
      : canvas.llm === 'local' ? 'local'
      : 'remote'
  );

  const effectivePrompt = $derived.by(() => {
    // Build with the provider-specific tool syntax. For Gemma, emit native
    // `<|tool_call>call:...{}<tool_call|>` references directly — no runtime regex rewrite.
    const kind = providerKind === 'gemma' ? 'gemma' : 'generic';
    const base = buildSystemPrompt(layers, { providerKind: kind });
    // If the user customised the prompt in settings, it REPLACES base entirely
    const hasCustom = systemPrompt && systemPrompt.trim().length > 0;
    return hasCustom ? systemPrompt : base;
  });

  const providerTools = $derived(buildToolsFromLayers(layers, { sanitize: schemaStrict, flatten: schemaFlatten, strict: schemaStrict }).tools);

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
    return discoveryCache.allTools().filter(t => !DISCOVERY_TOOL_NAMES.has(t.name));
  });
  const toolCountByServer = $derived.by(() => {
    cacheVersion; // reactivity trigger
    return Object.fromEntries(
      multiClient.listServers().map(s => [s.url, discoveryCache.browsableToolCount(s.name)])
    );
  });
  const recipeCountByServer = $derived.by(() => {
    cacheVersion; // reactivity trigger
    return Object.fromEntries(
      multiClient.listServers().map(s => [s.url, discoveryCache.recipeCount(s.name)])
    );
  });
  // Same as above, but for WebMCP servers. Keyed by srv.id (which matches
  // layer.serverName for the built-in WebMCP servers).
  const webmcpRecipeCountByServer = $derived.by(() => {
    cacheVersion; // reactivity trigger
    const out: Record<string, number> = {};
    for (const entry of SERVER_REGISTRY) {
      const serverName = entry.server.layer().serverName;
      out[entry.id] = discoveryCache.recipeCount(serverName);
    }
    return out;
  });
  const webmcpToolCountByServer = $derived.by(() => {
    cacheVersion; // reactivity trigger
    const out: Record<string, number> = {};
    // Tools explicitly filtered out from the "real tools" count for WebMCP:
    // - discovery tools (search_recipes/list_recipes/get_recipe)
    // - action/system tools (widget_display, canvas, recall)
    const SYSTEM_TOOLS = new Set(['widget_display', 'canvas', 'recall']);
    for (const entry of SERVER_REGISTRY) {
      const layer = entry.server.layer();
      const count = layer.tools.filter(t =>
        !DISCOVERY_TOOL_NAMES.has(t.name) && !SYSTEM_TOOLS.has(t.name)
      ).length;
      out[entry.id] = count;
    }
    return out;
  });
  // Prompt shown in Settings → System Prompt panel. For Gemma, we wrap the already-
  // Gemma-syntax `effectivePrompt` with the turn structure and tool declarations
  // that WasmProvider.buildPrompt() emits, so the user sees what the model actually gets.
  // `effectivePrompt` (built with the right providerKind) is used by runDiagnostics,
  // the agent loop (options.systemPrompt), agentLogs, and DebugPanel.
  const displayedPrompt = $derived.by(() => {
    if (providerKind === 'gemma') {
      return buildGemmaPrompt({
        systemPrompt: effectivePrompt,
      });
    }
    return effectivePrompt;
  });
  const diagnostics = $derived(runDiagnostics(layers, providerTools, effectivePrompt ?? '', {
    sanitize: schemaStrict,
    flatten: schemaFlatten,
    strict: schemaStrict,
    providerKind,
  }));

  // ── Helpers ────────────────────────────────────────────────────────
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function pushHistory(role: string, content: string) {
    historyLog = [...historyLog, { id: uid(), role, content, ts: new Date() }];
  }
  function updateEphemeral(id: string, html: string) {
    ephemeral = ephemeral.map(e => e.id === id ? { ...e, html } : e);
  }

  // ── HyperSkill export ─────────────────────────────────────────────
  // Deep-unwrap Svelte 5 $state proxies so JSON.stringify/structured clone doesn't throw
  // on proxied canvas widget data (which can hold deeply nested reactive objects).
  function unwrapProxies<T>(value: T): T {
    try { return JSON.parse(JSON.stringify(value)) as T; }
    catch { return value; }
  }

  async function exportHsUrl() {
    if (exportState === 'loading') return;
    exportState = 'loading';
    exportError = null;
    try {
      canvas.setEnabledServers([...enabledServers]);
      const skillRaw = canvas.buildSkillJSON() as Record<string, unknown>;
      const skill = unwrapProxies(skillRaw);

      // STEP 1 — encode MINIMAL skill (no summary) and copy to clipboard IMMEDIATELY,
      // BEFORE any other long await, to preserve the user gesture on iOS Safari.
      const url = await encodeHyperSkill(skill as unknown as HyperSkill, window.location.origin + base);
      try { await navigator.clipboard.writeText(url); } catch { /* clipboard denied; textarea fallback in modal */ }
      exportedUrl = url;

      // Build block summary + open modal immediately
      const blocks = canvas.blocks;
      const typeSet = new Set(blocks.map(b => b.type));
      exportedBlockSummary = { count: blocks.length, types: [...typeSet] };
      exportState = 'done';
      exportCopied = true;
      exportModalOpen = true;
      setTimeout(() => { exportState = 'idle'; exportCopied = false; }, 3000);

      // STEP 2 — if requested, enrich with chat summary in the background.
      // The user gesture is gone by now, but the modal already has a working URL
      // and a textarea fallback. Re-clicks of "Copier le lien" will use the new URL.
      if (includeSummary && conversationHistory.length > 0) {
        (async () => {
          try {
            const result = await summarizeChat({
              messages: conversationHistory, provider: getProvider(),
              toolsUsed: allToolsUsed, toolCallCount: chatToolCount,
              mcpServers: multiClient.listServers().map(s => ({ name: s.name, url: s.url })),
              skillsReferenced: skills.map(s => s.name),
            });
            const enriched = { ...skill, chatSummary: result.chatSummary, provenance: result.provenance };
            const newUrl = await encodeHyperSkill(enriched as unknown as HyperSkill, window.location.origin + base);
            exportedUrl = newUrl;
          } catch (e) {
            exportError = e instanceof Error ? e.message : String(e);
          }
        })();
      }
    } catch (e) {
      exportState = 'idle';
      exportError = e instanceof Error ? e.message : String(e);
    }
  }

  function downloadSkillMarkdown() {
    try {
      const skillRaw = canvas.buildSkillJSON() as Record<string, unknown>;
      const skill = unwrapProxies(skillRaw) as {
        name?: string;
        created?: string;
        mcp?: string;
        llm?: string;
        blocks?: Array<{ type: string; data: unknown }>;
        meta?: { title?: string; created?: string; mcp?: string; llm?: string };
      };
      const blocks = (skill.blocks ?? []) as Array<{ type: string; data: unknown }>;
      const name = skill.name ?? skill.meta?.title ?? 'HyperSkill';
      const created = skill.created ?? skill.meta?.created ?? new Date().toISOString();
      const mcp = skill.mcp ?? skill.meta?.mcp ?? '';
      const llm = skill.llm ?? skill.meta?.llm ?? '';
      const lines: string[] = [];
      lines.push(exportedUrl || '');
      lines.push('');
      lines.push(`# ${name}`);
      lines.push('');
      lines.push(`Created: ${created}`);
      lines.push(`MCP: ${mcp}`);
      lines.push(`LLM: ${llm}`);
      lines.push('');
      lines.push(`## Widgets (${blocks.length})`);
      lines.push('');
      blocks.forEach((block, i) => {
        lines.push(`### ${i + 1}. ${block.type}`);
        lines.push('```json');
        lines.push(JSON.stringify(block.data, null, 2));
        lines.push('```');
        lines.push('');
      });
      const md = lines.join('\n');
      const blob = new Blob([md], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `skill-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      exportError = e instanceof Error ? e.message : String(e);
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

    // Intercept "test" command — chain both canary and hummingbird test flows.
    if (msg.trim().toLowerCase() === 'test') {
      input = '';
      await sendMessage('show the canary');
      await sendMessage('show the hummingbird');
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

    // Build user-turn payload — image block (if present) + text.
    // One-shot: the image is consumed for this turn only and then cleared.
    const pendingImage = attachedImage;
    let userTurn: string | ContentBlock[] = msg;
    if (pendingImage) {
      userTurn = [
        { type: 'image', data: pendingImage.dataUrl, mediaType: pendingImage.mediaType },
        { type: 'text', text: msg },
      ];
      attachedImage = null;
    }

    try {
      result = await runAgentLoop(userTurn, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider: getProvider(),
        systemPrompt: effectivePrompt || undefined,
        maxIterations: 15, maxTokens, maxResultLength: maxResultLength >= 50000 ? Infinity : maxResultLength, temperature, topK, cacheEnabled,
        truncateResults, compressHistory: compressHistory ? compressPreview : false,
        signal: abortController!.signal,
        initialMessages: trimConversationHistory(conversationHistory, maxContextTokens),
        layers,
        discoveryCache,
        contextRAG: contextRAG ?? undefined,
        ragResidueSize,
        schemaOptions: {
          sanitize: schemaStrict,
          flatten: schemaFlatten,
          strict: schemaStrict,
        },
        callbacks: {
          onIterationStart: (i, max) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'iteration', detail: `Iteration ${i}/${max}` }];
            if (i === 1) {
              // Log the system prompt on first iteration
              agentLogs = [...agentLogs, { ts: Date.now(), type: 'prompt', detail: effectivePrompt ?? '(none)' }];
              traceObserver.reset();
            }
            traceObserver?.callbacks.onIterationStart?.(i, max);
          },
          onLLMRequest: (messages, tools) => {
            const ctxChars = messages.reduce((sum, m) => {
              if (typeof m.content === 'string') return sum + m.content.length;
              return sum + (m.content as any[]).reduce((s, b) => s + (b.text?.length ?? JSON.stringify(b).length ?? 0), 0);
            }, 0);
            const ctxTokens = Math.round(ctxChars / 4);
            const flattenLabel = schemaFlatten ? 'ON' : 'OFF';
            const strictLabel = schemaStrict ? 'ON' : 'OFF';
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'request', detail: `${messages.length} messages, ${tools.length} tools (flatten=${flattenLabel}, strict=${strictLabel})`, ctxSize: ctxTokens }];
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
            traceObserver?.callbacks.onLLMRequest?.(messages, tools);
          },
          onLLMResponse: (response, latencyMs, tokens) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'response', detail: `${tokens?.input ?? '?'}in ${tokens?.output ?? '?'}out, ${Math.round(latencyMs)}ms, ${response.stopReason}`, ctxSize: tokens?.input }];
            if (response.usage) tokenTracker.record(response.usage, latencyMs, canvas.llm?.startsWith('gemma') ?? false);
            else if (response.stats) tokenTracker.recordEstimate(0, response.stats.totalTokens * 4, latencyMs);
            traceObserver?.callbacks.onLLMResponse?.(response, latencyMs, tokens);
          },
          onWidget: (type, data, serverName) => {
                // Use serverName from the agent loop (WebMCP server that produced the widget),
                // fall back to currentServerName (external MCP) if not set.
                const provServer = serverName || currentServerName || undefined;
                const widget = flexGrid?.addBlock(type, data, provServer, type);
                traceObserver?.callbacks.onWidget?.(type, data, provServer);
                return widget ? { id: widget.id } : undefined;
              },
          onClear: () => { flexGrid?.clearBlocks(); conversationHistory = []; traceObserver?.reset(); },
          onUpdate: (id, data) => bus.send('agent', id, 'data-update', data),
          onMove: (id, x, y) => layoutAdapter.move(id, x, y),
          onResize: (id, w, h) => layoutAdapter.resize(id, w, h),
          onStyle: (id, styles) => layoutAdapter.style(id, styles),
          onTrace: (message) => {
            if (showPipelineTrace) {
              agentLogs = [...agentLogs, { ts: Date.now(), type: 'trace', detail: message }];
            }
            traceObserver?.callbacks.onTrace?.(message);
          },
          onToken: () => {},
          onText: (text) => {
            if (text) {
              // Log text updates every ~50 chars to avoid spam
              if (text.length < 50 || text.length - lastLoggedTextLen > 50) {
                lastLoggedTextLen = text.length;
                agentLogs = [...agentLogs, { ts: Date.now(), type: 'text', detail: text }];
              }
              // Strip Gemma tool call tags from ephemeral display.
              // Handle both closed and unclosed (mid-stream) tags — a bare
              // non-greedy + optional closing matches only the opening tag
              // and leaks the body into the pill until the closing arrives.
              const clean = text
                .replace(/<\|tool_call>[\s\S]*?<tool_call\|>/g, '')
                .replace(/<\|tool_call>[\s\S]*$/g, '')
                .replace(/<\|tool_response>[\s\S]*?<tool_response\|>/g, '')
                .replace(/<\|tool_response>[\s\S]*$/g, '')
                .replace(/<\|"\|>/g, '')
                .trim();
              if (clean) updateEphemeral(assistantId, clean);
            }
          },
          onToolCall: (call) => {
            chatToolCount++; chatLastTool = call.name;
            allToolsUsed = [...allToolsUsed, call.name];
            const argsJson = JSON.stringify(call.args, null, 2);
            const resultFull = call.result ?? call.error ?? '';
            const isGetRecipeTool = call.name === 'get_recipe' || call.name.endsWith('_get_recipe');
            const originCtx = traceObserver.getCurrentRecipeContext();
            const fromSuffix = !isGetRecipeTool && originCtx ? ` [from: ${originCtx}]` : '';
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'tool', detail: `${call.name}(${argsJson}) -> ${resultFull} [${call.elapsed ?? '?'}ms]${fromSuffix}` }];
            if (/(^|_)get_recipe$/.test(call.name) && !call.error) {
              const a = call.args as Record<string, unknown> | undefined;
              const rid = (typeof a?.id === 'string' && a.id) || (typeof a?.name === 'string' && a.name)
                || (typeof a?.recipe === 'string' && a.recipe) || (Object.values(a ?? {}).find(v => typeof v === 'string') as string | undefined) || '?';
              const bodyLen = typeof call.result === 'string' ? call.result.length : 0;
              agentLogs = [...agentLogs, { ts: Date.now(), type: 'recipe', detail: `${rid} · ${bodyLen}c ingested` }];
            }
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
            const isRecipeIngest = /(^|_)get_recipe$/.test(call.name) && !call.error;
            let pill = `<strong>${call.name}</strong>`;
            if (isRecipeIngest) {
              const a = call.args as Record<string, unknown> | undefined;
              const rid = (typeof a?.id === 'string' && a.id) || (typeof a?.name === 'string' && a.name)
                || (typeof a?.recipe === 'string' && a.recipe) || (Object.values(a ?? {}).find(v => typeof v === 'string') as string | undefined) || '?';
              pill = `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="font-size:10px;font-weight:700;letter-spacing:0.03em;color:#ec4899;background:rgba(236,72,153,0.12);border-radius:3px;padding:1px 5px;">📄 ${rid}</span><strong>${call.name}</strong></span>`;
            }
            updateEphemeral(assistantId, pill);
            traceObserver?.callbacks.onToolCall?.(call);
          },
          onDone: (metrics) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'done', detail: `${metrics.iterations} iter, ${metrics.toolCalls} tools, ${metrics.totalTokens} tokens, ${Math.round(metrics.totalLatencyMs)}ms` }];
            traceObserver?.callbacks.onDone?.(metrics);
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
      const hasBlocks = result?.toolCalls?.some(c => c.name === 'autoui_ui_widget_display' || c.name?.startsWith('render_'));
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
    flexGridReady = true;
    document.addEventListener('widget:node-dblclick', onTraceNodeDblClick as EventListener);
  });

  onDestroy(() => {
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
    if (typeof document !== 'undefined') {
      document.removeEventListener('widget:node-dblclick', onTraceNodeDblClick as EventListener);
    }
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
    <ModelLoader
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
      {#if attachedImage}
        <div class="flex items-center gap-2 mb-2">
          <div class="relative flex-shrink-0">
            <img src={attachedImage.dataUrl} alt={attachedImage.name}
                 class="h-16 w-16 rounded-lg border border-border2 object-cover" />
            <button class="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-surface border border-border2 text-text2 hover:text-text1 hover:border-accent transition-colors"
                    onclick={() => attachedImage = null} aria-label="Remove image">
              <XIcon size={10} />
            </button>
          </div>
          <span class="font-mono text-[10px] text-text2 truncate">{attachedImage.name}</span>
        </div>
      {/if}
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
        {#if isVisionModel}
          <input type="file" accept="image/*" class="hidden"
                 bind:this={fileInputEl} onchange={onImagePicked} />
          <button
            class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border transition-colors
                   {attachedImage ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
            onclick={() => fileInputEl?.click()}
            disabled={canvas.generating}
            aria-label="Attach image" title="Attach image">
            <Paperclip size={14} />
          </button>
        {/if}
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
  bind:mcpToken bind:systemPrompt effectivePrompt={displayedPrompt} bind:maxTokens bind:maxContextTokens bind:maxResultLength
  bind:cacheEnabled bind:temperature bind:topK bind:showTokens bind:showToolJSON bind:showPipelineTrace bind:visualTrace
  bind:schemaFlatten bind:schemaStrict {providerKind} bind:compressHistory bind:compressPreview
  bind:contextRAGEnabled bind:ragResidueSize
  bind:localUrl bind:localModel
  onconnect={() => addMcpServer(canvas.mcpUrl)}
  {connectedUrls} {loadingUrls}
  onaddserver={addMcpServer} onaddall={addAllServers} onremoveserver={removeMcpServer}
  {mcpRecipes}
  {webmcpRecipes}
  onbrowserecipes={() => { settingsOpen = false; recipeBrowserOpen = true; recipeBrowserFilter = ''; }}
  {recipeCountByServer}
  onrecipeclick={(url) => { settingsOpen = false; recipeBrowserOpen = true; recipeBrowserFilter = multiClient.listServers().find(s => s.url === url)?.name ?? ''; }}
  {toolCountByServer}
  ontoolclick={(url) => { settingsOpen = false; toolBrowserOpen = true; const srv = multiClient.listServers().find(s => s.url === url); toolBrowserFilter = srv?.name ?? ''; }}
  {webmcpRecipeCountByServer}
  {webmcpToolCountByServer}
  onwebmcprecipeclick={(id) => {
    settingsOpen = false;
    recipeBrowserOpen = true;
    const entry = SERVER_REGISTRY.find(s => s.id === id);
    recipeBrowserFilter = entry?.server.layer().serverName ?? id;
  }}
  onwebmcptoolclick={(id) => {
    settingsOpen = false;
    toolBrowserOpen = true;
    const entry = SERVER_REGISTRY.find(s => s.id === id);
    toolBrowserFilter = entry?.server.layer().serverName ?? id;
  }}
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
        <div class="bg-surface2 border border-border2 rounded-lg p-3 overflow-hidden">
          <a href={exportedUrl} target="_blank" rel="noopener"
             title={exportedUrl}
             class="font-mono text-[11px] text-accent hover:underline block truncate">{exportedUrl}</a>
        </div>
        {#if exportedBlockSummary.count > 0}
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono text-[10px] text-text2">{exportedBlockSummary.count} widget{exportedBlockSummary.count > 1 ? 's' : ''} inclus :</span>
            {#each exportedBlockSummary.types as t}
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-accent/30 text-accent bg-accent/5">{t}</span>
            {/each}
          </div>
        {/if}
        {#if exportError}
          <div class="rounded-lg border border-accent2/40 bg-accent2/10 p-3 font-mono text-[11px] text-accent2 break-words">
            Export error: {exportError}
          </div>
        {/if}
        <div class="flex items-center gap-2 self-end">
          <button class="font-mono text-xs h-8 px-4 rounded-lg border border-border2 text-text2 hover:text-text1 hover:bg-surface2 transition-colors"
                  onclick={downloadSkillMarkdown}>
            Download .md
          </button>
          <button class="font-mono text-xs h-8 px-4 rounded-lg border border-accent text-accent hover:bg-accent/10 transition-colors"
                  onclick={async () => {
                    try { await navigator.clipboard.writeText(exportedUrl); }
                    catch (e) { exportError = e instanceof Error ? e.message : String(e); }
                  }}>
            Copy link
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- HISTORY MODAL -->
<HistoryModal bind:open={historyOpen} messages={historyLog} />

<!-- DEBUG PANEL (Ctrl+Shift+D) -->
<DebugPanel prompt={effectivePrompt} {layers} />

<!-- RECIPE BROWSER -->
<RecipeBrowser bind:open={recipeBrowserOpen} {mcpRecipes} {webmcpRecipes} initialFilter={recipeBrowserFilter} {multiClient} />

<!-- RECIPE DETAIL (opened from trace dblclick when a tool call matches a loaded recipe) -->
<RecipeModal
  bind:open={detailOpen}
  recipe={detailRecipe}
  anchorText={detailAnchor}
  onclose={() => { detailOpen = false; detailAnchor = undefined; }}
  {multiClient}
/>

<ToolBrowser bind:open={toolBrowserOpen} tools={browsableTools} initialFilter={toolBrowserFilter} />
