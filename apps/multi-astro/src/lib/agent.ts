/**
 * Agent setup — builds layers from enabled servers and runs the agent loop.
 */

import { mountWidget } from '@webmcp-auto-ui/core';
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import {
  AnthropicProvider,
  runAgentLoop,
  buildSystemPrompt,
  type ToolLayer,
  type ChatMessage,
} from '@webmcp-auto-ui/agent';
import { autouivanilla } from '@webmcp-auto-ui/widgets-vanilla';
import { d3server } from '@webmcp-auto-ui/widgets-d3';
import { createCanvas2dServer } from '@webmcp-auto-ui/widgets-canvas2d';
import { mermaidServer } from '@webmcp-auto-ui/widgets-mermaid';
import { plotlyServer } from '@webmcp-auto-ui/widgets-plotly';
import {
  servers,
  generating,
  agentProgress,
  addMessage,
  addWidget,
  clearWidgets,
  type ServerEntry,
} from './stores.js';

// ── Server registry ─────────────────────────────────────────────────────

const canvas2dServer = createCanvas2dServer();

const SERVER_MAP: Record<string, WebMcpServer> = {
  vanilla: autouivanilla,
  d3: d3server,
  canvas2d: canvas2dServer,
  mermaid: mermaidServer,
  plotly: plotlyServer,
};

export function getEnabledServers(): WebMcpServer[] {
  return servers.value
    .filter((s: ServerEntry) => s.enabled)
    .map((s: ServerEntry) => SERVER_MAP[s.key])
    .filter(Boolean);
}

export function getAllServers(): WebMcpServer[] {
  return Object.values(SERVER_MAP);
}

// ── Mount widget helper ─────────────────────────────────────────────────

export function mountWidgetInContainer(
  container: HTMLElement,
  type: string,
  data: Record<string, unknown>,
): (() => void) | void {
  return mountWidget(container, type, data, getEnabledServers());
}

// ── Provider ────────────────────────────────────────────────────────────

const provider = new AnthropicProvider({ proxyUrl: '/api/chat' });

// ── Conversation history for multi-turn ─────────────────────────────────

let conversationHistory: ChatMessage[] = [];

// ── Send message ────────────────────────────────────────────────────────

export async function sendMessage(text: string): Promise<void> {
  if (!text.trim() || generating.value) return;

  addMessage('user', text);
  generating.set(true);
  agentProgress.set({ elapsed: 0, toolCalls: 0, lastTool: '' });

  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed++;
    agentProgress.update(p => ({ ...p, elapsed }));
  }, 1000);

  const enabledServers = getEnabledServers();
  const layers: ToolLayer[] = enabledServers.map(s => s.layer());

  try {
    const result = await runAgentLoop(text, {
      provider,
      layers,
      maxIterations: 15,
      maxTokens: 4096,
      cacheEnabled: true,
      initialMessages: conversationHistory,
      callbacks: {
        onWidget: (type, data) => {
          const id = addWidget(type, data);
          return { id };
        },
        onClear: () => clearWidgets(),
        onText: (t) => {
          // Update the assistant bubble in real-time (handled by chat panel listener)
        },
        onToolCall: (call) => {
          agentProgress.update(p => ({
            ...p,
            toolCalls: p.toolCalls + 1,
            lastTool: call.name,
          }));
        },
      },
    });

    if (result) {
      conversationHistory = result.messages;
      if (result.text) {
        addMessage('assistant', result.text);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    addMessage('system', msg);
  } finally {
    clearInterval(timer);
    generating.set(false);
  }
}
