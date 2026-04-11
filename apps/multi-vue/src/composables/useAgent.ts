import { ref, shallowRef } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import {
  AnthropicProvider,
  runAgentLoop,
  buildSystemPrompt,
  trimConversationHistory,
} from '@webmcp-auto-ui/agent';
import type {
  ChatMessage,
  ToolLayer,
  AgentCallbacks,
  LLMId,
} from '@webmcp-auto-ui/agent';
import { McpMultiClient } from '@webmcp-auto-ui/core';

export interface WidgetBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface UseAgentReturn {
  messages: Ref<{ id: string; role: 'user' | 'assistant' | 'system'; text: string }[]>;
  widgets: Ref<WidgetBlock[]>;
  generating: Ref<boolean>;
  elapsed: Ref<number>;
  toolCount: Ref<number>;
  lastTool: Ref<string>;
  llm: Ref<LLMId>;
  mcpClient: ShallowRef<McpMultiClient>;
  connectedMcpUrls: Ref<string[]>;
  send: (msg: string, layers: ToolLayer[]) => Promise<void>;
  stop: () => void;
  connectMcp: (url: string) => Promise<void>;
  disconnectMcp: (url: string) => Promise<void>;
  clearWidgets: () => void;
}

let uidCounter = 0;
function uid(): string {
  return 'u' + Date.now().toString(36) + (uidCounter++).toString(36);
}

export function useAgent(): UseAgentReturn {
  const messages = ref<{ id: string; role: 'user' | 'assistant' | 'system'; text: string }[]>([]);
  const widgets = ref<WidgetBlock[]>([]);
  const generating = ref(false);
  const elapsed = ref(0);
  const toolCount = ref(0);
  const lastTool = ref('');
  const llm = ref<LLMId>('sonnet');

  const mcpClient = shallowRef(new McpMultiClient());
  const connectedMcpUrls = ref<string[]>([]);

  let conversationHistory: ChatMessage[] = [];
  let abortController: AbortController | null = null;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  const provider = new AnthropicProvider({ proxyUrl: '/api/chat' });

  function clearWidgets() {
    widgets.value = [];
  }

  async function connectMcp(url: string) {
    if (!url.trim() || connectedMcpUrls.value.includes(url)) return;
    await mcpClient.value.addServer(url.trim());
    connectedMcpUrls.value = [...connectedMcpUrls.value, url.trim()];
  }

  async function disconnectMcp(url: string) {
    await mcpClient.value.removeServer(url);
    connectedMcpUrls.value = connectedMcpUrls.value.filter(u => u !== url);
  }

  function stop() {
    abortController?.abort();
  }

  async function send(msg: string, layers: ToolLayer[]) {
    if (!msg.trim() || generating.value) return;

    // Reset per-turn state
    elapsed.value = 0;
    toolCount.value = 0;
    lastTool.value = '';

    const userMsgId = uid();
    messages.value = [...messages.value, { id: userMsgId, role: 'user', text: msg }];

    const assistantMsgId = uid();
    messages.value = [...messages.value, { id: assistantMsgId, role: 'assistant', text: '...' }];

    generating.value = true;
    abortController = new AbortController();

    timerInterval = setInterval(() => { elapsed.value++; }, 1000);

    // Merge MCP layers if connected
    const allLayers = [...layers];
    if (mcpClient.value.hasConnections) {
      const mcpTools = mcpClient.value.listAllTools();
      const mcpLayer: ToolLayer = {
        protocol: 'mcp' as const,
        serverName: mcpClient.value.listServers().map(s => s.name).join(', '),
        tools: mcpTools as any,
      };
      allLayers.unshift(mcpLayer);
    }

    provider.setModel(llm.value as any);

    const systemPrompt = buildSystemPrompt(allLayers);

    const callbacks: AgentCallbacks = {
      onWidget: (type, data) => {
        const id = uid();
        widgets.value = [...widgets.value, { id, type, data }];
        return { id };
      },
      onClear: () => { widgets.value = []; },
      onText: (text) => {
        if (!text) return;
        const clean = text
          .replace(/<\|tool_call>[\s\S]*?(<tool_call\|>)?/g, '')
          .replace(/<\|tool_response>[\s\S]*?(<tool_response\|>)?/g, '')
          .replace(/<\|"\|>/g, '')
          .trim();
        if (clean) {
          messages.value = messages.value.map(m =>
            m.id === assistantMsgId ? { ...m, text: clean } : m,
          );
        }
      },
      onToolCall: (call) => {
        toolCount.value++;
        lastTool.value = call.name;
      },
    };

    try {
      const result = await runAgentLoop(msg, {
        client: mcpClient.value.hasConnections ? mcpClient.value as any : undefined,
        provider,
        systemPrompt,
        layers: allLayers,
        maxIterations: 15,
        maxTokens: 4096,
        initialMessages: trimConversationHistory(conversationHistory, 150_000),
        callbacks,
        signal: abortController.signal,
      });

      if (result) {
        conversationHistory = result.messages;
        if (result.text) {
          messages.value = messages.value.map(m =>
            m.id === assistantMsgId ? { ...m, text: result.text! } : m,
          );
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      messages.value = messages.value.map(m =>
        m.id === assistantMsgId ? { ...m, role: 'system', text: errMsg } : m,
      );
    } finally {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      abortController = null;
      generating.value = false;
    }
  }

  return {
    messages,
    widgets,
    generating,
    elapsed,
    toolCount,
    lastTool,
    llm,
    mcpClient,
    connectedMcpUrls,
    send,
    stop,
    connectMcp,
    disconnectMcp,
    clearWidgets,
  };
}
