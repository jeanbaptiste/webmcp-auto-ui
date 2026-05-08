// recipe-browser — pure utility functions for browsing/filtering/exporting recipes

/**
 * Case-insensitive filter on name, description, server, and id fields.
 * Empty query returns all recipes.
 *
 * Match semantics: word-start. The query must start at a word boundary
 * (start of string, after non-word char, or after a `\b`). This drops
 * spurious substring matches like "hn" inside "technical" but keeps
 * meaningful ones like "hn" inside "HN" (standalone abbreviation) or
 * "hn-front-page" (id prefix). It also matches "hacker" inside
 * "HackerNews" since "Hacker" begins at the start of the word.
 */
export function filterRecipes<T extends { name: string; description?: string }>(
  recipes: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return recipes;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}`, 'i');
  return recipes.filter((r) => {
    const obj = r as Record<string, unknown>;
    const srv = (obj.server as string | undefined) ?? (obj.serverName as string | undefined) ?? '';
    const id = (obj.id as string | undefined) ?? '';
    return (
      re.test(r.name) ||
      (r.description ? re.test(r.description) : false) ||
      re.test(srv) ||
      re.test(id)
    );
  });
}

/**
 * Returns a new array sorted alphabetically by name (case-insensitive).
 * Does NOT mutate the input array.
 */
export function sortRecipes<T extends { name: string }>(recipes: T[]): T[] {
  return [...recipes].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
}

// Keys that belong in Recipe frontmatter (order matters for readability)
const RECIPE_FM_KEYS = ['id', 'name', 'description', 'when', 'components_used', 'servers', 'layout'] as const;
// Keys for McpRecipe frontmatter
const MCP_FM_KEYS = ['name', 'description'] as const;

function yamlValue(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'string') return value.includes(':') || value.includes('#') || value.includes('\n') ? JSON.stringify(value) : value;
  if (Array.isArray(value)) return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Reconstructs a markdown file from a recipe object.
 * Handles both Recipe (id, when, components_used, servers, layout, body)
 * and McpRecipe (name, description, body?) shapes.
 */
export function recipeToMarkdown(recipe: Record<string, unknown>): string {
  const isFullRecipe = 'id' in recipe || 'when' in recipe;
  const fmKeys = isFullRecipe ? RECIPE_FM_KEYS : MCP_FM_KEYS;

  const lines: string[] = ['---'];
  for (const key of fmKeys) {
    if (key in recipe && recipe[key] !== undefined) {
      lines.push(`${key}: ${yamlValue(recipe[key])}`);
    }
  }
  lines.push('---');

  const body = typeof recipe.body === 'string' ? recipe.body.trim() : '';
  if (body) {
    lines.push('', body);
  }

  return lines.join('\n') + '\n';
}

function sanitizeFilename(raw: string): string {
  return raw.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
}

/**
 * Creates a downloadable Blob from a recipe object.
 * Filename is derived from name or id, sanitized.
 */
export function recipeToDownloadBlob(
  recipe: Record<string, unknown>,
): { blob: Blob; filename: string } {
  const md = recipeToMarkdown(recipe);
  const rawName = (typeof recipe.name === 'string' && recipe.name)
    || (typeof recipe.id === 'string' && recipe.id)
    || 'recipe';
  const filename = sanitizeFilename(rawName) + '.md';
  return { blob: new Blob([md], { type: 'text/markdown' }), filename };
}
