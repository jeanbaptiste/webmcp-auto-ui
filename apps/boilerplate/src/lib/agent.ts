import { McpMultiClient } from '@webmcp-auto-ui/core';
import {
  RemoteLLMProvider, runAgentLoop, buildSystemPrompt,
  fromMcpTools, autoui,
} from '@webmcp-auto-ui/agent';
import type { ChatMessage, ToolLayer, McpLayer } from '@webmcp-auto-ui/agent';
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
import { tricoteusesServer } from './widgets/register';

// ── Multi-MCP client ──────────────────────────────────────────────────
export const multiClient = new McpMultiClient();

// ── Anthropic provider via local proxy ────────────────────────────────
export function createProvider(proxyUrl: string) {
  return new RemoteLLMProvider({ proxyUrl });
}

// ── Build tool layers from connected MCP servers + local WebMCP ───────
export function buildLayers(): ToolLayer[] {
  const result: ToolLayer[] = [];

  // MCP servers (remote)
  for (const server of multiClient.listServers()) {
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
export function buildPrompt(layers: ToolLayer[]): string {
  return buildSystemPrompt(layers);
}

export { runAgentLoop, canvas };
export type { ChatMessage };
