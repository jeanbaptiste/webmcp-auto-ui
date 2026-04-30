#!/usr/bin/env node
// Audit harness: connects to every remote MCP, fetches each recipe body,
// extracts JS/TS code blocks, runs them with a shared scope, and produces a
// table report `[server, recipe, block, status, reason]`.
//
// Read-only on the codebase. Real network calls hit the upstream MCPs.
//
// Usage:
//   node scripts/audit-recipes.mjs              # all servers
//   node scripts/audit-recipes.mjs hackernews   # one server id
//   node scripts/audit-recipes.mjs --json       # JSON output to stdout

const REGISTRY = [
  { id: 'tricoteuses', url: 'https://mcp.code4code.eu/mcp' },
  { id: 'hackernews', url: 'https://demos.hyperskills.net/mcp-hackernews/mcp' },
  { id: 'metmuseum', url: 'https://demos.hyperskills.net/mcp-metmuseum/mcp' },
  { id: 'openmeteo', url: 'https://demos.hyperskills.net/mcp-openmeteo/mcp' },
  { id: 'wikipedia', url: 'https://demos.hyperskills.net/mcp-wikipedia/mcp' },
  { id: 'inaturalist', url: 'https://demos.hyperskills.net/mcp-inaturalist/mcp' },
  { id: 'datagouv', url: 'https://demos.hyperskills.net/mcp-datagouv/mcp' },
  { id: 'nasa', url: 'https://demos.hyperskills.net/mcp-nasa/mcp' },
];

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const filter = args.find((a) => !a.startsWith('--'));

// ── .netrc Basic auth lookup (silent — never logs contents) ───────────────

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NETRC_PATH = path.resolve(__dirname, '..', '.netrc');
const netrcByHost = new Map();
if (existsSync(NETRC_PATH)) {
  try {
    const txt = readFileSync(NETRC_PATH, 'utf8');
    let machine, login, password;
    const tokens = txt.split(/\s+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === 'machine') { machine = tokens[++i]; login = password = undefined; }
      else if (t === 'login') login = tokens[++i];
      else if (t === 'password') {
        password = tokens[++i];
        if (machine && login && password) {
          netrcByHost.set(machine, 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'));
        }
      }
    }
  } catch { /* silently ignore — never log .netrc contents */ }
}

function authHeaderFor(url) {
  try { return netrcByHost.get(new URL(url).hostname); } catch { return undefined; }
}

// ── MCP transport ──────────────────────────────────────────────────────────

function parseSse(text) {
  // Streamable HTTP MCP transport: "event: message\ndata: {json}\n\n".
  // Some bridges (e.g. mcp-http-passthrough) return plain JSON directly.
  // Extract `data:` lines first; if none found, try parsing the whole body.
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    try { out.push(JSON.parse(payload)); } catch { /* ignore */ }
  }
  if (out.length === 0 && text.trim().startsWith('{')) {
    try { out.push(JSON.parse(text)); } catch { /* ignore */ }
  }
  return out;
}

async function mcpInit(url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(authHeaderFor(url) ? { Authorization: authHeaderFor(url) } : {}) },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'audit', version: '1' } },
    }),
  });
  if (!res.ok) throw new Error(`init HTTP ${res.status}`);
  const sid = res.headers.get('mcp-session-id');
  // consume body
  await res.text();
  if (!sid) throw new Error('no mcp-session-id header');

  // notifications/initialized (fire-and-forget)
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'mcp-session-id': sid,
      ...(authHeaderFor(url) ? { Authorization: authHeaderFor(url) } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  }).catch(() => {});
  return sid;
}

