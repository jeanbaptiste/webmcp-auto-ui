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
}

function makeCtx(): RunnerCtx & { logs: RunLog[] } {
  const start = performance.now();
  const logs: RunLog[] = [];
  return {
    start,
    logs,
    log(msg: string) {
      logs.push({ t: Math.round(performance.now() - start), msg });
    },
  };
}

async function runJsLike(code: string, ctx: RunnerCtx): Promise<unknown> {
  // Wrap user code as the body of an async function that executes itself.
  // Users can use `await`, define vars, and return a final value.
  const wrapped = `return (async () => {\n${code}\n})();`;
  const fn = new AsyncFunction(wrapped);
  ctx.log('dispatched (inline async)');
  const out = await fn();
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
function findCodeParamName(schema: unknown): string | null {
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
function buildToolArgs(
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

/**
 * Run a snippet of code in a given language.
 *
 * - JS / TS: executed inline via AsyncFunction (TS is NOT transpiled; code must
 *   be valid JS or the caller should keep type annotations minimal).
 * - SQL: dispatched to `query_sql` on any connected MCP server that exposes it.
 * - Other languages: dispatched to `run_script`. The param name (`script`,
 *   `code`, `query`, ...) is picked dynamically from the tool's inputSchema.
 */
export async function runCode(
  code: string,
  lang: string,
  multiClient?: McpMultiClient
): Promise<RunResult> {
  const ctx = makeCtx();
  const normLang = (lang || '').toLowerCase();
  const startedAt = ctx.start;
  try {
    let output: unknown;
    if (JS_LANGS.has(normLang) || TS_LANGS.has(normLang) || normLang === '') {
      output = await runJsLike(code, ctx);
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
