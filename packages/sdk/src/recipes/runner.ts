import type { McpMultiClient } from '@webmcp-auto-ui/core';
import type { RunResult, RunLog } from './types.js';

/** Rough token estimator: 4 characters per token heuristic. */
export function estimateTokens(s: string): number {
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

const JS_LANGS = new Set(['js', 'javascript', 'mjs', 'cjs']);
const TS_LANGS = new Set(['ts', 'typescript']);

/**
 * Mapping of language → preferred MCP tool name.
 *
 * Rationale: on the `tricoteuses` / code4code MCP server, SQL amendments are
 * exposed via `query_sql`, while `run_script` is intended for JS/TS adapters
 * calling `agentTask(tricoteuses)`. Dispatching a raw ```sql``` block through
 * `run_script` fails validation.
 */
const LANG_TO_TOOL: Record<string, string> = {
  sql: 'query_sql',
  // js/ts runs locally (handled before), not here
};

/**
 * `new Function` flavor that returns a promise (via AsyncFunction).
 * We wrap user code in an async IIFE so users can `await` at top level and
 * `return` a value.
 */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...a: unknown[]) => Promise<unknown>;

interface RunnerCtx {
  log: (msg: string) => void;
  start: number;
  widgets: Array<{ name: string; params: Record<string, unknown> }>;
}

function makeCtx(): RunnerCtx & { logs: RunLog[] } {
  const start = performance.now();
  const logs: RunLog[] = [];
  const widgets: Array<{ name: string; params: Record<string, unknown> }> = [];
  return {
    start,
    logs,
    widgets,
    log(msg: string) {
      logs.push({ t: Math.round(performance.now() - start), msg });
    },
  };
}

/**
 * Build the `call(toolName, args)` helper exposed to recipe JS sandboxes.
 * Resolves a tool by name across all connected MCP servers, calls it, and
 * returns the parsed text payload (JSON if possible) or the raw result.
 */
function makeCallHelper(multiClient: McpMultiClient | undefined, ctx: RunnerCtx) {
  return async (toolName: string, args: Record<string, unknown> = {}) => {
    const found = findToolOnAnyServer(multiClient, toolName);
    if (!found || !multiClient) {
      throw new Error(`No MCP server exposes tool "${toolName}"`);
    }
    ctx.log(`call(${toolName})`);
    const res = await multiClient.callToolOn(found.url, toolName, args);
    // MCP-spec: prefer structuredContent (typed payload) over content[].text.
    const sc = (res as { structuredContent?: unknown }).structuredContent;
    if (sc != null && typeof sc === 'object') return sc;
    const textPart = res?.content?.find((c: { type: string }) => c.type === 'text') as
      | { text?: string }
      | undefined;
    if (textPart?.text) {
      try { return JSON.parse(textPart.text); } catch { return textPart.text; }
    }
    return res;
  };
}

/**
 * Sandbox-wide `unwrap(r)` helper. Many recipes assume MCP results are
 * wrapped in `{ data | results | items: [...] }` and unwrap them with this
 * one-liner. Falls through to the input itself, then to an empty array.
 */
const unwrapHelper = (r: unknown): unknown => {
  if (r && typeof r === 'object') {
    const o = r as Record<string, unknown>;
    if (o.data !== undefined) return o.data;
    if (o.results !== undefined) return o.results;
    if (o.items !== undefined) return o.items;
  }
  return r ?? [];
};

/**
 * Build the `widget(name, params)` helper. Captures each call into the run
 * context so the host can mount them stacked in the run panel.
 */
function makeWidgetHelper(ctx: RunnerCtx) {
  return async (name: string, params: Record<string, unknown> = {}) => {
    ctx.log(`widget(${name})`);
    ctx.widgets.push({ name, params });
    return { name, params };
  };
}

