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

// ── Runner with shared scope (mirrors packages/sdk/src/recipes/runner.ts) ──

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const JS_LANGS = new Set(['js', 'javascript', 'mjs', 'cjs', 'ts', 'typescript']);
const SQL_LANGS = new Set(['sql']);

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

function matchBracket(code, startIdx) {
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

function namesFromPattern(content) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ',' && depth === 0) { parts.push(content.slice(start, i)); start = i + 1; }
  }
  parts.push(content.slice(start));
  const names = [];
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (part.startsWith('...')) part = part.slice(3).trim();
    const eqIdx = part.indexOf('=');
    if (eqIdx >= 0) part = part.slice(0, eqIdx).trim();
    const colonIdx = part.indexOf(':');
    if (colonIdx >= 0) {
      const alias = part.slice(colonIdx + 1).trim();
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

function extractTopLevelDecls(code) {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
  const out = new Set();
  const reId = /^[\t ]*(?:const|let|var|function|class)\s+([a-zA-Z_$][\w$]*)/gm;
  let m;
  while ((m = reId.exec(stripped)) !== null) {
    const before = stripped.slice(0, m.index);
    const opens = (before.match(/\{/g) ?? []).length;
    const closes = (before.match(/\}/g) ?? []).length;
    if (opens === closes) out.add(m[1]);
  }
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
  return [...out];
}

async function runJsBlock(code, lang, scope, mcp) {
  const currentDecls = new Set(extractTopLevelDecls(code));
  const priorKeys = Object.keys(scope).filter((k) => /^[a-zA-Z_$][\w$]*$/.test(k) && !currentDecls.has(k));
  const preamble = priorKeys.map((k) => `const ${k} = __scope__[${JSON.stringify(k)}];`).join('\n');
  const writeback = [...currentDecls].map((k) => `__scope__[${JSON.stringify(k)}] = ${k};`).join('\n');
  const wrapped = `return (async () => {\n${preamble}\n${code}\n${writeback}\n})();`;
  const widgets = [];
  const call = async (toolName, args = {}) => {
    return await callTool(mcp.url, mcp.sid, toolName, args);
  };
  const widget = async (name, params = {}) => { widgets.push({ name, params }); return { name, params }; };
  const fn = new AsyncFunction('call', 'widget', '__scope__', wrapped);
  await fn(call, widget, scope);
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
    const scope = {};
    for (let i = 0; i < codeBlocks.length; i++) {
      const blk = codeBlocks[i];
      const label = `${blk.lang}#${i + 1}`;
      try {
        if (SQL_LANGS.has(blk.lang)) {
          if (!sqlTool) {
            rows.push({ server: server.id, recipe: name, block: label, status: 'skip-sql', reason: 'no query_sql tool on this server' });
            continue;
          }
          const { rowCount } = await runSqlBlock(blk.content, mcp, sqlTool);
          const status = rowCount === 0 ? 'empty' : 'ok';
          rows.push({ server: server.id, recipe: name, block: label, status, reason: `${rowCount} row(s)` });
          continue;
        }
        const { widgets } = await runJsBlock(blk.content, blk.lang, scope, mcp);
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
  console.log('| server | total | ok | empty | error | other |');
  console.log('|--------|-------|----|----|----|----|');
  const byServer = new Map();
  for (const r of allRows) {
    if (!byServer.has(r.server)) byServer.set(r.server, []);
    byServer.get(r.server).push(r);
  }
  for (const [srv, rows] of byServer) {
    const exec = rows.filter((r) => r.block !== '-');
    const ok = exec.filter((r) => r.status === 'ok').length;
    const empty = exec.filter((r) => r.status === 'empty').length;
    const err = exec.filter((r) => r.status === 'error').length;
    const other = rows.length - exec.length;
    console.log(`| ${srv} | ${exec.length} | ${ok} | ${empty} | ${err} | ${other} |`);
  }
}
