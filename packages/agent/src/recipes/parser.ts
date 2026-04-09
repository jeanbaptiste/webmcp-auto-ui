// Frontmatter parser for recipe .md files
// Parses YAML-like frontmatter + markdown body into a Recipe object

import type { Recipe } from './types.js';

/**
 * Parse a single recipe from its raw markdown string.
 *
 * Supports two formats:
 * - **Structured**: YAML-like frontmatter between `---` delimiters + markdown body
 * - **Freeform**: plain markdown without frontmatter (id derived from fileKey)
 *
 * @param raw - The raw markdown string
 * @param fileKey - Optional file key (e.g. "gallery-images") used as fallback id for freeform recipes
 */
export function parseRecipe(raw: string, fileKey?: string): Recipe {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    // Freeform recipe: no frontmatter — derive metadata from content
    return parseRecipeFreeform(raw, fileKey);
  }

  const frontmatter = parseFrontmatter(match[1]);
  const body = match[2].trim();

  return {
    id: frontmatter.id as string ?? fileKey ?? '',
    name: frontmatter.name as string ?? frontmatter.id as string ?? fileKey ?? '',
    description: frontmatter.description as string | undefined,
    components_used: parseStringArray(frontmatter.components_used),
    layout: frontmatter.layout as Recipe['layout'] | undefined,
    interactions: parseInteractions(frontmatter.interactions),
    when: frontmatter.when as string ?? '',
    servers: parseStringArray(frontmatter.servers),
    body,
  };
}

/** Parse a freeform .md recipe (no frontmatter). Extracts id from fileKey, name from first heading. */
function parseRecipeFreeform(raw: string, fileKey?: string): Recipe {
  const body = raw.trim();
  // Try to extract name from first markdown heading
  const headingMatch = body.match(/^#+ +(.+)$/m);
  const name = headingMatch?.[1] ?? fileKey ?? 'untitled';
  const id = fileKey ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Try to extract a "when" hint from the first paragraph or a "## Quand" section
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

// ── Internal helpers ──────────────────────────────────────────────────────────

function parseFrontmatter(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let currentArray: unknown[] | null = null;
  let currentObj: Record<string, unknown> | null = null;
  let inObjectArray = false;

  for (const line of raw.split('\n')) {
    // Array item: "  - value" or "  - key: value" (under a key)
    if (/^\s+-\s/.test(line) && currentKey) {
      const itemRaw = line.replace(/^\s+-\s*/, '').trim();
      if (inObjectArray && currentArray) {
        // Object item in array: "  - source: gallery"
        // Collect key: value pairs into a single object until next "  -" or new top-level key
        const obj = parseInlineObject(itemRaw);
        if (obj) {
          currentArray.push(obj);
        } else {
          // Simple string in array
          if (!currentArray) currentArray = [];
          currentArray.push(itemRaw);
        }
      } else {
        if (!currentArray) currentArray = [];
        // Check if it looks like "key: value" (object item)
        if (itemRaw.includes(': ')) {
          inObjectArray = true;
          currentArray.push(parseInlineObject(itemRaw) ?? itemRaw);
        } else {
          currentArray.push(itemRaw);
        }
      }
      continue;
    }

    // Nested key: "  key: value" (under a parent key with object value)
    if (/^\s+\w/.test(line) && currentKey && !currentArray && currentObj !== null) {
      const m = line.match(/^\s+(\w+):\s*(.*)$/);
      if (m) {
        const val = m[2].trim();
        currentObj[m[1]] = isNumeric(val) ? Number(val) : val;
        continue;
      }
    }

    // Flush pending array/object
    if (currentKey && (currentArray || currentObj)) {
      result[currentKey] = currentArray ?? currentObj;
      currentArray = null;
      currentObj = null;
      inObjectArray = false;
    }

    // Top-level key: "key: value" or "key:"
    const topMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (topMatch) {
      currentKey = topMatch[1];
      const val = topMatch[2].trim();

      if (val === '' || val === '|') {
        // Next lines are nested (object or array)
        currentObj = {};
        continue;
      }
      if (val.startsWith('[') && val.endsWith(']')) {
        // Inline array: [gallery, carousel]
        result[currentKey] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
        currentKey = '';
        continue;
      }
      // Simple scalar
      result[currentKey] = isNumeric(val) ? Number(val) : val;
      currentKey = '';
    }
  }

  // Flush last pending
  if (currentKey && (currentArray || currentObj)) {
    result[currentKey] = currentArray ?? currentObj;
  }

  return result;
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
      typeof v === 'object' && v !== null && 'source' in v && 'target' in v
  );
}

function parseInlineObject(raw: string): Record<string, unknown> | null {
  if (!raw.includes(': ')) return null;
  const obj: Record<string, unknown> = {};
  // Split on ", " but not inside values — simple heuristic
  for (const part of raw.split(/,\s+/)) {
    const m = part.match(/^(\w+)\s*:\s*(.+)$/);
    if (m) obj[m[1]] = isNumeric(m[2].trim()) ? Number(m[2].trim()) : m[2].trim();
  }
  return Object.keys(obj).length > 0 ? obj : null;
}

function isNumeric(val: string): boolean {
  return val !== '' && !isNaN(Number(val));
}