/** Find the index of the matching close bracket for `code[startIdx]`. */
function matchBracket(code: string, startIdx: number): number {
  const open = code[startIdx];
  const close = open === '[' ? ']' : open === '{' ? '}' : open === '(' ? ')' : '';
  if (!close) return -1;
  let depth = 0;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === open) depth++;
    else if (code[i] === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** Extract identifier names from a destructuring pattern body (without
 *  the outer brackets). Handles `[a, b]`, `{a, b}`, `{a: alias}`,
 *  `[a, ...rest]`, default values `a = 1`, top-level commas only. */
function namesFromPattern(content: string): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ',' && depth === 0) { parts.push(content.slice(start, i)); start = i + 1; }
  }
  parts.push(content.slice(start));
  const names: string[] = [];
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (part.startsWith('...')) part = part.slice(3).trim();
    // Strip default value `name = expr`
    const eqIdx = part.indexOf('=');
    if (eqIdx >= 0) part = part.slice(0, eqIdx).trim();
    // Object rename `key: alias` → take alias side
    const colonIdx = part.indexOf(':');
    if (colonIdx >= 0) {
      const alias = part.slice(colonIdx + 1).trim();
      // alias may itself be a nested pattern — recurse
      if (alias.startsWith('{') || alias.startsWith('[')) {
        const end = matchBracket(alias, 0);
        if (end > 0) names.push(...namesFromPattern(alias.slice(1, end)));
      } else if (/^[a-zA-Z_$][\w$]*$/.test(alias)) {
        names.push(alias);
      }
      continue;
    }
    if (/^[a-zA-Z_$][\w$]*$/.test(part)) names.push(part);
  }
  return names;
}

/** Match top-level `const|let|var name`, `function name`, `class name`,
 *  plus destructuring `const [a, b] = ...` and `const { a, b } = ...`.
 *  Skips matches that occur inside a `{}` block (e.g. callback bodies) by
 *  counting unbalanced braces before the match position, on a sanitized copy
 *  of the code where strings and comments are blanked out. */
