// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — MultiMcpBridge
// Observes a canvas store with a `dataServers` field and reconciles the real
// MCP connection state with the user intent (`enabled`). Populates tools and
// recipes metadata back into the store. Framework-agnostic.
// ---------------------------------------------------------------------------

import { McpMultiClient } from './multi-client.js';
import type { McpTool, McpToolResult } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiMcpBridgeOptions {
  /** Accessor for the canvas store. Typically returns globalThis.__canvasVanilla. */
  getCanvas: () => any;
  /** Optional logger. */
  log?: (msg: string, data?: any) => void;
}

interface DataServerLike {
  name: string;
  url: string;
  enabled?: boolean;
  connected?: boolean;
}

interface RecipeItem {
  name: string;
  description?: string;
  body?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract recipes from an MCP tool response. Expects `res.content` as the
 * standard MCP content array; looks for a text chunk whose payload parses as
 * JSON and contains an array of `{ name, description?, body? }` items (or an
 * object with an `items`/`recipes` array).
 */
export function parseRecipesFromToolResponse(res: unknown): RecipeItem[] | null {
  if (!res || typeof res !== 'object') return null;
  const content = (res as any).content;
  if (!Array.isArray(content)) return null;

  for (const chunk of content) {
    if (!chunk || typeof chunk !== 'object') continue;
    if (chunk.type !== 'text' || typeof chunk.text !== 'string') continue;
    const text: string = chunk.text;
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      continue;
    }
    const items = extractItems(parsed);
    if (items) return items;
  }
  return null;
}

function extractItems(parsed: any): RecipeItem[] | null {
  const candidate = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed?.recipes)
        ? parsed.recipes
        : null;
  if (!candidate) return null;
  const out: RecipeItem[] = [];
  for (const it of candidate) {
    if (!it || typeof it !== 'object') continue;
    const name = typeof it.name === 'string' ? it.name : typeof it.id === 'string' ? it.id : null;
    if (!name) continue;
    const entry: RecipeItem = { name };
    if (typeof it.description === 'string') entry.description = it.description;
    if (typeof it.body === 'string') entry.body = it.body;
    out.push(entry);
  }
  return out.length > 0 ? out : null;
}

// ---------------------------------------------------------------------------
// MultiMcpBridge
// ---------------------------------------------------------------------------

export class MultiMcpBridge {
  private client: McpMultiClient;
  private unsub: (() => void) | null = null;
  /** server name -> url (for reverse lookup, since McpMultiClient keys by url) */
  private nameToUrl = new Map<string, string>();
  /** server names currently connected */
  private connected = new Set<string>();
  /** server names whose handshake is in-flight */
  private connecting = new Set<string>();
  private options: MultiMcpBridgeOptions;
  private started = false;

