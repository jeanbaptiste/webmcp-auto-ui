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
}

type NodeKind =
  | 'iteration'
  | 'llm_req'
  | 'llm_resp'
  | 'tool_call'
  | 'tool_result'
  | 'widget'
  | 'trace';

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

  function buildCytoscapeData(): Record<string, unknown> {
    const elements: Array<{ data: Record<string, unknown> }> = [];
    for (const n of nodes) {
      elements.push({ data: { id: n.id, label: `${n.kind}: ${n.label}` } });
    }
    for (const e of edges) {
      elements.push({ data: { source: e.from, target: e.to, flow: e.weight } });
    }
    return { elements };
  }

  function buildTreeData(): Record<string, unknown> {
    interface TreeNode {
      name: string;
      children?: TreeNode[];
    }
    const root: TreeNode = { name: 'conv', children: [] };
    const iterNodes = nodes.filter((n) => n.kind === 'iteration');
    for (const iter of iterNodes) {
      const iterChild: TreeNode = { name: iter.label, children: [] };
      // Collect children of this iteration: nodes with meta.iterationId === iter.id
      for (const n of nodes) {
        if (n.id === iter.id) continue;
        if (n.meta.iterationId === iter.id) {
          iterChild.children!.push({ name: `${n.kind}: ${n.label}` });
        }
      }
      root.children!.push(iterChild);
    }
    return { root, orientation: 'horizontal' };
  }

  function buildSankeyData(): Record<string, unknown> {
    // Unique kinds appearing in transitions
    const labelSet = new Set<string>();
    const transitions: Array<{ from: string; to: string; weight: number }> = [];
    for (const [key, weight] of sankeyWeights.entries()) {
      const [from, to] = key.split('→');
      if (!from || !to) continue;
      labelSet.add(from);
      labelSet.add(to);
      transitions.push({ from, to, weight });
    }
    const labels = Array.from(labelSet);
    const indexOf = (k: string): number => labels.indexOf(k);
    const source: number[] = [];
    const target: number[] = [];
    const value: number[] = [];
    for (const t of transitions) {
      source.push(indexOf(t.from));
      target.push(indexOf(t.to));
      value.push(t.weight);
    }
    return {
      nodes: { label: labels },
      links: { source, target, value },
    };
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
      const node = addNode('llm_resp', `resp ${outTokens}tok ${latencyMs}ms`, {
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
        scheduleFlush();
        return;
      }
      // First invocation — record the call
      const node = addNode('tool_call', call.name, {
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
      const sankey = ctx.addWidget('plotly-sankey', buildSankeyData(), 'plotly');
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
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (ids !== null) {
        ctx.updateWidget(ids.dagId, { elements: [] });
        ctx.updateWidget(ids.treeId, {
          root: { name: 'conv', children: [] },
          orientation: 'horizontal',
        });
        ctx.updateWidget(ids.sankeyId, {
          nodes: { label: [] },
          links: { source: [], target: [], value: [] },
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
  };
}
