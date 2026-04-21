// @webmcp-auto-ui/agent — trace observer
// Builds a live visual trace of runAgentLoop execution by maintaining an
// internal graph (nodes + edges) and projecting it into three canvas widgets:
//   - cytoscape "animated-flow" (directed graph of events)
//   - d3 "tree" (iteration → step hierarchy)
//   - plotly "plotly-sankey" (aggregated transitions by kind)

import type {
  AgentCallbacks,
  ChatMessage,
  ProviderTool,
  LLMResponse,
  ToolCall,
  AgentMetrics,
} from './types.js';

export interface TraceObserverContext {
  addWidget: (
    type: string,
    data: Record<string, unknown>,
    serverName: string,
  ) => { id: string } | undefined;
  updateWidget: (id: string, data: Record<string, unknown>) => void;
}

export interface RoundTripDetail {
  kind: string;
  label: string;
  startMs: number;
  endMs?: number;
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: string;
  toolError?: string;
  messageCount?: number;
  toolCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  stopReason?: string;
  iteration?: number;
}

export interface TraceObserver {
  /** Partial AgentCallbacks to merge into runAgentLoop callbacks. */
  callbacks: Partial<AgentCallbacks>;
  /** Mount the 3 widgets on the canvas. Safe to call again after detach. */
  mount: () => { dagId: string; treeId: string; sankeyId: string } | null;
  /** Reset internal state (call when a new run starts). */
  reset: () => void;
  /** Unmount widgets; buffer is preserved so a later mount() restores state. */
  detach: () => void;
  /** Retrieve enriched detail for a trace node id (for mermaid.sequence rendering). */
  getNodeDetail: (nodeId: string) => RoundTripDetail | undefined;
  /** Map of recipe name → body (markdown), accumulated from get_recipe tool results during the run. */
  getLoadedRecipes: () => Map<string, string>;
}

type NodeKind =
  | 'iteration'
  | 'llm_req'
  | 'llm_resp'
  | 'tool_call'
  | 'tool_result'
  | 'widget'
  | 'trace';

/**
 * Tree is the single source of truth for node color: d3's scaleOrdinal over
 * schemeTableau10, indexed by the depth-1 ancestor name (= iteration label).
 * We mirror it here byte-for-byte so cytoscape + sankey visually align with
 * the tree. d3 ordinal assigns colors in INSERTION ORDER (first unseen key
 * → palette[0], second → palette[1], …) — reproduce that with a Map.
 */
const SCHEME_TABLEAU10: readonly string[] = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
  '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab',
];
const ROOT_COLOR = '#1e293b';

function makeIterationPalette(): (label: string) => string {
  const seen = new Map<string, string>();
  return (label: string): string => {
    const cached = seen.get(label);
    if (cached) return cached;
    const color = SCHEME_TABLEAU10[seen.size % SCHEME_TABLEAU10.length]!;
    seen.set(label, color);
    return color;
  };
}

/** Cytoscape style override — clean typography, smaller arrows, palette by kind. */
const CYTOSCAPE_STYLE: Array<Record<string, unknown>> = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'label': 'data(label)',
      'color': '#1e293b',
      'font-size': '11px',
      'font-family': 'Inter, system-ui, sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-outline-width': 0,
      'text-outline-color': 'transparent',
      'border-width': 1,
      'border-color': '#64748b',
      'width': 28,
      'height': 28,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.6,
      'curve-style': 'bezier',
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3],
    },
  },
];

interface TraceNode {
  id: string;
  kind: NodeKind;
  label: string;
  startMs: number;
  endMs?: number;
  meta: Record<string, unknown>;
}

interface TraceEdge {
  from: string;
  to: string;
  weight: number;
}

const FLUSH_INTERVAL_MS = 100;

