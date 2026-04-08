// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — McpMultiClient
// Manages multiple simultaneous MCP server connections via McpClient instances.
// Zero dependencies, SSR-safe.
// ---------------------------------------------------------------------------

import { McpClient } from './client.js';
import type {
  McpTool,
  McpToolResult,
  McpClientOptions,
} from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConnectedServer {
  url: string;
  name: string;
  tools: McpTool[];
}

export type AggregatedTool = McpTool & { serverUrl: string; serverName: string };

// ---------------------------------------------------------------------------
// McpMultiClient
// ---------------------------------------------------------------------------

export class McpMultiClient {
  /** Ordered map — insertion order determines first-match priority */
  private servers = new Map<string, { client: McpClient; name: string; tools: McpTool[] }>();

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Add (or reconnect) an MCP server and return its name + tools.
   * If the URL is already registered, the old connection is removed first.
   */
  async addServer(
    url: string,
    options?: { headers?: Record<string, string> },
  ): Promise<{ name: string; tools: McpTool[] }> {
    // Reconnect semantics: remove existing connection for this URL
    if (this.servers.has(url)) {
      await this.removeServer(url);
    }

    const clientOptions: McpClientOptions | undefined = options?.headers
      ? { headers: options.headers }
      : undefined;

    const client = new McpClient(url, clientOptions);
    const initResult = await client.connect();
    const tools = await client.listTools();

    const name = initResult.serverInfo.name;
    this.servers.set(url, { client, name, tools });

    return { name, tools };
  }

  /**
   * Remove a server and disconnect its client.
   */
  async removeServer(url: string): Promise<void> {
    const entry = this.servers.get(url);
    if (!entry) return;
    await entry.client.disconnect();
    this.servers.delete(url);
  }

  /**
   * List all connected servers with their metadata.
   */
  listServers(): ConnectedServer[] {
    const result: ConnectedServer[] = [];
    for (const [url, entry] of this.servers) {
      result.push({ url, name: entry.name, tools: entry.tools });
    }
    return result;
  }

  /**
   * List ALL tools from ALL connected servers.
   * Each tool is augmented with its origin server URL and name.
   * Tools with the same name from different servers are all included.
   */
  listAllTools(): AggregatedTool[] {
    const result: AggregatedTool[] = [];
    for (const [url, entry] of this.servers) {
      for (const tool of entry.tools) {
        result.push({ ...tool, serverUrl: url, serverName: entry.name });
      }
    }
    return result;
  }

  /**
   * Call a tool by name. Automatically routes to the first server (insertion
   * order) that exposes a tool with the given name.
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<McpToolResult> {
    for (const [, entry] of this.servers) {
      const match = entry.tools.find((t) => t.name === name);
      if (match) {
        return entry.client.callTool(name, args);
      }
    }
    throw new Error(`McpMultiClient: no server exposes tool "${name}"`);
  }

  /**
   * Disconnect from all servers.
   */
  async disconnectAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [, entry] of this.servers) {
      promises.push(entry.client.disconnect());
    }
    await Promise.all(promises);
    this.servers.clear();
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  /** Number of connected servers. */
  get serverCount(): number {
    return this.servers.size;
  }

  /** True if at least one server is connected. */
  get hasConnections(): boolean {
    return this.servers.size > 0;
  }
}
