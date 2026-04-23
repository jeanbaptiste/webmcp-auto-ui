// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — McpClient
// Streamable HTTP MCP client. Zero dependencies (native fetch).
// Framework-agnostic.
// ---------------------------------------------------------------------------

import type {
  McpServerInfo,
  McpCapabilities,
  McpInitializeResult,
  McpTool,
  McpToolResult,
  McpListToolsResult,
  McpClientOptions,
  JsonRpcRequest,
  JsonRpcResponse,
} from './types.js';

const DEFAULTS = {
  clientName: 'webmcp-auto-ui',
  clientVersion: '0.1.0',
  timeout: 30_000,
  headers: {} as Record<string, string>,
  autoReconnect: true,
  maxReconnectAttempts: 3,
} satisfies Required<McpClientOptions>;

export class McpClient {
  private url: string;
  private options: Required<McpClientOptions>;
  private sessionId: string | null = null;
  private tools: McpTool[] = [];
  private serverInfo: McpServerInfo | null = null;
  private capabilities: McpCapabilities | null = null;
  private connected = false;
  private rpcIdCounter = 0;
  private isReconnecting = false;
  private reconnectPromise: Promise<void> | null = null;
  private closing = false;

  constructor(url: string, options?: McpClientOptions) {
    this.url = url;
    this.options = { ...DEFAULTS, ...options, headers: { ...DEFAULTS.headers, ...options?.headers } };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async connect(): Promise<McpInitializeResult> {
    this.closing = false;
    const result = await this.rpc<McpInitializeResult>('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { roots: { listChanged: true } },
      clientInfo: {
        name: this.options.clientName,
        version: this.options.clientVersion,
      },
    }, 0, AbortSignal.timeout(10_000));

    this.serverInfo = result.serverInfo;
    this.capabilities = result.capabilities;
    this.connected = true;

    // Send initialized notification (required by MCP protocol)
    await this.notify('notifications/initialized');

    return result;
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.rpc<McpListToolsResult>('tools/list');
    this.tools = result.tools ?? [];
    return this.tools;
  }

  async callTool(name: string, args?: Record<string, unknown>): Promise<McpToolResult> {
    return this.rpc<McpToolResult>('tools/call', {
      name,
      arguments: args ?? {},
    });
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    if (this.sessionId) {
      // Best-effort DELETE — log warning if it fails
      const headers: Record<string, string> = {
        'Mcp-Session-Id': this.sessionId,
        ...this.options.headers,
      };
      fetch(this.url, { method: 'DELETE', headers }).catch((err) =>
        console.warn('[mcp] DELETE failed', err)
      );
    }
    this.sessionId = null;
    this.tools = [];
    this.serverInfo = null;
    this.capabilities = null;
    this.connected = false;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  isConnected(): boolean {
    return this.connected;
  }

  getServerInfo(): McpServerInfo | null {
    return this.serverInfo;
  }

  getCapabilities(): McpCapabilities | null {
    return this.capabilities;
  }

  getTools(): McpTool[] {
    return this.tools;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    const body = { jsonrpc: '2.0', method, params };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...this.options.headers,
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeout);
    await fetch(this.url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal }).catch((e) => console.warn('[McpClient] notification failed:', e)).finally(() => clearTimeout(timer));
  }

  private async rpc<T>(
    method: string,
    params?: Record<string, unknown>,
    attempt = 0,
    externalSignal?: AbortSignal,
  ): Promise<T> {
    const id = ++this.rpcIdCounter;

    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...this.options.headers,
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeout);
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    let response: Response;
    try {
      response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof TypeError) {
        throw new Error(`MCP connection failed (CORS or network): ${(err as Error).message}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }

    // Capture session id (case-insensitive header search)
    const newSessionId =
      response.headers.get('mcp-session-id') ??
      response.headers.get('Mcp-Session-Id');
    if (newSessionId) {
      this.sessionId = newSessionId;
    }

    // Auto-reconnect on 404 (session expired)
    if (response.status === 404 && this.options.autoReconnect) {
      if (this.isReconnecting) {
        // Another call already triggered reconnect — wait for it then retry.
        // Increment attempt to enforce the maxReconnectAttempts cap on this
        // concurrent path as well; otherwise we could loop forever if the
        // session keeps expiring.
        await this.reconnectPromise;
        if (attempt >= this.options.maxReconnectAttempts) {
          throw new Error(`MCP session expired and reconnect failed after ${attempt} attempts`);
        }
        return this.rpc<T>(method, params, attempt + 1);
      }
      if (attempt < this.options.maxReconnectAttempts) {
        this.isReconnecting = true;
        this.sessionId = null;
        this.connected = false;
        const backoffMs = 500 * (attempt + 1);
        this.reconnectPromise = (async () => {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          if (this.closing) return;
          await this.connect();
        })().finally(() => {
          this.isReconnecting = false;
          this.reconnectPromise = null;
        });
        await this.reconnectPromise;
        if (this.closing) throw new Error('MCP client was closed during reconnect');
        return this.rpc<T>(method, params, attempt + 1);
      }
      throw new Error(`MCP session expired and reconnect failed after ${attempt} attempts`);
    }

    if (!response.ok) {
      throw new Error(`MCP HTTP error ${response.status}: ${response.statusText}`);
    }

    const raw = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    let rpcResponse: JsonRpcResponse<T>;
    if (contentType.includes('text/event-stream')) {
      rpcResponse = this.parseSseResponse(raw) as JsonRpcResponse<T>;
    } else {
      rpcResponse = JSON.parse(raw) as JsonRpcResponse<T>;
    }

    if (rpcResponse.error) {
      throw new Error(
        `MCP JSON-RPC error ${rpcResponse.error.code}: ${rpcResponse.error.message}`
      );
    }

    return rpcResponse.result as T;
  }

  private parseSseResponse(raw: string): JsonRpcResponse {
    const lines = raw.split('\n');
    let accumulated = '';
    let lastResponse: JsonRpcResponse | null = null;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        accumulated += line.slice(6).trim();
        try {
          const parsed = JSON.parse(accumulated) as JsonRpcResponse;
          // If an intermediate response has an error, surface it immediately
          // rather than silently discarding it in favour of a later response.
          if (parsed.error) {
            return parsed;
          }
          lastResponse = parsed;
          accumulated = '';
        } catch {
          // Incomplete JSON — keep accumulating
        }
      } else if (line === '') {
        // SSE event separator (blank line) — reset accumulation for next event
        accumulated = '';
      }
    }

    // MCP convention: for multiple complete JSON objects, take the last one.
    if (lastResponse) {
      return lastResponse;
    }

    // Fallback: try parsing the whole string as plain JSON
    try {
      return JSON.parse(raw) as JsonRpcResponse;
    } catch {
      throw new Error('McpClient: failed to parse SSE or JSON response');
    }
  }
}
