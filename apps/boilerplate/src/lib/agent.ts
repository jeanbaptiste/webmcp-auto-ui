import {
  RemoteLLMProvider, HawkProvider, runAgentLoop, buildSystemPrompt,
  fromMcpTools, autoui,
} from '@webmcp-auto-ui/agent';
import type { ChatMessage, ToolLayer, McpLayer } from '@webmcp-auto-ui/agent';
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
import { tricoteusesServer } from './widgets/register';

// ── Anthropic provider via local proxy ────────────────────────────────
export function createProvider(proxyUrl: string, model?: string) {
  if (model?.startsWith('hawk-')) {
    // proxyUrl is assumed to be `${base}/api/chat`; swap suffix for hawk route
    const hawkUrl = proxyUrl.replace(/\/api\/chat$/, '/api/hawk');
    return new HawkProvider({ proxyUrl: hawkUrl, model: model.slice(5) });
  }
  return new RemoteLLMProvider({ proxyUrl });
}

// ── Build tool layers from connected MCP servers + local WebMCP ───────
// Reads MCP server tools from the canvas store (populated by the singleton
// bridge at globalThis.__multiMcp) instead of owning a local McpMultiClient.
export function buildLayers(): ToolLayer[] {
  const result: ToolLayer[] = [];

  // MCP servers (remote) — read from canvas.dataServers (bridge-managed)
  for (const server of canvas.dataServers) {
    if (!server.connected || !Array.isArray(server.tools)) continue;
    const mcpLayer: McpLayer = {
      protocol: 'mcp',
      serverName: server.name,
      tools: fromMcpTools(server.tools as Parameters<typeof fromMcpTools>[0]),
    };
    result.push(mcpLayer);
  }

  // WebMCP server (local tricoteuses widgets)
  result.push(tricoteusesServer.layer());

  // AutoUI native widgets
  result.push(autoui.layer());

  return result;
}

// ── Build system prompt from layers ───────────────────────────────────
// Boilerplate only uses RemoteLLMProvider (proxy); Gemma native syntax is not needed here.
export function buildPrompt(layers: ToolLayer[]): string {
  return buildSystemPrompt(layers, { providerKind: 'generic' });
}

export { runAgentLoop, canvas };
export type { ChatMessage };
