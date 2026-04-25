/**
 * Extract sample `params` data from a widget recipe's `## Example` block.
 *
 * Recipes have shape:
 *   ## Example
 *   ```
 *   <server>_webmcp_widget_display({name: "<widget>", params: { ... }})
 *   ```
 *
 * Recipes are bundled at build time from our own source — `new Function`
 * eval is acceptable here (not user input).
 */

function findBalancedBraces(text: string, fromIndex: number): string | null {
  let depth = 0;
  let start = -1;
  for (let i = fromIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (start === -1) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractSampleData(recipe: string | undefined | null): Record<string, unknown> | null {
  if (!recipe) return null;
  const exampleHeader = recipe.search(/^##\s*Example/m);
  if (exampleHeader === -1) return null;
  const after = recipe.slice(exampleHeader);
  const paramsIdx = after.search(/params\s*:/);
  if (paramsIdx === -1) return null;
  const objStart = after.indexOf('{', paramsIdx);
  if (objStart === -1) return null;
  const objLiteral = findBalancedBraces(after, objStart);
  if (!objLiteral) return null;
  try {
    const fn = new Function(`return (${objLiteral});`);
    const value = fn();
    if (value && typeof value === 'object') return value as Record<string, unknown>;
  } catch { /* parse error — fall through */ }
  return null;
}
