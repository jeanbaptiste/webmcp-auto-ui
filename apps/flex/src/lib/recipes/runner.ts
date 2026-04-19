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

/**
 * Find the first connected MCP server that exposes a given tool name.
 * Returns `{ url, name }` or null.
 */
function findServerWithTool(
  multiClient: McpMultiClient | undefined,
  toolName: string
): { url: string; name: string } | null {
  if (!multiClient) return null;
  for (const s of multiClient.listServers()) {
    if (s.tools.some((t) => t.name === toolName)) {
      return { url: s.url, name: s.name };
    }
  }
  return null;
}

async function runViaMcp(
  code: string,
  lang: string,
  multiClient: McpMultiClient | undefined,
  ctx: RunnerCtx
): Promise<unknown> {
  const server = findServerWithTool(multiClient, 'run_script');
  if (!server || !multiClient) {
    throw new Error(`No MCP server with run_script available for language "${lang}"`);
  }
  ctx.log(`dispatched to ${server.name} (run_script, lang=${lang})`);
  const res = await multiClient.callToolOn(server.url, 'run_script', {
    code,
    language: lang,
    lang,
  });
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
 * - Other languages: proxied to an MCP `run_script` tool if any connected
 *   server exposes it. Otherwise returns an error RunResult.
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
