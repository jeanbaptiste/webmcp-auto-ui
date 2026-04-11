/**
 * FONC-inspired message bus for inter-component communication.
 *
 * Inspired by Alan Kay's "messaging not calling" principle (FONC / STEPS):
 * components never call each other directly — they send messages on named
 * channels, and the bus delivers them. This decouples senders from receivers,
 * enabling composition without tight coupling.
 *
 * Uses Svelte 5 runes ($state) internally for reactivity.
 */

export interface BusMessage {
  from: string;
  to: string | '*';
  channel: string;
  payload: unknown;
  timestamp: number;
}

type MessageHandler = (msg: BusMessage) => void;

interface BusEntry {
  id: string;
  type: string;
  channels: Set<string>;
  handler: MessageHandler;
}

function createBus() {
  let entries = $state<Map<string, BusEntry>>(new Map());
  let lastMessage = $state<BusMessage | null>(null);

  // ── Link groups (reactive) ──────────────────────────────────────
  /** groupId → Set of widgetIds */
  let groups = $state<Map<string, Set<string>>>(new Map());
  /** widgetId → Set of groupIds (reverse index) */
  let widgetGroups = $state<Map<string, Set<string>>>(new Map());

  /**
   * Register a component on the bus.
   * Returns an unregister function.
   */
  function register(
    id: string,
    type: string,
    channels: string[],
    handler: MessageHandler,
  ): () => void {
    entries.set(id, {
      id,
      type,
      channels: new Set(channels),
      handler,
    });
    // Return unregister
    return () => { entries.delete(id); };
  }

  /**
   * Send a message to a specific component by id.
   */
  function send(from: string, to: string, channel: string, payload: unknown) {
    const msg: BusMessage = { from, to, channel, payload, timestamp: Date.now() };
    lastMessage = msg;
    const entry = entries.get(to);
    if (entry && (entry.channels.has(channel) || entry.channels.has('*'))) {
      entry.handler(msg);
    }
  }

  /**
   * Broadcast a message to all components listening on a channel.
   */
  function broadcast(from: string, channel: string, payload: unknown) {
    const msg: BusMessage = { from, to: '*', channel, payload, timestamp: Date.now() };
    lastMessage = msg;
    for (const entry of entries.values()) {
      if (entry.id !== from && (entry.channels.has(channel) || entry.channels.has('*'))) {
        entry.handler(msg);
      }
    }
  }

  /**
   * Subscribe to messages on specific channels (for non-component listeners).
   * Returns an unsubscribe function.
   */
  function subscribe(
    channels: string[],
    handler: MessageHandler,
  ): () => void {
    const id = '_sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    return register(id, '_subscriber', channels, handler);
  }

  /**
   * List all registered component IDs and their types.
   */
  function listPeers(): Array<{ id: string; type: string }> {
    return Array.from(entries.values()).map(e => ({ id: e.id, type: e.type }));
  }

  // ── Link management ──────────────────────────────────────────────

  /**
   * Link two or more widgets into a group.
   * Returns the groupId (auto-generated if not provided).
   */
  function link(widgetIds: string[], groupId?: string): string {
    const gid = groupId ?? '_grp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    let group = groups.get(gid);
    if (!group) {
      group = new Set();
      groups.set(gid, group);
    }
    for (const wid of widgetIds) {
      group.add(wid);
      let wg = widgetGroups.get(wid);
      if (!wg) {
        wg = new Set();
        widgetGroups.set(wid, wg);
      }
      wg.add(gid);
    }
    broadcast('_system', 'link', { action: 'linked', groupId: gid, widgetIds });
    return gid;
  }

  /**
   * Unlink a widget from a group.
   */
  function unlink(widgetId: string, groupId: string): void {
    const group = groups.get(groupId);
    if (group) {
      group.delete(widgetId);
      if (group.size === 0) groups.delete(groupId);
    }
    const wg = widgetGroups.get(widgetId);
    if (wg) {
      wg.delete(groupId);
      if (wg.size === 0) widgetGroups.delete(widgetId);
    }
    broadcast('_system', 'link', { action: 'unlinked', groupId, widgetId });
  }

  /**
   * Get the groupIds a widget belongs to.
   */
  function getLinks(widgetId: string): string[] {
    const wg = widgetGroups.get(widgetId);
    return wg ? Array.from(wg) : [];
  }

  /**
   * Get all widgetIds in a group.
   */
  function getGroup(groupId: string): string[] {
    const group = groups.get(groupId);
    return group ? Array.from(group) : [];
  }

  /**
   * Check if a widget has any links.
   */
  function hasLinks(widgetId: string): boolean {
    const wg = widgetGroups.get(widgetId);
    return !!wg && wg.size > 0;
  }

  return {
    register,
    send,
    broadcast,
    subscribe,
    listPeers,
    link,
    unlink,
    getLinks,
    getGroup,
    hasLinks,
    get lastMessage() { return lastMessage; },
    get peerCount() { return entries.size; },
  };
}

/** Singleton message bus — shared across all components in the same page */
export const bus = createBus();
