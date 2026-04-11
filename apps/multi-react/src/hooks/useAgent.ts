import { useState, useCallback, useRef } from 'react';
import type { WebMcpServer, McpTool } from '@webmcp-auto-ui/core';
import {
  AnthropicProvider,
  runAgentLoop,
  buildSystemPrompt,
  autoui,
  fromMcpTools,
} from '@webmcp-auto-ui/agent';
import type {
  ChatMessage,
  ToolLayer,
  McpLayer,
  RemoteModelId,
} from '@webmcp-auto-ui/agent';
import { McpClient } from '@webmcp-auto-ui/core';

export interface WidgetItem {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

interface UseAgentOptions {
  servers: WebMcpServer[];
  model: RemoteModelId;
}

let _uid = 0;
function uid() {
  return 'msg_' + (++_uid) + '_' + Math.random().toString(36).slice(2, 5);
}

export function useAgent({ servers, model }: UseAgentOptions) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [sending, setSending] = useState(false);

  // MCP state
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpConnected, setMcpConnected] = useState(false);
  const [mcpName, setMcpName] = useState('');
  const [mcpConnecting, setMcpConnecting] = useState(false);
  const mcpClientRef = useRef<McpClient | null>(null);
  const mcpToolsRef = useRef<McpTool[]>([]);

  const conversationRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const providerRef = useRef<AnthropicProvider>(
    new AnthropicProvider({ proxyUrl: '/api/chat' }),
  );

  const connectMcp = useCallback(async () => {
    if (!mcpUrl.trim()) return;
    setMcpConnecting(true);
    try {
      const client = new McpClient(mcpUrl.trim());
      await client.connect();
      const tools = await client.listTools();
      mcpClientRef.current = client;
      mcpToolsRef.current = tools;
      setMcpConnected(true);
      setMcpName(mcpUrl.trim());
    } catch (e) {
      console.error('MCP connect failed:', e);
      setMcpConnected(false);
    } finally {
      setMcpConnecting(false);
    }
  }, [mcpUrl]);

  const disconnectMcp = useCallback(() => {
    mcpClientRef.current = null;
    mcpToolsRef.current = [];
    setMcpConnected(false);
    setMcpName('');
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

      const userMsg: MessageItem = { id: uid(), role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);
      abortRef.current = new AbortController();

      // Update provider model
      providerRef.current.setModel(model);

      // Build layers: WebMCP servers + autoui + optional MCP
      const layers: ToolLayer[] = [];

      if (mcpConnected && mcpToolsRef.current.length > 0) {
        const mcpLayer: McpLayer = {
          protocol: 'mcp',
          serverName: mcpName || 'mcp',
          tools: fromMcpTools(mcpToolsRef.current),
        };
        layers.push(mcpLayer);
      }

      for (const s of servers) {
        layers.push(s.layer());
      }
      layers.push(autoui.layer());

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '...' },
      ]);

      try {
        const result = await runAgentLoop(text, {
          client: mcpConnected && mcpClientRef.current ? mcpClientRef.current as any : undefined,
          provider: providerRef.current,
          systemPrompt: buildSystemPrompt(layers),
          maxIterations: 15,
          maxTokens: 4096,
          initialMessages: conversationRef.current,
          layers,
          signal: abortRef.current.signal,
          callbacks: {
            onWidget: (type, data) => {
              const id =
                'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
              setWidgets((prev) => [...prev, { id, type, data }]);
              return { id };
            },
            onClear: () => setWidgets([]),
            onText: (text) => {
              if (text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: text } : m,
                  ),
                );
              }
            },
            onToolCall: (call) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `[${call.name}]` }
                    : m,
                ),
              );
            },
          },
        });

        if (result) {
          conversationRef.current = result.messages;
          if (result.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: result.text } : m,
              ),
            );
          }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${errMsg}` } : m,
          ),
        );
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [sending, model, servers, mcpConnected, mcpName],
  );

  const clearWidgets = useCallback(() => setWidgets([]), []);

  return {
    messages,
    widgets,
    sending,
    sendMessage,
    clearWidgets,
    mcpUrl,
    setMcpUrl,
    mcpConnected,
    mcpName,
    mcpConnecting,
    connectMcp,
    disconnectMcp,
  };
}
