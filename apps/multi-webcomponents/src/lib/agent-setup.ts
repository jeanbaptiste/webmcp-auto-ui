// ---------------------------------------------------------------------------
// Agent configuration — wires MCP + WebMCP servers to the agent loop
// ---------------------------------------------------------------------------

import { McpMultiClient, mountWidget } from '@webmcp-auto-ui/core';
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import {
  RemoteLLMProvider,
  runAgentLoop,
  buildSystemPrompt,
  fromMcpTools,
  autoui,
} from '@webmcp-auto-ui/agent';
import type { ToolLayer, McpLayer, ChatMessage } from '@webmcp-auto-ui/agent';
import { autouivanilla } from '@webmcp-auto-ui/widgets-vanilla';
import { d3server } from '@webmcp-auto-ui/widgets-d3';
import { mermaidServer } from '@webmcp-auto-ui/widgets-mermaid';
import { bus, Events } from './event-bus.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const multiClient = new McpMultiClient();
export const webmcpServers: WebMcpServer[] = [autouivanilla, d3server, mermaidServer];
export let conversationHistory: ChatMessage[] = [];

const provider = new RemoteLLMProvider({ proxyUrl: '/api/chat', model: 'haiku' });

let generating = false;
let abortController: AbortController | null = null;

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function isGenerating(): boolean { return generating; }
export function abort(): void { abortController?.abort(); }

export function getActiveServers(): WebMcpServer[] {
  return webmcpServers;
}

export function setModel(id: string): void {
  provider.setModel(id as any);
}

// ---------------------------------------------------------------------------
// MCP connection
// ---------------------------------------------------------------------------

export async function connectMcp(url: string): Promise<void> {
  if (!url.trim()) return;
  try {
    await multiClient.addServer(url.trim());
    const servers = multiClient.listServers();
    const last = servers[servers.length - 1];
    bus.emit(Events.MCP_CONNECTED, { url: url.trim(), name: last?.name ?? url, toolCount: last?.tools.length ?? 0 });
    bus.emit(Events.SERVERS_CHANGED);
  } catch (e) {
    console.error('MCP connect failed:', e);
  }
}

export async function disconnectMcp(url: string): Promise<void> {
  await multiClient.removeServer(url);
  bus.emit(Events.MCP_DISCONNECTED, { url });
  bus.emit(Events.SERVERS_CHANGED);
}

export function listConnectedServers() {
  return multiClient.listServers();
}

// ---------------------------------------------------------------------------
// Build layers
// ---------------------------------------------------------------------------

function buildLayers(): ToolLayer[] {
  const result: ToolLayer[] = [];

  if (multiClient.hasConnections) {
    const allTools = multiClient.listAllTools();
    const mcpLayer: McpLayer = {
      protocol: 'mcp',
      serverName: multiClient.listServers().map(s => s.name).join(', '),
      tools: fromMcpTools(allTools as any),
    };
    result.push(mcpLayer);
  }

  // autoui built-in (canvas manipulation)
  result.push(autoui.layer());

  return result;
}

// ---------------------------------------------------------------------------
// Agent loop
// ---------------------------------------------------------------------------

let widgetCounter = 0;

export async function sendMessage(text: string): Promise<void> {
  if (!text.trim() || generating) return;

  generating = true;
  abortController = new AbortController();
  bus.emit(Events.AGENT_START);

  const layers = buildLayers();
  const systemPrompt = buildSystemPrompt(layers);

  try {
    const result = await runAgentLoop(text, {
      client: multiClient.hasConnections ? multiClient as any : undefined,
      provider,
      systemPrompt,
      layers,
      maxIterations: 15,
      maxTokens: 4096,
      signal: abortController.signal,
      initialMessages: conversationHistory,
      callbacks: {
        onWidget: (type, data) => {
          const id = `w_${++widgetCounter}`;
          bus.emit(Events.WIDGET_ADD, { id, type, data });
          return { id };
        },
        onClear: () => {
          bus.emit(Events.WIDGET_CLEAR);
        },
        onUpdate: (id, data) => {
          bus.emit(Events.WIDGET_UPDATE, { id, data });
        },
        onText: (text) => {
          if (text) bus.emit(Events.AGENT_TEXT, { text });
        },
        onToolCall: (call) => {
          bus.emit(Events.TOOL_CALL, { name: call.name, guided: call.guided });
        },
      },
    });

    if (result) {
      conversationHistory = result.messages;
      if (result.text) {
        bus.emit(Events.AGENT_TEXT, { text: result.text });
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    bus.emit(Events.AGENT_TEXT, { text: `Error: ${msg}` });
  } finally {
    generating = false;
    abortController = null;
    bus.emit(Events.AGENT_DONE);
  }
}
