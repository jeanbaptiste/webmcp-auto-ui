/**
 * Extract sample data from a recipe markdown body for use in the showcase.
 *
 * Strategy:
 *  1. First fenced ```json (or ``` block whose content parses as JSON) → JSON.parse
 *  2. Fallback: regex on `..._widget_display({name: "...", params: <obj>})` and parse the
 *     `params` JS object via `new Function('return ...')`. We DO NOT eval the full call:
 *     we extract just the `params` substring with balanced-brace matching.
 *  3. Returns null when nothing usable is found.
 */
// Recipes use illustrative URLs (example.com, https://.../, …) that 404 in the
// showcase. Filter them so the widget falls back to its empty state.
const PLACEHOLDER_URL_PATTERNS = [
  /https?:\/\/example\.com\b/i,
  /https?:\/\/\.\.\.[\/]/,
  /https?:\/\/your-/i,
  /https?:\/\/<[^>]+>/,
];

function containsPlaceholderUrl(value: unknown): boolean {
  if (typeof value === 'string') {
    return PLACEHOLDER_URL_PATTERNS.some((re) => re.test(value));
  }
  if (Array.isArray(value)) return value.some(containsPlaceholderUrl);
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsPlaceholderUrl);
  }
  return false;
}

export function extractSampleFromRecipe(markdown: string): Record<string, unknown> | null {
  if (!markdown) return null;

  // 1. Fenced code blocks — try ```json first, then any ``` whose content parses as JSON.
  const fenceRe = /```(\w+)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  const candidates: { lang: string; body: string }[] = [];
  while ((m = fenceRe.exec(markdown))) {
    candidates.push({ lang: (m[1] || '').toLowerCase(), body: m[2] });
  }
  // Prefer json-tagged fences
  for (const c of candidates) {
    if (c.lang !== 'json') continue;
    const obj = tryParseJson(c.body);
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && !containsPlaceholderUrl(obj)) {
      return obj as Record<string, unknown>;
    }
  }
  // Then any fence
  for (const c of candidates) {
    if (c.lang === 'json') continue;
    const obj = tryParseJson(c.body);
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && !containsPlaceholderUrl(obj)) {
      return obj as Record<string, unknown>;
    }
  }

  // 2. Look for *_widget_display({name: "...", params: <obj>}) patterns
  // Match the start, then balanced-brace extract the params object.
  const callRe = /widget_display\s*\(\s*\{/g;
  let cm: RegExpExecArray | null;
  while ((cm = callRe.exec(markdown))) {
    const start = cm.index + cm[0].length - 1; // points at the opening `{` of the call's first arg
    const objStr = extractBalanced(markdown, start, '{', '}');
    if (!objStr) continue;
    const paramsObj = extractParamsField(objStr);
    if (paramsObj && !containsPlaceholderUrl(paramsObj)) return paramsObj;
  }

  return null;
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Extract a balanced substring starting at index `start` where text[start] === open. */
function extractBalanced(text: string, start: number, open: string, close: string): string | null {
  if (text[start] !== open) return null;
  let depth = 0;
  let inStr: string | null = null;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Given a JS object literal source like `{name: "x", params: {...}}`, extract & evaluate `params`. */
function extractParamsField(objSrc: string): Record<string, unknown> | null {
  // Find `params:` then balanced-extract the value (object or array).
  const re = /params\s*:\s*([\{\[])/g;
  const m = re.exec(objSrc);
  if (!m) return null;
  const valStart = m.index + m[0].length - 1;
  const open = m[1];
  const close = open === '{' ? '}' : ']';
  const valSrc = extractBalanced(objSrc, valStart, open, close);
  if (!valSrc) return null;
  // Try JSON.parse first (already valid JSON), else evaluate as JS object literal.
  const asJson = tryParseJson(valSrc);
  if (asJson && typeof asJson === 'object' && !Array.isArray(asJson)) {
    return asJson as Record<string, unknown>;
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${valSrc});`);
    const result = fn();
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return null;
}
