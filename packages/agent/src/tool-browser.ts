// tool-browser — pure utility functions for browsing/filtering tools

export interface BrowsableTool {
  name: string;
  description?: string;
  server?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Group tools by server name.
 * Returns a Map<serverName, tools[]> with alphabetically sorted tools in each group.
 */
export function groupToolsByServer(tools: BrowsableTool[]): Map<string, BrowsableTool[]> {
  const map = new Map<string, BrowsableTool[]>();
  for (const t of tools) {
    const key = t.server || 'Unknown';
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  // Sort tools within each group
  for (const [key, arr] of map) {
    map.set(key, arr.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
  }
  return map;
}

/**
 * Format a tool's input schema as a readable string.
 * Returns pretty-printed JSON, or null if no schema.
 */
export function formatToolSchema(tool: BrowsableTool): string | null {
  if (!tool.inputSchema) return null;
  return JSON.stringify(tool.inputSchema, null, 2);
}
