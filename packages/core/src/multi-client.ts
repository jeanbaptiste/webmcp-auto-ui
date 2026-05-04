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

    // -----------------------------------------------------------------------
    // Cosmetic rebrand map: some MCP servers expose a `serverInfo.name` that
    // doesn't match the public-facing brand we want to display in the UI. The
    // Tricoteuses MCP server, for instance, declares itself as "moulineuse"
    // (internal codename) but ships under the "Tricoteuses" brand. Rather
    // than patch the upstream server, we rebadge the name on the client.
    //
    // TODO(2026-05-03): migrate this to an external config (e.g. a per-app
    // `serverAliases` option passed to McpMultiClient) so that the core
    // package has zero brand-specific knowledge baked in.
    // -----------------------------------------------------------------------
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
