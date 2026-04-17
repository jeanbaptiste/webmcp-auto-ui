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

    const SERVER_NAME_MAP: Record<string, string> = { 'moulineuse': 'Tricoteuses' };
    const name = SERVER_NAME_MAP[initResult.serverInfo.name] ?? initResult.serverInfo.name;
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
   * Duplicate tool names across servers are prefixed with the server name
   * (e.g. "wikipedia__search") to satisfy the Claude API uniqueness constraint.
   */
  listAllTools(): AggregatedTool[] {
    // First pass: count occurrences of each tool name across all servers
    const nameCounts = new Map<string, number>();
    for (const [, entry] of this.servers) {
      for (const tool of entry.tools) {
        nameCounts.set(tool.name, (nameCounts.get(tool.name) ?? 0) + 1);
      }
    }

    // Second pass: build result, prefixing duplicates with serverName
    const result: AggregatedTool[] = [];
    for (const [url, entry] of this.servers) {
      for (const tool of entry.tools) {
        const isDuplicate = (nameCounts.get(tool.name) ?? 0) > 1;
        if (isDuplicate) {
          const prefix = this.normalizeServerName(entry.name);
          result.push({
            ...tool,
            name: `${prefix}__${tool.name}`,
            description: `[${entry.name}] ${tool.description ?? ''}`,
            serverUrl: url,
            serverName: entry.name,
          });
        } else {
          result.push({ ...tool, serverUrl: url, serverName: entry.name });
        }
      }
    }
    return result;
  }

  /**
   * Call a tool by name. Automatically routes to the correct server.
   * Supports both plain names ("search") and prefixed names ("wikipedia__search")
   * for disambiguated duplicates.
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<McpToolResult> {
    // 1. Exact match on original tool name (unprefixed)
    for (const [, entry] of this.servers) {
      const match = entry.tools.find((t) => t.name === name);
      if (match) {
        return entry.client.callTool(name, args);
      }
    }

    // 2. Prefixed name: "serverprefix__realToolName"
    const separatorIdx = name.indexOf('__');
    if (separatorIdx !== -1) {
      const prefix = name.slice(0, separatorIdx);
      const realName = name.slice(separatorIdx + 2);
      for (const [, entry] of this.servers) {
        if (this.normalizeServerName(entry.name) === prefix) {
          const match = entry.tools.find((t) => t.name === realName);
          if (match) {
            return entry.client.callTool(realName, args);
          }
        }
      }
    }

    throw new Error(`McpMultiClient: no server exposes tool "${name}"`);
  }

  /**
   * Call a tool on a SPECIFIC server (identified by URL).
   * Use this instead of callTool() when the same tool name may exist on multiple
   * servers and you need to target one specifically (e.g. discovery `list_recipes`).
   */
  async callToolOn(serverUrl: string, name: string, args?: Record<string, unknown>): Promise<McpToolResult> {
    const entry = this.servers.get(serverUrl);
    if (entry) return entry.client.callTool(name, args);
    throw new Error(`McpMultiClient: no server at ${serverUrl}`);
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
  // Private helpers
  // -------------------------------------------------------------------------

  /** Convert a server name to a snake_case prefix for tool name disambiguation. */
  private normalizeServerName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
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
