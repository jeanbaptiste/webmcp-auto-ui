// Recipe loader — imports auto-generated .md strings, parses them, exports ready-to-use recipes

import { parseFrontmatter } from '@webmcp-auto-ui/core';
import type { Recipe } from './types.js';
import { RAW_RECIPES } from './_generated.js';
import { registerRecipes } from '../recipe-registry.js';

export type { Recipe, McpRecipe } from './types.js';

/**
 * Parse a single recipe from its raw markdown string.
 *
 * Supports two formats:
 * - **Structured**: YAML frontmatter between `---` delimiters + markdown body
 * - **Freeform**: plain markdown without frontmatter (id derived from fileKey)
 *
 * @param raw - The raw markdown string
 * @param fileKey - Optional file key (e.g. "gallery-images") used as fallback id for freeform recipes
 */
export function parseRecipe(raw: string, fileKey?: string): Recipe {
  const { frontmatter, body } = parseFrontmatter(raw);

  // No frontmatter found → freeform recipe
  if (Object.keys(frontmatter).length === 0) {
    return parseRecipeFreeform(raw, fileKey);
  }

  return {
    id: (frontmatter.id as string) ?? fileKey ?? '',
    name: (frontmatter.name as string) ?? (frontmatter.id as string) ?? fileKey ?? '',
    description: frontmatter.description as string | undefined,
    components_used: parseStringArray(frontmatter.components_used),
    layout: frontmatter.layout as Recipe['layout'] | undefined,
    interactions: parseInteractions(frontmatter.interactions),
    when: (frontmatter.when as string) ?? '',
    servers: parseStringArray(frontmatter.servers),
    body: body.trim(),
  };
}

/** Parse a freeform .md recipe (no frontmatter). Extracts id from fileKey, name from first heading. */
function parseRecipeFreeform(raw: string, fileKey?: string): Recipe {
  const body = raw.trim();
  const headingMatch = body.match(/^#+ +(.+)$/m);
  const name = headingMatch?.[1] ?? fileKey ?? 'untitled';
  const id = fileKey ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const whenMatch = body.match(/##\s*Quand[^\n]*\n([\s\S]*?)(?=\n##|\n$|$)/i);
  const when = whenMatch?.[1]?.trim().split('\n')[0] ?? '';

  return { id, name, when, body };
}

/** Parse all raw recipe strings into Recipe objects. Skips invalid ones with a warning. */
export function parseRecipes(raws: Record<string, string>): Recipe[] {
  const recipes: Recipe[] = [];
  for (const [key, raw] of Object.entries(raws)) {
    try {
      recipes.push(parseRecipe(raw, key));
    } catch (e) {
      console.warn(`[recipes] Failed to parse "${key}":`, e);
    }
  }
  return recipes;
}

function parseStringArray(val: unknown): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return undefined;
}

function parseInteractions(val: unknown): Recipe['interactions'] | undefined {
  if (!Array.isArray(val)) return undefined;
  return val.filter(
    (v): v is { source: string; target: string; event: string; action: string } =>
      typeof v === 'object' && v !== null && 'source' in v && 'target' in v,
  );
}

/** All built-in WebMCP UI recipes, parsed and ready to use */
export const WEBMCP_RECIPES = parseRecipes(RAW_RECIPES);

// Auto-populate the registry with built-in recipes
registerRecipes(WEBMCP_RECIPES);