function extractTopLevelDecls(code: string): string[] {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
  const out = new Set<string>();
  // Identifier-form decls (existing behavior)
  const reId = /^[\t ]*(?:const|let|var|function|class)\s+([a-zA-Z_$][\w$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = reId.exec(stripped)) !== null) {
    const before = stripped.slice(0, m.index);
    const opens = (before.match(/\{/g) ?? []).length;
    const closes = (before.match(/\}/g) ?? []).length;
    if (opens === closes) out.add(m[1]);
  }
  // Destructuring: const|let|var followed by `[` or `{`
  const reDestr = /^[\t ]*(?:const|let|var)\s+([\[\{])/gm;
  while ((m = reDestr.exec(stripped)) !== null) {
    const before = stripped.slice(0, m.index);
    const opens = (before.match(/\{/g) ?? []).length;
    const closes = (before.match(/\}/g) ?? []).length;
    if (opens !== closes) continue;
    const bracketStart = m.index + m[0].length - 1;
    const end = matchBracket(stripped, bracketStart);
    if (end < 0) continue;
    const inner = stripped.slice(bracketStart + 1, end);
    for (const n of namesFromPattern(inner)) out.add(n);
  }
  return Array.from(out);
}

async function runJsLike(
  code: string,
  ctx: RunnerCtx,
  multiClient?: McpMultiClient,
  scope?: Record<string, unknown>,
): Promise<unknown> {
  // Wrap user code as the body of an async function that executes itself.
  // Users can use `await`, define vars, and return a final value.
  // We inject `call` and `widget` helpers as parameters so recipes can
  // invoke MCP tools and emit widgets without preamble.
  // When a `scope` object is provided, top-level decls of prior blocks are
  // re-injected as local consts (preamble), and the current block's top-level
  // decls are written back at the end so the next block can read them.
  const currentDecls = new Set(extractTopLevelDecls(code));
  const priorKeys = scope
    ? Object.keys(scope).filter((k) => /^[a-zA-Z_$][\w$]*$/.test(k) && !currentDecls.has(k))
    : [];
  const preamble = priorKeys.map((k) => `const ${k} = __scope__[${JSON.stringify(k)}];`).join('\n');
  const writeback = scope
    ? Array.from(currentDecls).map((k) => `__scope__[${JSON.stringify(k)}] = ${k};`).join('\n')
    : '';
  const wrapped = `return (async () => {\n${preamble}\n${code}\n${writeback}\n})();`;
  const fn = new (AsyncFunction as unknown as new (
    ...args: string[]
  ) => (
    call: unknown,
    widget: unknown,
    unwrap: unknown,
    __scope__: Record<string, unknown>,
  ) => Promise<unknown>)(
    'call', 'widget', 'unwrap', '__scope__', wrapped,
  );
  ctx.log('dispatched (inline async)');
  const out = await fn(
    makeCallHelper(multiClient, ctx),
    makeWidgetHelper(ctx),
    unwrapHelper,
    scope ?? {},
  );
  ctx.log('resolved');
  return out;
}

interface McpToolDef {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

/**
 * Inspects a tool's inputSchema to find the string parameter that likely
 * holds the code/script/query. Returns the param name or null.
 */
export function findCodeParamName(schema: unknown): string | null {
  const s = schema as
    | { properties?: Record<string, { type?: string }>; required?: string[] }
    | null
    | undefined;
  if (!s?.properties) return null;
  const candidates = ['script', 'code', 'query', 'sql', 'source'];
  // Prefer named candidates matching a string property
  for (const name of candidates) {
    const prop = s.properties[name];
    if (prop?.type === 'string') return name;
  }
  // Fallback: first required string param
  for (const req of s.required ?? []) {
    if (s.properties[req]?.type === 'string') return req;
  }
  // Last resort: first string param
  for (const [name, prop] of Object.entries(s.properties)) {
    if (prop?.type === 'string') return name;
  }
  return null;
}

/**
 * Heuristics for filling required params. Currently handles:
 * - `schema` (string enum): extract from `FROM <schema>.<table>` or
 *   `JOIN <schema>.<table>` in SQL queries. Match against enum values
 *   (case-insensitive). Falls back to first enum value if no match.
 */
function inferParamValue(
  name: string,
  prop: { type?: string; enum?: unknown[] } | undefined,
  code: string,
  lang: string,
): unknown | undefined {
  if (!prop) return undefined;

  // Param `schema` on sql tools: sniff FROM/JOIN <schema>.<table>
  if (name === 'schema' && lang === 'sql' && Array.isArray(prop.enum) && prop.enum.length > 0) {
    const re = /\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)\.[a-zA-Z_]/gi;
    const matches = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) matches.add(m[1].toLowerCase());
    const enumLower = prop.enum.map((v) => String(v).toLowerCase());
    for (const sch of matches) {
      const idx = enumLower.indexOf(sch);
      if (idx >= 0) return prop.enum[idx];
    }
    // Fallback: no detectable schema, no good guess → leave unset
    return undefined;
  }

  return undefined;
}

/**
 * Build the full arg object for a tool call. Fills:
 * - the code-carrying param (found by findCodeParamName)
 * - every OTHER required param by inferring a value from the code (heuristics),
 *   or leaving it unset if nothing can be inferred (MCP will error explicitly
 *   so the user knows what to add).
 */
export function buildToolArgs(
  schema: unknown,
  codeParam: string,
  code: string,
  lang: string,
): Record<string, unknown> {
  const s = schema as { properties?: Record<string, any>; required?: string[] } | null | undefined;
  const args: Record<string, unknown> = { [codeParam]: code };
  if (!s?.properties) return args;

  for (const req of s.required ?? []) {
    if (req === codeParam) continue;
    if (args[req] !== undefined) continue;

    const prop = s.properties[req];
    const inferred = inferParamValue(req, prop, code, lang);
    if (inferred !== undefined) args[req] = inferred;
  }

  return args;
}

/**
 * Find the first connected MCP server that exposes a given tool name, along
 * with the tool definition (for inputSchema introspection).
 */
function findToolOnAnyServer(
  multiClient: McpMultiClient | undefined,
  toolName: string
): { url: string; name: string; tool: McpToolDef } | null {
  if (!multiClient) return null;
  for (const s of multiClient.listServers()) {
    const tool = s.tools.find((t) => t.name === toolName) as McpToolDef | undefined;
    if (tool) return { url: s.url, name: s.name, tool };
  }
  return null;
}

async function runViaMcp(
  code: string,
  lang: string,
  multiClient: McpMultiClient | undefined,
  ctx: RunnerCtx
): Promise<unknown> {
  const toolName = LANG_TO_TOOL[lang] ?? 'run_script';
  const found = findToolOnAnyServer(multiClient, toolName);
  if (!found || !multiClient) {
    throw new Error(
      `No MCP server exposes tool "${toolName}" (needed for language "${lang}")`
    );
  }
  const paramName = findCodeParamName(found.tool.inputSchema) ?? 'script';
  ctx.log(
    `dispatched to ${found.name} (tool=${toolName}, param=${paramName}, lang=${lang})`
  );
  const args = buildToolArgs(found.tool.inputSchema, paramName, code, lang);
  const extraKeys = Object.keys(args).filter((k) => k !== paramName);
  if (extraKeys.length) {
    ctx.log(
      `inferred args: ${extraKeys.map((k) => `${k}=${JSON.stringify(args[k])}`).join(', ')}`
    );
  }
  const res = await multiClient.callToolOn(found.url, toolName, args);
  ctx.log('response received');
  // Normalize: extract text content if present, else raw result
  const textPart = res?.content?.find((c: { type: string }) => c.type === 'text') as
    | { text?: string }
    | undefined;
  if (textPart?.text) {
    try {
      return JSON.parse(textPart.text);
    } catch {
      return textPart.text;
    }
  }
  return res;
}

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

/**
 * Detect calls of the form `widget_display({name, params})` or
 * `<server>_webmcp_widget_display({name, params})` in a recipe snippet.
 * Recipes are bundled at build time from our own source, so `new Function`
 * eval of the object literal is acceptable.
 *
 * Some recipes contain placeholders (`data: [...]`, `params: {...}`) that
 * are not valid JS. We extract `name` via a separate regex so the widget can
 * always render, even if the `params` literal cannot be eval'd; in that case
 * we return `params: {}` rather than falling through to `run_script`.
 */
export function parseWidgetDisplayCall(
  code: string,
): { name: string; params: Record<string, unknown>; paramsParseFailed?: boolean } | null {
  const m = /(?:^|\W)(?:[a-zA-Z_]\w*_)?widget_display\s*\(/m.exec(code);
  if (!m) return null;
  const objStart = code.indexOf('{', m.index + m[0].length - 1);
  if (objStart === -1) return null;
  const objLiteral = findBalancedBraces(code, objStart);
  if (!objLiteral) return null;
  // `name` is extracted independently so a broken `params` placeholder doesn't
  // disqualify the call.
  const nameMatch = /\bname\s*:\s*['"]([^'"]+)['"]/.exec(objLiteral);
  if (!nameMatch) return null;
  const name = nameMatch[1];
  // Sanitize common placeholder forms before eval.
  const sanitized = objLiteral
    .replace(/\[\s*\.\.\.\s*\]/g, '[]')
    .replace(/\{\s*\.\.\.\s*\}/g, '{}');
  try {
    const fn = new Function(`return (${sanitized});`);
    const value = fn();
    if (value && typeof value === 'object') {
      const v = value as { params?: unknown };
      if (v.params && typeof v.params === 'object') {
        return { name, params: v.params as Record<string, unknown> };
      }
    }
    return { name, params: {} };
  } catch {
    return { name, params: {}, paramsParseFailed: true };
  }
}

/**
 * Run a snippet of code in a given language.
 *
 * - `widget_display(...)` (in a `text`/untagged block): parsed locally and
 *   surfaced via `result.widget` so the host can mount the widget live.
 * - JS / TS: executed inline via AsyncFunction (TS is NOT transpiled; code must
 *   be valid JS or the caller should keep type annotations minimal).
 * - SQL: dispatched to `query_sql` on any connected MCP server that exposes it.
 * - Other languages: dispatched to `run_script`. The param name (`script`,
 *   `code`, `query`, ...) is picked dynamically from the tool's inputSchema.
 */
export async function runCode(
  code: string,
  lang: string,
  multiClient?: McpMultiClient,
  scope?: Record<string, unknown>,
): Promise<RunResult> {
  const ctx = makeCtx();
  const normLang = (lang || '').toLowerCase();
  const startedAt = ctx.start;
  try {
    if (normLang === '' || normLang === 'text') {
      const parsed = parseWidgetDisplayCall(code);
      if (parsed) {
        ctx.log(`widget_display: ${parsed.name}`);
        if (parsed.paramsParseFailed) {
          ctx.log('params placeholder — rendering with empty params');
        }
        const durationMs = Math.round(performance.now() - ctx.start);
        return {
          status: 'done',
          startedAt,
          durationMs,
          tokens: estimateTokens(code),
          widget: { name: parsed.name, params: parsed.params },
          logs: ctx.logs,
        };
      }
    }
    let output: unknown;
    if (JS_LANGS.has(normLang) || TS_LANGS.has(normLang) || normLang === '') {
      output = await runJsLike(code, ctx, multiClient, scope);
    } else {
      output = await runViaMcp(code, normLang, multiClient, ctx);
    }
    const durationMs = Math.round(performance.now() - ctx.start);
    const tokens = estimateTokens(code) + estimateTokens(safeStringify(output));
    return {
      status: 'done',
      startedAt,
      durationMs,
      tokens,
      output,
      logs: ctx.logs,
      ...(ctx.widgets.length > 0 ? { widgets: ctx.widgets } : {}),
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - ctx.start);
    const message = err instanceof Error ? err.message : String(err);
    ctx.log(`error: ${message}`);
    return {
      status: 'error',
      startedAt,
      durationMs,
      tokens: estimateTokens(code),
      error: message,
      logs: ctx.logs,
    };
  }
}

export function safeStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