let _rpcId = 100;
async function mcpCall(url, sid, method, params) {
  const id = ++_rpcId;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'mcp-session-id': sid,
      ...(authHeaderFor(url) ? { Authorization: authHeaderFor(url) } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const text = await res.text();
  const msgs = parseSse(text);
  const reply = msgs.find((m) => m.id === id);
  if (!reply) throw new Error(`${method} no reply`);
  if (reply.error) throw new Error(`${method} ${reply.error.message ?? JSON.stringify(reply.error)}`);
  return reply.result;
}

async function listTools(url, sid) {
  const r = await mcpCall(url, sid, 'tools/list', {});
  return Array.isArray(r?.tools) ? r.tools : [];
}

async function callTool(url, sid, name, args = {}) {
  const r = await mcpCall(url, sid, 'tools/call', { name, arguments: args });
  // MCP-spec: prefer structuredContent (typed payload) over content[].text.
  const sc = r?.structuredContent;
  if (sc != null && typeof sc === 'object') return sc;
  const text = r?.content?.find((c) => c?.type === 'text')?.text;
  if (text == null) return r;
  try { return JSON.parse(text); } catch { return text; }
}

// ── Recipe parsing (mirrors packages/sdk/src/recipes/parse.ts) ────────────

function parseBody(body) {
  if (!body) return [];
  const segments = [];
  const re = /```([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(body)) !== null) {
    const [full, langRaw, codeRaw] = m;
    if (m.index > lastIndex) {
      const chunk = body.slice(lastIndex, m.index);
      if (chunk.trim().length > 0) segments.push({ type: 'markdown', content: chunk });
    }
    segments.push({ type: 'code', content: codeRaw.replace(/\r?\n$/, ''), lang: (langRaw || '').trim().toLowerCase() || 'text' });
    lastIndex = m.index + full.length;
  }
  if (lastIndex < body.length) {
    const tail = body.slice(lastIndex);
    if (tail.trim().length > 0) segments.push({ type: 'markdown', content: tail });
  }
  return segments;
}

// ── Runner with per-block scope (harness-specific) ────────────────────────
//
// Design notes (2026-04-30, fix batch):
// • The recipe blocks are usually ALTERNATIVES (✅ vs ❌, approach A vs B), not
//   a sequential pipeline. A shared scope across blocks therefore generated
//   cascading false positives ("already declared", "X is not defined" cascade).
//   The harness now uses a FRESH scope per JS/TS block.
// • Recipes targeting the Deno sandbox `run_script` (token: `agentTask(`,
//   top-level `import ... from "https://..."` …) are tagged `tutorial` and
//   their JS/TS blocks are skipped — they belong to a different runtime.
// • TS-only constructs (`: Type` param/return annotations, `as`, `interface`,
//   `type X = …`, generic `<T>` on call expressions, `import type …`) are
//   stripped before exec. This is a sober regex pass — best-effort, not a
//   transpiler. When the strip fails, the block is reported with `error` as
//   before.
// • SQL queries containing `$1`/`$2` placeholders without bindings are
//   reported as `skip-sql-params` (not `empty` or `error`).

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const JS_LANGS = new Set(['js', 'javascript', 'mjs', 'cjs', 'ts', 'typescript']);
const TS_LANGS = new Set(['ts', 'typescript']);
const SQL_LANGS = new Set(['sql']);

// ── TypeScript strip (best-effort regex, no full parser) ──────────────────

function stripTypeScript(code) {
  let s = code;
  // 1. Remove `import type { … } from '…'` lines
  s = s.replace(/^[\t ]*import\s+type\s+[^;\n]+;?[\t ]*$/gm, '');
  // 2. Remove `export type X = …` and `type X = …;` declarations (single-line)
  s = s.replace(/^[\t ]*(?:export\s+)?type\s+[A-Za-z_$][\w$]*\s*=\s*[^;\n]+;?[\t ]*$/gm, '');
  // 3. Remove `interface Foo { … }` blocks (balanced braces, single-pass)
  s = s.replace(/^[\t ]*(?:export\s+)?interface\s+[A-Za-z_$][\w$]*[^\{]*\{/gm, (match, offset, full) => {
    // We can't easily balance braces in a single regex; flag for the next pass.
    return ' IFACE_OPEN ' + match;
  });
  // Walk and remove balanced interface bodies.
  while (true) {
    const idx = s.indexOf(' IFACE_OPEN ');
    if (idx < 0) break;
    const headerEnd = s.indexOf('{', idx);
    if (headerEnd < 0) { s = s.replace(' IFACE_OPEN ', ''); break; }
    let depth = 0, end = -1;
    for (let i = headerEnd; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) { s = s.replace(' IFACE_OPEN ', ''); break; }
    s = s.slice(0, idx) + s.slice(end + 1);
  }
  // 4. Strip ` as Type` / ` as const` (inline cast).
  //    `as Foo<Bar, Baz>` — handle generics by matching balanced angle brackets.
  s = s.replace(/\s+as\s+(?:const\b|[A-Za-z_$][\w$.<>,\s\[\]|&'"]*)/g, '');
  // 5. Strip generic call expressions: `foo<T, U>(...)` → `foo(...)`.
  //    Heuristic: identifier followed by `<…>(`, where contents look type-y.
  s = s.replace(/([A-Za-z_$][\w$]*)\s*<\s*([^<>{};=]+?)\s*>\s*\(/g, '$1(');
  // Same for tagged template: `db<T>\`…\`` → `db\`…\``.
  s = s.replace(/([A-Za-z_$][\w$]*)\s*<\s*([^<>{};=]+?)\s*>\s*`/g, '$1`');
  // 6. Strip return-type annotations: `): Type {` / `): Type =>`
  s = s.replace(/\)\s*:\s*[A-Za-z_$][\w$.<>\[\]\s|&,'"]*?(\s*(?:\{|=>))/g, ')$1');
  // 7. Strip param-type annotations inside arrow/function params:
  //    `(a: Foo, b: Bar<X>) =>` → `(a, b) =>`
  //    We do a conservative pass: `:Type` between an identifier and the next
  //    `,` or `)` at depth 0 of `<>[]{}`.
  s = s.replace(/([A-Za-z_$][\w$]*\??)\s*:\s*([A-Za-z_$][\w$.<>\[\]\s|&,'"]*?)(\s*[,)=])/g,
    (m, id, _ty, tail) => `${id}${tail}`);
  // 8. Strip `<T>` generic parameters on function/method declarations:
  //    `function foo<T>(…)` → `function foo(…)`
  s = s.replace(/(function\s+[A-Za-z_$][\w$]*)\s*<[^<>{};=]+>/g, '$1');
  // 9. Strip `enum Foo { … }` (rare in recipes).
  s = s.replace(/^[\t ]*(?:export\s+)?enum\s+[A-Za-z_$][\w$]*\s*\{[^}]*\}[\t ]*$/gm, '');
  return s;
}

// ── Tutorial recipe detection (Deno sandbox / run_script) ─────────────────

function isTutorialRecipe(bodyText, codeBlocks) {
  if (typeof bodyText === 'string') {
    if (/agentTask\s*\(/.test(bodyText)) return true;
    if (/\brun_script\b/.test(bodyText) && /agentTask|Deno\b|\bimport\s+[^;]+from\s+["']https?:\/\//.test(bodyText)) return true;
  }
  for (const blk of codeBlocks) {
    if (!JS_LANGS.has(blk.lang)) continue;
    if (/agentTask\s*\(/.test(blk.content)) return true;
    if (/^\s*import\s+[^;]+from\s+["']https?:\/\//m.test(blk.content)) return true;
  }
  return false;
}

// ── SQL placeholder detection ─────────────────────────────────────────────

function hasSqlPositionalParams(code) {
  // Match `$1`, `$2`, etc., outside of strings. We do a sober pass: strip
  // strings & comments first, then look for `$\d+`.
  const stripped = code
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""');
  return /\$\d+/.test(stripped);
}

/**
 * Heuristic: sniff `FROM <schema>.<table>` / `JOIN <schema>.<table>` to pick a
 * value for the required `schema` enum param of `query_sql` (Tricoteuses).
 * Falls back to the first enum value if no match.
 */
function inferSqlSchema(code, schemaProp) {
  if (!Array.isArray(schemaProp?.enum) || schemaProp.enum.length === 0) return undefined;
  const re = /\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)\.[a-zA-Z_]/gi;
  const found = new Set();
  let m;
  while ((m = re.exec(code)) !== null) found.add(m[1].toLowerCase());
  const enumLower = schemaProp.enum.map((v) => String(v).toLowerCase());
  for (const sch of found) {
    const idx = enumLower.indexOf(sch);
    if (idx >= 0) return schemaProp.enum[idx];
  }
  return schemaProp.enum[0];
}

async function runSqlBlock(code, mcp, sqlTool) {
  // Build args: code in the `query`/`sql` param + schema enum if required.
  const props = sqlTool?.inputSchema?.properties ?? {};
  const required = sqlTool?.inputSchema?.required ?? [];
  const codeParam = ['query', 'sql', 'code'].find((k) => props[k]?.type === 'string')
    ?? required.find((k) => props[k]?.type === 'string')
    ?? 'query';
  const args = { [codeParam]: code };
  for (const r of required) {
    if (r === codeParam || args[r] !== undefined) continue;
    if (r === 'schema') {
      const v = inferSqlSchema(code, props[r]);
      if (v !== undefined) args[r] = v;
    }
  }
  const res = await callTool(mcp.url, mcp.sid, sqlTool.name, args);
  // Look for {rows} or array
  let rowCount = 0;
  if (Array.isArray(res?.rows)) rowCount = res.rows.length;
  else if (Array.isArray(res?.results)) rowCount = res.results.length;
  else if (Array.isArray(res)) rowCount = res.length;
  return { rowCount, raw: res };
}

async function runJsBlock(code, lang, mcp) {
  // Fresh scope per block — recipes typically present alternative snippets,
  // not a sequential pipeline. Sharing scope generated cascading false
  // positives ("already declared", "X is not defined" cascade).
  const source = TS_LANGS.has(lang) ? stripTypeScript(code) : code;
  const wrapped = `return (async () => {\n${source}\n})();`;
  const widgets = [];
  const call = async (toolName, args = {}) => {
    return await callTool(mcp.url, mcp.sid, toolName, args);
  };
  const widget = async (name, params = {}) => { widgets.push({ name, params }); return { name, params }; };
  const fn = new AsyncFunction('call', 'widget', wrapped);
  await fn(call, widget);
  return { widgets };
}

// ── Audit one server ───────────────────────────────────────────────────────

async function auditServer(server) {
  const rows = [];
  let sid;
  try {
    sid = await mcpInit(server.url);
  } catch (err) {
    rows.push({ server: server.id, recipe: '-', block: '-', status: 'init-fail', reason: String(err.message ?? err) });
    return rows;
  }
  const mcp = { url: server.url, sid };

  let tools = [];
  try { tools = await listTools(server.url, sid); } catch { /* */ }
  const hasListRecipes = tools.some((t) => t.name === 'list_recipes');
  const hasGetRecipe = tools.some((t) => t.name === 'get_recipe');
  if (!hasListRecipes || !hasGetRecipe) {
    rows.push({ server: server.id, recipe: '-', block: '-', status: 'no-recipes-tool', reason: `list_recipes=${hasListRecipes} get_recipe=${hasGetRecipe}` });
    return rows;
  }

  let recipes;
  try { recipes = await callTool(server.url, sid, 'list_recipes', {}); } catch (err) {
    rows.push({ server: server.id, recipe: '-', block: '-', status: 'list-fail', reason: String(err.message ?? err) });
    return rows;
  }
  const items = Array.isArray(recipes) ? recipes
    : Array.isArray(recipes?.items) ? recipes.items
    : Array.isArray(recipes?.recipes) ? recipes.recipes
    : [];
  if (items.length === 0) {
    rows.push({ server: server.id, recipe: '-', block: '-', status: 'no-recipes', reason: 'list_recipes returned 0' });
    return rows;
  }

  for (const it of items) {
    const name = typeof it.name === 'string' ? it.name : typeof it.id === 'string' ? it.id : null;
    if (!name) continue;

    let bodyText;
    try {
      const r = await callTool(server.url, sid, 'get_recipe', { name, id: name });
      if (typeof r === 'string') bodyText = r;
      else if (r && typeof r.content === 'string') bodyText = r.content;
      else if (r && typeof r.body === 'string') bodyText = r.body;
      else bodyText = JSON.stringify(r);
    } catch (err) {
      rows.push({ server: server.id, recipe: name, block: '-', status: 'get-fail', reason: String(err.message ?? err) });
      continue;
    }

    const segs = parseBody(bodyText);
    const codeBlocks = segs.filter((s) => s.type === 'code' && (JS_LANGS.has(s.lang) || SQL_LANGS.has(s.lang)));
    if (codeBlocks.length === 0) {
      rows.push({ server: server.id, recipe: name, block: '-', status: 'no-runnable-blocks', reason: `${segs.filter((s) => s.type === 'code').length} code blocks, none js/ts/sql` });
      continue;
    }

    const sqlTool = tools.find((t) => t.name === 'query_sql');
    const tutorial = isTutorialRecipe(bodyText, codeBlocks);
    for (let i = 0; i < codeBlocks.length; i++) {
      const blk = codeBlocks[i];
      const label = `${blk.lang}#${i + 1}`;
      try {
        if (SQL_LANGS.has(blk.lang)) {
          if (!sqlTool) {
            rows.push({ server: server.id, recipe: name, block: label, status: 'skip-sql', reason: 'no query_sql tool on this server' });
            continue;
          }
          if (hasSqlPositionalParams(blk.content)) {
            rows.push({ server: server.id, recipe: name, block: label, status: 'skip-sql-params', reason: 'positional params ($1, $2, …) without bindings' });
            continue;
          }
          const { rowCount } = await runSqlBlock(blk.content, mcp, sqlTool);
          const status = rowCount === 0 ? 'empty' : 'ok';
          rows.push({ server: server.id, recipe: name, block: label, status, reason: `${rowCount} row(s)` });
          continue;
        }
        if (tutorial) {
          rows.push({ server: server.id, recipe: name, block: label, status: 'skip-tutorial', reason: 'recipe targets run_script / Deno sandbox' });
          continue;
        }
        let widgets;
        try {
          ({ widgets } = await runJsBlock(blk.content, blk.lang, mcp));
        } catch (err) {
          // Classify TS doc-snippet errors as `skip-doc-snippet` rather than
          // `error`. These are pedagogical fragments (✅ vs ❌ side-by-side,
          // illustrative usage referring to a `db` / `dossier` symbol assumed
          // to exist in the reader's context) — not actual recipe bugs.
          const msg = String(err.message ?? err);
          const isDocSnippet =
            TS_LANGS.has(blk.lang) && (
              /is not defined/.test(msg) ||
              /has already been declared/.test(msg) ||
              /Cannot use import statement/.test(msg) ||
              /Unexpected (?:identifier|token)/.test(msg)
            );
          if (isDocSnippet) {
            rows.push({ server: server.id, recipe: name, block: label, status: 'skip-doc-snippet', reason: msg.slice(0, 160) });
            continue;
          }
          throw err;
        }
        let status = 'ok';
        let reason = `${widgets.length} widget(s)`;
        const empties = [];
        for (const w of widgets) {
          const p = w.params ?? {};
          const arrFields = ['items', 'markers', 'data', 'rows', 'images'];
          for (const f of arrFields) {
            if (Array.isArray(p[f]) && p[f].length === 0) empties.push(`${w.name}.${f}=[]`);
          }
          if (typeof p.value === 'number' && p.value === 0) empties.push(`${w.name}.value=0`);
        }
        if (empties.length) {
          status = 'empty';
          reason += ` — ${empties.join(', ')}`;
        }
        rows.push({ server: server.id, recipe: name, block: label, status, reason });
      } catch (err) {
        const msg = String(err.message ?? err).slice(0, 200);
        rows.push({ server: server.id, recipe: name, block: label, status: 'error', reason: msg });
      }
    }
  }
  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────

const targets = filter ? REGISTRY.filter((s) => s.id === filter) : REGISTRY;
if (targets.length === 0) {
  console.error(`No server matches "${filter}". Available: ${REGISTRY.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

const allRows = [];
for (const s of targets) {
  process.stderr.write(`▸ ${s.id}\n`);
  const rows = await auditServer(s);
  allRows.push(...rows);
  // One-line per-server summary on stderr
  const ok = rows.filter((r) => r.status === 'ok').length;
  const empty = rows.filter((r) => r.status === 'empty').length;
  const err = rows.filter((r) => r.status === 'error').length;
  const total = rows.filter((r) => r.block !== '-').length;
  process.stderr.write(`  ${ok}/${total} ok, ${empty} empty, ${err} error\n`);
}

if (wantJson) {
  console.log(JSON.stringify(allRows, null, 2));
} else {
  // Markdown table
  console.log('| server | recipe | block | status | reason |');
  console.log('|--------|--------|-------|--------|--------|');
  for (const r of allRows) {
    const cells = [r.server, r.recipe, r.block, r.status, r.reason].map((c) =>
      String(c).replace(/\|/g, '\\|').replace(/\n/g, ' '),
    );
    console.log(`| ${cells.join(' | ')} |`);
  }
  // Per-server summary at the end
  console.log('\n## Summary\n');
  console.log('| server | total | ok | empty | error | skipped | narrative |');
  console.log('|--------|-------|----|----|----|----|----|');
  const byServer = new Map();
  for (const r of allRows) {
    if (!byServer.has(r.server)) byServer.set(r.server, []);
    byServer.get(r.server).push(r);
  }
  const SKIPS = new Set(['skip-sql', 'skip-sql-params', 'skip-tutorial', 'skip-doc-snippet']);
  for (const [srv, rows] of byServer) {
    const exec = rows.filter((r) => r.block !== '-');
    const ok = exec.filter((r) => r.status === 'ok').length;
    const empty = exec.filter((r) => r.status === 'empty').length;
    const err = exec.filter((r) => r.status === 'error').length;
    const skipped = exec.filter((r) => SKIPS.has(r.status)).length;
    const narrative = rows.filter((r) => r.status === 'no-runnable-blocks').length;
    console.log(`| ${srv} | ${exec.length} | ${ok} | ${empty} | ${err} | ${skipped} | ${narrative} |`);
  }
}