  constructor(options: MultiMcpBridgeOptions) {
    this.options = options;
    this.client = new McpMultiClient();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  start(): void {
    if (this.started) return;
    const canvas = this.options.getCanvas();
    if (canvas && typeof canvas.subscribe === 'function') {
      this.started = true;
      this.unsub = canvas.subscribe(() => {
        void this.reconcile();
      });
      void this.reconcile();
      return;
    }
    // Canvas not ready yet — retry shortly. Without this the bridge would
    // stay dead forever because no subscription was ever established.
    setTimeout(() => this.start(), 50);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    if (this.unsub) {
      try { this.unsub(); } catch { /* ignore */ }
      this.unsub = null;
    }
    void this.client.disconnectAll().catch(() => { /* ignore */ });
    this.connected.clear();
    this.connecting.clear();
    this.nameToUrl.clear();
  }

  // -------------------------------------------------------------------------
  // Imperative helpers
  // -------------------------------------------------------------------------

  /** Ensure a server is in the store with enabled=true; reconcile picks it up. */
  async connect(name: string, url: string): Promise<void> {
    const canvas = this.options.getCanvas();
    if (!canvas) return;
    canvas.addDataServer?.({ name, url });
    canvas.setDataServerEnabled?.(name, true);
    await this.reconcile();
  }

  /** Call a tool on a named server. */
  async callTool(serverName: string, toolName: string, args: unknown): Promise<McpToolResult> {
    const url = this.nameToUrl.get(serverName);
    if (!url) throw new Error(`MultiMcpBridge: server "${serverName}" is not connected`);
    return this.client.callToolOn(url, toolName, (args ?? {}) as Record<string, unknown>);
  }

  /** Direct access to the underlying multi-client (read-only usage preferred). */
  get multiClient(): McpMultiClient {
    return this.client;
  }

  /** True if a server with this name has completed its handshake. */
  hasServer(serverName: string): boolean {
    return this.connected.has(serverName);
  }

  /** Snapshot of currently connected server names. */
  connectedServers(): string[] {
    return Array.from(this.connected);
  }

  /**
   * Wait until every enabled data server in the canvas is connected, or the
   * timeout elapses. Resolves either way (no throw) — caller inspects
   * `connectedServers()` to decide what's reachable.
   */
  async waitForEnabledServers(timeoutMs = 5000): Promise<void> {
    const canvas = this.options.getCanvas();
    if (!canvas) return;
    const deadline = Date.now() + Math.max(0, timeoutMs);
    while (Date.now() < deadline) {
      const enabled = (Array.isArray(canvas.dataServers) ? canvas.dataServers : [])
        .filter((s: { enabled?: boolean }) => s?.enabled !== false)
        .map((s: { name: string }) => s.name);
      if (enabled.length === 0) return;
      const allReady = enabled.every((n: string) => this.connected.has(n));
      if (allReady) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // -------------------------------------------------------------------------
  // Reconciliation
  // -------------------------------------------------------------------------

  private async reconcile(): Promise<void> {
    const canvas = this.options.getCanvas();
    if (!canvas) return;
    const servers = (canvas.dataServers ?? []) as DataServerLike[];
    if (!Array.isArray(servers)) return;

    const seenNames = new Set<string>();
    for (const srv of servers) {
      if (!srv || typeof srv.name !== 'string' || typeof srv.url !== 'string') continue;
      // Empty URL means a legacy placeholder entry (see canvas.ensurePrimary).
      // Handshaking with '' resolves `fetch('')` against the current page origin,
      // producing a POST storm on the app root (405 loop).
      if (srv.url === '') continue;
      seenNames.add(srv.name);
      const key = srv.name;
      if (srv.enabled && !this.connected.has(key) && !this.connecting.has(key)) {
        void this.handshake(srv);
      } else if (!srv.enabled && this.connected.has(key)) {
        void this.disconnect(srv);
      }
    }

    // Disconnect servers that were removed from the store entirely
    for (const name of Array.from(this.connected)) {
      if (!seenNames.has(name)) {
        void this.disconnect({ name, url: this.nameToUrl.get(name) ?? '' });
      }
    }
  }

  private async handshake(srv: DataServerLike): Promise<void> {
    const canvas = this.options.getCanvas();
    this.connecting.add(srv.name);
    this.options.log?.(`[bridge] handshake start: ${srv.name}`, { url: srv.url });
    try {
      const { name: actualName, tools } = await this.client.addServer(srv.url);
      // The MCP server may return a different name than the one stored in the
      // canvas. Key the bridge by the canvas name so callers stay consistent.
      this.nameToUrl.set(srv.name, srv.url);
      this.connected.add(srv.name);

      // Try to fetch recipes via tool `list_recipes` if exposed.
      let recipes: RecipeItem[] = [];
      const hasListRecipes = tools.some((t: McpTool) => t.name === 'list_recipes');
      if (hasListRecipes) {
        try {
          const res = await this.client.callToolOn(srv.url, 'list_recipes', {});
          recipes = parseRecipesFromToolResponse(res) ?? [];
        } catch (err) {
          this.options.log?.(`[bridge] list_recipes failed for ${srv.name}`, err);
        }
      }

      canvas.setDataServerMeta?.(srv.name, {
        connected: true,
        tools,
        recipes,
        error: undefined,
        serverName: actualName,
      });
      this.options.log?.(`[bridge] connected: ${srv.name}`, { tools: tools.length, recipes: recipes.length });
    } catch (err: any) {
      const message = err?.message ? String(err.message) : String(err);
      canvas.setDataServerMeta?.(srv.name, {
        connected: false,
        tools: [],
        recipes: [],
        error: message,
      });
      this.options.log?.(`[bridge] handshake failed: ${srv.name}`, message);
    } finally {
      this.connecting.delete(srv.name);
    }
  }

  private async disconnect(srv: { name: string; url: string }): Promise<void> {
    const canvas = this.options.getCanvas();
    const url = srv.url || this.nameToUrl.get(srv.name);
    if (url) {
      try { await this.client.removeServer(url); } catch { /* ignore */ }
    }
    this.connected.delete(srv.name);
    this.nameToUrl.delete(srv.name);
    canvas?.setDataServerMeta?.(srv.name, { connected: false });
    this.options.log?.(`[bridge] disconnected: ${srv.name}`);
  }
}

// ---------------------------------------------------------------------------
// Singleton installer
// ---------------------------------------------------------------------------

/**
 * Install a singleton bridge on globalThis.__multiMcp. If a previous bridge
 * exists, it is stopped first (idempotent).
 */
export function installMultiMcpBridge(options: MultiMcpBridgeOptions): MultiMcpBridge {
  const g = globalThis as any;
  const existing = g.__multiMcp;
  if (existing && typeof existing.stop === 'function') {
    try { existing.stop(); } catch { /* ignore */ }
  }
  const bridge = new MultiMcpBridge(options);
  g.__multiMcp = bridge;
  bridge.start();
  return bridge;
}