export function createTraceObserver(ctx: TraceObserverContext): TraceObserver {
  let nodes: TraceNode[] = [];
  let edges: TraceEdge[] = [];
  // Aggregated transitions keyed by `${fromKind}→${toKind}`
  let sankeyWeights = new Map<string, number>();
  let nodeIdCounter = 0;
  let iterationPalette = makeIterationPalette();

  /** Climb up meta.iterationId chain until we find the iteration node. */
  function iterationAncestor(node: TraceNode): TraceNode | undefined {
    if (node.kind === 'iteration') return node;
    const iterId = node.meta.iterationId as string | undefined;
    if (!iterId) return undefined;
    return nodes.find((n) => n.id === iterId && n.kind === 'iteration');
  }

  function colorForNode(node: TraceNode): string {
    const iter = iterationAncestor(node);
    if (!iter) return ROOT_COLOR;
    return iterationPalette(iter.label);
  }
  let lastNodeByKind: Partial<Record<NodeKind, string>> = {};
  let currentIterationId: string | undefined;
  let currentLlmReqId: string | undefined;
  let currentLlmRespId: string | undefined;
  let lastToolCallId: string | undefined;
  const toolCallIdMap = new Map<string, string>(); // agent tool-call id → trace node id
  const toolCallStartMs = new Map<string, number>();

  let ids: { dagId: string; treeId: string; sankeyId: string } | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  // Per-node detail store, keyed by trace node id
  const nodeDetails = new Map<string, RoundTripDetail>();
  // Accumulated recipe bodies loaded via get_recipe during the run (name → markdown body)
  const loadedRecipes = new Map<string, string>();

  /** Build a short, graph-friendly label for a tool_call node from tool name + args.
   *  Uses a tool-specific emoji so small graph nodes remain legible. */
  function enrichToolLabel(toolName: string, args: unknown): string {
    const a = (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;
    const sanitize = (s: string): string =>
      s.replace(/\s+/g, ' ').replace(/"/g, '').trim();
    const truncate = (s: string): string => (s.length > 40 ? s.slice(0, 40) + '…' : s);
    let emoji = '🔧';
    let kind = toolName;
    let preview: string | undefined;
    if (toolName === 'query_sql' || /sql/i.test(toolName)) {
      emoji = '🗃️'; kind = 'sql';
      const sql = (a.sql ?? a.query ?? a.statement) as unknown;
      if (typeof sql === 'string') preview = sql;
    } else if (toolName === 'run_script') {
      emoji = '⚙️'; kind = 'script';
      const scr = (a.script ?? a.code ?? a.agentTask) as unknown;
      if (typeof scr === 'string') preview = scr;
    } else if (toolName === 'get_recipe') {
      emoji = '📖'; kind = 'recipe';
      const n = (a.name ?? a.id) as unknown;
      if (typeof n === 'string') preview = n;
    } else if (toolName === 'search_recipes') {
      emoji = '🔍'; kind = 'search';
      const n = (a.query ?? a.name) as unknown;
      if (typeof n === 'string') preview = n;
    }
    const body = preview ? truncate(sanitize(preview)) : '';
    return body ? `${emoji} 【${kind}】 ${body}` : `${emoji} 【${kind}】`;
  }

  function nextId(kind: NodeKind): string {
    nodeIdCounter += 1;
    return `${kind}_${nodeIdCounter}`;
  }

  function addNode(
    kind: NodeKind,
    label: string,
    meta: Record<string, unknown> = {},
  ): TraceNode {
    const node: TraceNode = {
      id: nextId(kind),
      kind,
      label,
      startMs: Date.now(),
      meta,
    };
    nodes.push(node);
    return node;
  }

  function addEdge(fromId: string, toId: string, weight = 1): void {
    const existing = edges.find((e) => e.from === fromId && e.to === toId);
    if (existing) {
      existing.weight += weight;
    } else {
      edges.push({ from: fromId, to: toId, weight });
    }
  }

  function addSankey(fromKind: NodeKind, toKind: NodeKind, weight = 1): void {
    const key = `${fromKind}→${toKind}`;
    sankeyWeights.set(key, (sankeyWeights.get(key) ?? 0) + weight);
  }

  function scheduleFlush(): void {
    if (ids === null || flushTimer !== null) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }

  function summaryForNode(node: TraceNode): string {
    const detail = nodeDetails.get(node.id);
    if (!detail) return node.label;
    const ms = (v: number | undefined): number => Math.round(v ?? 0);
    switch (detail.kind) {
      case 'iteration': {
        const i = detail.iteration;
        return i != null ? `Iteration #${i} — ${detail.label}` : detail.label;
      }
      case 'tool_call': {
        const name = detail.toolName ?? '?';
        const args = detail.toolArgs !== undefined ? JSON.stringify(detail.toolArgs).slice(0, 60) : '';
        if (detail.toolError) return `${name} ✗ ${String(detail.toolError).slice(0, 60)}`;
        if (detail.toolResult !== undefined) {
          return `${name}(${args}) → ${detail.toolResult.slice(0, 60)} (${ms(detail.latencyMs)}ms)`;
        }
        return `${name}(${args}) — pending...`;
      }
      case 'tool_result': {
        const name = detail.toolName ?? '?';
        if (detail.toolError) return `${name} ✗ ${String(detail.toolError).slice(0, 60)}`;
        const res = detail.toolResult ? detail.toolResult.slice(0, 60) : '';
        return `${name} → ${res} (${ms(detail.latencyMs)}ms)`;
      }
      case 'llm_req':
        return `→ LLM: ${detail.messageCount ?? 0} msgs, ${detail.toolCount ?? 0} tools`;
      case 'llm_resp':
        return `← LLM: ${detail.inputTokens ?? 0}in/${detail.outputTokens ?? 0}out, ${ms(detail.latencyMs)}ms (${detail.stopReason ?? '?'})`;
      default:
        return detail.label ?? node.label;
    }
  }

  function buildCytoscapeData(): Record<string, unknown> {
    const elements: Array<{ data: Record<string, unknown> }> = [];
    for (const n of nodes) {
      elements.push({
        data: {
          id: n.id,
          label: n.label,
          kind: n.kind,
          color: colorForNode(n),
          summary: summaryForNode(n),
        },
      });
    }
    for (const e of edges) {
      elements.push({ data: { source: e.from, target: e.to, flow: e.weight } });
    }
    return { elements, style: CYTOSCAPE_STYLE, layout: { name: 'cose', animate: true } };
  }

  function buildTreeData(): Record<string, unknown> {
    interface TreeNode {
      name: string;
      nodeId?: string;
      children?: TreeNode[];
    }
    // No `color` field — tree widget owns its palette (source of truth).
    const root: TreeNode = { name: 'conv', children: [] };
    const iterNodes = nodes.filter((n) => n.kind === 'iteration');
    for (const iter of iterNodes) {
      const iterChild: TreeNode & { summary?: string } = {
        name: iter.label,
        nodeId: iter.id,
        summary: summaryForNode(iter),
        children: [],
      };
      for (const n of nodes) {
        if (n.id === iter.id) continue;
        if (n.meta.iterationId === iter.id) {
          iterChild.children!.push({
            name: n.label,
            nodeId: n.id,
            summary: summaryForNode(n),
          } as TreeNode & { summary: string });
        }
      }
      root.children!.push(iterChild);
    }
    return { root, orientation: 'horizontal' };
  }

  function buildSankeyData(): Record<string, unknown> {
    // autoui.sankey shape: { nodes: [{id,label,color}], links: [{source,target,value,color}] }
    // where source/target are node ids (strings), not indexes.
    // Build per-trace-node sankey where links flow from source trace node to target trace node.
    const presentIds = new Set<string>();
    for (const e of edges) {
      presentIds.add(e.from);
      presentIds.add(e.to);
    }
    const sankeyNodes = nodes
      .filter((n) => presentIds.has(n.id))
      .map((n) => ({
        id: n.id,
        label: n.label,
        color: colorForNode(n),
        summary: summaryForNode(n),
      }));
    const sankeyLinks = edges.map((e) => {
      const src = nodes.find((n) => n.id === e.from);
      return {
        source: e.from,
        target: e.to,
        value: e.weight,
        color: src ? colorForNode(src) : ROOT_COLOR,
      };
    });
    return { nodes: sankeyNodes, links: sankeyLinks };
  }

  function flush(): void {
    if (ids === null) return;
    ctx.updateWidget(ids.dagId, buildCytoscapeData());
    ctx.updateWidget(ids.treeId, buildTreeData());
    ctx.updateWidget(ids.sankeyId, buildSankeyData());
  }

  const callbacks: Partial<AgentCallbacks> = {
    onIterationStart: (iteration: number, maxIterations: number): void => {
      const node = addNode('iteration', `iter ${iteration}/${maxIterations}`, {
        iteration,
        maxIterations,
      });
      currentIterationId = node.id;
      nodeDetails.set(node.id, {
        kind: 'iteration',
        label: node.label,
        startMs: node.startMs,
        iteration,
      });
      // Link previous last-of-kind to this iteration where meaningful
      if (lastNodeByKind.iteration) {
        addEdge(lastNodeByKind.iteration, node.id);
        addSankey('iteration', 'iteration');
      }
      lastNodeByKind.iteration = node.id;
      scheduleFlush();
    },

    onLLMRequest: (messages: ChatMessage[], tools: ProviderTool[]): void => {
      const node = addNode('llm_req', `req (${messages.length} msgs, ${tools.length} tools)`, {
        iterationId: currentIterationId,
        messageCount: messages.length,
        toolCount: tools.length,
      });
      currentLlmReqId = node.id;
      nodeDetails.set(node.id, {
        kind: 'llm_req',
        label: node.label,
        startMs: node.startMs,
        messageCount: messages.length,
        toolCount: tools.length,
      });
      if (currentIterationId) {
        addEdge(currentIterationId, node.id);
        addSankey('iteration', 'llm_req');
      }
      lastNodeByKind.llm_req = node.id;
      scheduleFlush();
    },

    onLLMResponse: (
      response: LLMResponse,
      latencyMs: number,
      tokens?: { input: number; output: number },
    ): void => {
      const outTokens = tokens?.output ?? response.usage?.output_tokens ?? 0;
      const inTokens = tokens?.input ?? response.usage?.input_tokens ?? 0;
      const node = addNode('llm_resp', `resp ${outTokens}tok ${Math.round(latencyMs)}ms`, {
        iterationId: currentIterationId,
        latencyMs,
        inputTokens: inTokens,
        outputTokens: outTokens,
        stopReason: response.stopReason,
      });
      node.endMs = Date.now();
      currentLlmRespId = node.id;
      nodeDetails.set(node.id, {
        kind: 'llm_resp',
        label: node.label,
        startMs: node.startMs,
        endMs: node.endMs,
        inputTokens: inTokens,
        outputTokens: outTokens,
        latencyMs,
        stopReason: response.stopReason,
      });
      if (currentLlmReqId) {
        addEdge(currentLlmReqId, node.id, Math.max(1, outTokens));
        addSankey('llm_req', 'llm_resp', Math.max(1, outTokens));
      }
      lastNodeByKind.llm_resp = node.id;
      scheduleFlush();
    },

    onToolCall: (call: ToolCall): void => {
      const existingTraceId = toolCallIdMap.get(call.id);
      if (existingTraceId && call.result !== undefined) {
        // Second invocation — result arrived. Emit tool_result node and enrich original tool_call detail.
        const startMs = toolCallStartMs.get(call.id) ?? Date.now();
        const elapsed = call.elapsed ?? Date.now() - startMs;
        const resNode = addNode('tool_result', `${call.name} (${elapsed}ms)`, {
          iterationId: currentIterationId,
          toolCallId: call.id,
          elapsed,
          error: call.error,
        });
        resNode.endMs = Date.now();
        nodeDetails.set(resNode.id, {
          kind: 'tool_result',
          label: resNode.label,
          startMs: resNode.startMs,
          endMs: resNode.endMs,
          toolName: call.name,
          toolResult: typeof call.result === 'string' ? call.result : JSON.stringify(call.result),
          toolError: call.error,
          latencyMs: elapsed,
        });
        // Enrich the originating tool_call detail so getNodeDetail(toolCallId) returns full info.
        const prior = nodeDetails.get(existingTraceId);
        if (prior) {
          prior.endMs = resNode.endMs;
          prior.toolResult = typeof call.result === 'string' ? call.result : JSON.stringify(call.result);
          prior.toolError = call.error;
          prior.latencyMs = elapsed;
        }
        addEdge(existingTraceId, resNode.id, Math.max(1, elapsed));
        addSankey('tool_call', 'tool_result', Math.max(1, elapsed));
        lastNodeByKind.tool_result = resNode.id;
        // If this is a get_recipe result (no error), extract the recipe body and store it
        // so dblclick handlers can match tool calls back to their origin recipe.
        if (call.name === 'get_recipe' && !call.error && call.result !== undefined) {
          try {
            const rawStr = typeof call.result === 'string' ? call.result : JSON.stringify(call.result);
            let body = rawStr;
            try {
              const parsed = JSON.parse(rawStr);
              if (parsed && typeof parsed === 'object' && typeof (parsed as { content?: unknown }).content === 'string') {
                body = (parsed as { content: string }).content;
              }
            } catch { /* not JSON — keep raw */ }
            const a = (call.args && typeof call.args === 'object' ? call.args : {}) as Record<string, unknown>;
            const name = (a.name ?? a.id) as unknown;
            if (typeof name === 'string' && name.length > 0 && typeof body === 'string' && body.length > 0) {
              loadedRecipes.set(name, body);
            }
          } catch { /* defensive — never break trace on recipe parse errors */ }
        }
        scheduleFlush();
        return;
      }
      // First invocation — record the call
      const enrichedLabel = enrichToolLabel(call.name, call.args);
      const node = addNode('tool_call', enrichedLabel, {
        iterationId: currentIterationId,
        toolCallId: call.id,
        args: call.args,
      });
      toolCallIdMap.set(call.id, node.id);
      toolCallStartMs.set(call.id, node.startMs);
      nodeDetails.set(node.id, {
        kind: 'tool_call',
        label: node.label,
        startMs: node.startMs,
        toolName: call.name,
        toolArgs: call.args,
      });
      if (currentLlmRespId) {
        addEdge(currentLlmRespId, node.id);
        addSankey('llm_resp', 'tool_call');
      }
      lastToolCallId = node.id;
      lastNodeByKind.tool_call = node.id;
      scheduleFlush();
    },

    onWidget: (type: string, _data: Record<string, unknown>, serverName?: string): void => {
      const node = addNode('widget', `${serverName ?? '?'}/${type}`, {
        iterationId: currentIterationId,
        type,
        serverName,
      });
      const parent = lastToolCallId ?? currentLlmRespId;
      if (parent) {
        addEdge(parent, node.id);
        // Pick a sensible sankey source kind
        if (lastToolCallId) addSankey('tool_call', 'widget');
        else addSankey('llm_resp', 'widget');
      }
      lastNodeByKind.widget = node.id;
      scheduleFlush();
    },

    onTrace: (message: string): void => {
      const node = addNode('trace', message.slice(0, 64), {
        iterationId: currentIterationId,
        full: message,
      });
      const parent = currentLlmRespId ?? currentIterationId;
      if (parent) {
        addEdge(parent, node.id);
        addSankey(
          currentLlmRespId ? 'llm_resp' : 'iteration',
          'trace',
        );
      }
      lastNodeByKind.trace = node.id;
      scheduleFlush();
    },

    onDone: (_metrics: AgentMetrics): void => {
      // Final flush bypasses throttle to guarantee terminal state renders.
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
    },
  };

  return {
    callbacks,
    mount(): { dagId: string; treeId: string; sankeyId: string } | null {
      if (ids !== null) return ids;
      const dag = ctx.addWidget('animated-flow', buildCytoscapeData(), 'cytoscape');
      const tree = ctx.addWidget('tree', buildTreeData(), 'd3');
      const sankey = ctx.addWidget('sankey', buildSankeyData(), 'autoui');
      if (!dag || !tree || !sankey) return null;
      ids = { dagId: dag.id, treeId: tree.id, sankeyId: sankey.id };
      // Synchronous immediate flush — guarantees widgets reflect full buffer
      // when trace is toggled mid-run (retroactive within current session).
      flush();
      return ids;
    },
    reset(): void {
      nodes = [];
      edges = [];
      sankeyWeights = new Map();
      nodeIdCounter = 0;
      lastNodeByKind = {};
      currentIterationId = undefined;
      currentLlmReqId = undefined;
      currentLlmRespId = undefined;
      lastToolCallId = undefined;
      toolCallIdMap.clear();
      toolCallStartMs.clear();
      nodeDetails.clear();
      loadedRecipes.clear();
      iterationPalette = makeIterationPalette();
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (ids !== null) {
        ctx.updateWidget(ids.dagId, {
          elements: [],
          style: CYTOSCAPE_STYLE,
          layout: { name: 'cose', animate: true },
        });
        ctx.updateWidget(ids.treeId, {
          root: { name: 'conv', children: [] },
          orientation: 'horizontal',
        });
        ctx.updateWidget(ids.sankeyId, {
          nodes: [],
          links: [],
        });
      }
    },
    detach(): void {
      // Unmount widgets but keep the buffer so a later mount() is retroactive.
      ids = null;
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    },
    getNodeDetail(nodeId: string): RoundTripDetail | undefined {
      return nodeDetails.get(nodeId);
    },
    getLoadedRecipes(): Map<string, string> {
      return loadedRecipes;
    },
  };
}
