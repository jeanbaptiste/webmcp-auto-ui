/**
 * Normalize MCP tool responses to an array. Handles common envelopes.
 * Tries: direct array → .data → .results → .rows → .entries → .items → .feed.entry → .properties.parameter → []
 */
export function unwrap(r: unknown): any[] {
  if (Array.isArray(r)) return r;
  if (r == null || typeof r !== 'object') return [];
  const o = r as any;
  return o.data ?? o.results ?? o.rows ?? o.entries ?? o.items
       ?? o.feed?.entry ?? o.properties?.parameter ?? [];
}
