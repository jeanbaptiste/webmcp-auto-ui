// @ts-nocheck
// ---------------------------------------------------------------------------
// Import modals for notebook widgets:
//   - openAddMdModal: new / file / url
//   - openAddRecipeModal: browser (WebMCP built-in + MCP server) / file / url
//   - openRecipeViewerModal: md rendered with ↳ inject buttons per fence
//   - openToolViewerModal: name + description + schema + inject button
// ---------------------------------------------------------------------------

import { callToolViaPostMessage } from '@webmcp-auto-ui/core';
// NOTE: imports from @webmcp-auto-ui/agent create an ESM cycle ui <-> agent.
// Safe: agent's autoui-server imports from ui/widgets/notebook for renderers,
// while these recipe helpers are only invoked inside functions (no top-level eval).
import { filterRecipes, sortRecipes, WEBMCP_RECIPES } from '@webmcp-auto-ui/agent';
import { renderMarkdownWithInjectButtons } from './prose.js';
import { extractCellsFromRecipe, extractCellsFromTool, extractCellFromMarkdown, extractCellFromFence } from './resource-extractor.js';
import type { NotebookCell } from './shared.js';
import type { McpToolLike } from './resource-extractor.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportedRecipe {
  name: string;
  description?: string;
  body?: string;
  serverName?: string;
  serverUrl?: string;
  originalName?: string;
  id?: string;
}

export type MdSource = { kind: 'new' } | { kind: 'content'; content: string };

// ---------------------------------------------------------------------------
// Shared modal shell
// ---------------------------------------------------------------------------

function ensureImportOverlay(): HTMLElement {
  let ov = document.getElementById('nb-import-overlay') as HTMLElement | null;
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'nb-import-overlay';
  ov.className = 'nb-import-overlay';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => {
    if (e.target === ov) closeImportModal();
  });
  injectImportStyles();
  return ov;
}

export function closeImportModal(): void {
  const ov = document.getElementById('nb-import-overlay');
  if (ov) ov.classList.remove('open');
}

function openWith(html: string): HTMLElement {
  const ov = ensureImportOverlay();
  ov.innerHTML = `<div class="nb-import-modal">${html}</div>`;
  ov.classList.add('open');
  return ov;
}

function tabButton(id: string, label: string, active: boolean): string {
  return `<button type="button" class="nb-imp-tab${active ? ' nb-imp-tab-active' : ''}" data-tab="${id}">${label}</button>`;
}

// ---------------------------------------------------------------------------
// openAddMdModal — 3 tabs: New / File / URL → returns a string of content
// ---------------------------------------------------------------------------

export function openAddMdModal(onPick: (content: string) => void): void {
  const ov = openWith(`
    <header class="nb-imp-head">
      <span class="nb-imp-title">Add markdown</span>
      <button type="button" class="nb-imp-close">×</button>
    </header>
    <nav class="nb-imp-tabs">
      ${tabButton('new', 'New', true)}
      ${tabButton('file', 'File', false)}
      ${tabButton('url', 'URL', false)}
    </nav>
    <section class="nb-imp-body" data-active="new">
      <div class="nb-imp-panel" data-panel="new">
        <p class="nb-imp-hint">Paste markdown below, or leave empty to create a blank cell you can edit in place.</p>
        <textarea class="nb-imp-md-textarea" placeholder="### Heading\n\nParagraph text…"
                  rows="10" spellcheck="true"></textarea>
        <div class="nb-imp-md-actions">
          <button type="button" class="nb-imp-btn nb-imp-primary" data-act="insert-md">Insert</button>
        </div>
      </div>
      <div class="nb-imp-panel" data-panel="file" hidden>
        <p class="nb-imp-hint">Pick a .md file from your computer.</p>
        <input type="file" accept=".md,.markdown,text/markdown,text/plain" class="nb-imp-file" />
      </div>
      <div class="nb-imp-panel" data-panel="url" hidden>
        <p class="nb-imp-hint">Fetch a markdown URL (routed through /api/proxy to avoid CORS).</p>
        <input type="url" placeholder="https://..." class="nb-imp-url" />
        <button type="button" class="nb-imp-btn nb-imp-primary" data-act="fetch-url">Fetch</button>
        <div class="nb-imp-error" data-role="error" hidden></div>
      </div>
    </section>
  `);

  bindCloseAndTabs(ov);

  const mdTextarea = ov.querySelector('.nb-imp-md-textarea') as HTMLTextAreaElement | null;
  const insertMd = () => {
    const val = mdTextarea?.value ?? '';
    const content = val.trim() === '' ? '### new section\n\nwrite here…' : val;
    onPick(content);
    closeImportModal();
  };
  ov.querySelector('[data-act="insert-md"]')!.addEventListener('click', insertMd);
  mdTextarea?.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      insertMd();
    }
  });

  (ov.querySelector('.nb-imp-file') as HTMLInputElement).addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    onPick(text);
    closeImportModal();
  });

  ov.querySelector('[data-act="fetch-url"]')!.addEventListener('click', async () => {
    const input = ov.querySelector('.nb-imp-url') as HTMLInputElement;
    const err = ov.querySelector('[data-role="error"]') as HTMLElement;
    err.hidden = true;
    const url = input.value.trim();
    if (!url) return;
    try {
      const text = await fetchViaProxy(url);
      onPick(text);
      closeImportModal();
    } catch (e: any) {
      err.textContent = 'Fetch failed: ' + (e?.message ?? e);
      err.hidden = false;
    }
  });
}

// ---------------------------------------------------------------------------
// openAddRecipeModal — 3 tabs: Browser / File / URL
// ---------------------------------------------------------------------------

export interface AddRecipeModalOptions {
  /** Connected MCP data servers; if any, their recipes are merged in the Browser tab. */
  mcpServers?: Array<{ name: string; url?: string }>;
  /** If 'data', hide built-in WEBMCP_RECIPES and list only MCP data servers recipes. Default 'all'. */
  scope?: 'data' | 'all';
  onPick: (recipe: ImportedRecipe) => void;
}

export function openAddRecipeModal(opts: AddRecipeModalOptions): void {
  const ov = openWith(`
    <header class="nb-imp-head">
      <span class="nb-imp-title">Add recipe</span>
      <button type="button" class="nb-imp-close">×</button>
    </header>
    <nav class="nb-imp-tabs">
      ${tabButton('browser', 'Browser', true)}
      ${tabButton('file', 'File', false)}
      ${tabButton('url', 'URL', false)}
    </nav>
    <section class="nb-imp-body" data-active="browser">
      <div class="nb-imp-panel" data-panel="browser">
        <input type="search" placeholder="Search recipes..." class="nb-imp-search" />
        <div class="nb-imp-recipes" data-role="list"></div>
      </div>
      <div class="nb-imp-panel" data-panel="file" hidden>
        <p class="nb-imp-hint">Pick a .md recipe file.</p>
        <input type="file" accept=".md,.markdown,text/markdown,text/plain" class="nb-imp-file" />
      </div>
      <div class="nb-imp-panel" data-panel="url" hidden>
        <p class="nb-imp-hint">Fetch a recipe URL (routed through /api/proxy).</p>
        <input type="url" placeholder="https://..." class="nb-imp-url" />
        <button type="button" class="nb-imp-btn nb-imp-primary" data-act="fetch-url">Fetch</button>
        <div class="nb-imp-error" data-role="error" hidden></div>
      </div>
    </section>
  `);

  bindCloseAndTabs(ov);

  const list = ov.querySelector('[data-role="list"]') as HTMLElement;
  const search = ov.querySelector('.nb-imp-search') as HTMLInputElement;

  // Load built-in recipes immediately + MCP recipes lazily (list_recipes)
  const includeBuiltin = opts.scope !== 'data';
  const builtin = includeBuiltin
    ? WEBMCP_RECIPES.map((r) => ({
        name: r.name,
        description: r.description,
        body: r.body,
        serverName: 'webmcp',
      }))
    : [];

  let all: ImportedRecipe[] = [...builtin];
  const hasServers = !!(opts.mcpServers && opts.mcpServers.length > 0);
  if (!includeBuiltin && !hasServers) {
    list.innerHTML = '<div class="nb-imp-empty">No data servers connected. Connect one to see recipes.</div>';
  } else if (!includeBuiltin && hasServers) {
    // No built-ins to show yet → display a transient loading state while we
    // wait for list_recipes to resolve. Avoids a flash of empty UI.
    list.innerHTML = '<div class="nb-imp-empty">Loading recipes…</div>';
  } else {
    renderList(list, all, onPickRecipe);
  }

  // Fetch MCP server recipes in parallel
  if (opts.mcpServers && opts.mcpServers.length > 0) {
    let pending = opts.mcpServers.length;
    for (const srv of opts.mcpServers) {
      callToolViaPostMessage(`${srv.name}_list_recipes`, {}).then((res: any) => {
        const items = extractRecipeItems(res, srv);
        if (items.length) {
          all = all.concat(items);
        }
      }).catch(() => { /* ignore: some servers may not expose list_recipes */ })
        .finally(() => {
          pending--;
          // Re-render now (showing whatever we have so far) and once more on
          // the final settle so the loading state is replaced even if no
          // server returned any recipes.
          if (all.length > 0 || pending === 0) {
            renderList(list, filterRecipes(all, search.value), onPickRecipe);
          }
        });
    }
  }

  search.addEventListener('input', () => renderList(list, filterRecipes(all, search.value), onPickRecipe));

  async function onPickRecipe(r: ImportedRecipe) {
    if (!r.body && r.serverName && r.serverName !== 'webmcp') {
      try {
        const res: any = await callToolViaPostMessage(`${r.serverName}_get_recipe`, { name: r.originalName ?? r.name, id: r.id ?? r.name });
        r.body = extractRecipeBody(res) ?? '';
      } catch { /* keep empty body */ }
    }
    opts.onPick(r);
    closeImportModal();
  }

  // File / URL tabs
  (ov.querySelector('.nb-imp-file') as HTMLInputElement).addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    opts.onPick({ name: file.name.replace(/\.md$/, ''), body: text });
    closeImportModal();
  });
  ov.querySelector('[data-act="fetch-url"]')!.addEventListener('click', async () => {
    const input = ov.querySelector('.nb-imp-url') as HTMLInputElement;
    const err = ov.querySelector('[data-role="error"]') as HTMLElement;
    err.hidden = true;
    const url = input.value.trim();
    if (!url) return;
    try {
      const text = await fetchViaProxy(url);
      opts.onPick({ name: new URL(url).pathname.split('/').pop() || 'recipe', body: text });
      closeImportModal();
    } catch (e: any) {
      err.textContent = 'Fetch failed: ' + (e?.message ?? e);
      err.hidden = false;
    }
  });
}

function renderList(list: HTMLElement, recipes: ImportedRecipe[], onPick: (r: ImportedRecipe) => void) {
  const sorted = sortRecipes(recipes);
  list.innerHTML = '';
  if (!sorted.length) {
    list.innerHTML = '<div class="nb-imp-empty">No recipes.</div>';
    return;
  }
  for (const r of sorted) {
    const row = document.createElement('div');
    row.className = 'nb-imp-recipe';
    row.innerHTML = `
      <div class="nb-imp-recipe-name">${escapeHtml(r.name)}</div>
      ${r.description ? `<div class="nb-imp-recipe-desc">${escapeHtml(r.description)}</div>` : ''}
      ${r.serverName ? `<div class="nb-imp-recipe-srv">${escapeHtml(r.serverName)}</div>` : ''}
    `;
    row.addEventListener('click', () => onPick(r));
    list.appendChild(row);
  }
}

function extractRecipeItems(res: any, srv: { name: string; url?: string }): ImportedRecipe[] {
  const text = res?.content?.find?.((c: any) => c.type === 'text')?.text;
  if (!text) return [];
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { return []; }
  const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.recipes) ? parsed.recipes : []);
  return items.map((it: any) => ({
    name: String(it?.name ?? it?.id ?? 'unnamed'),
    description: it?.description,
    originalName: it?.name,
    id: it?.id,
    serverName: srv.name,
    serverUrl: srv.url,
  }));
}

function extractRecipeBody(res: any): string | null {
  const text = res?.content?.find?.((c: any) => c.type === 'text')?.text;
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') return parsed.content;
  } catch { /* not JSON */ }
  return text;
}

// ---------------------------------------------------------------------------
// openRecipeViewerModal — markdown rendered + ↳ inject on each code fence
// ---------------------------------------------------------------------------

export function openRecipeViewerModal(
  recipe: ImportedRecipe,
  onInjectCell: (cell: NotebookCell) => void,
): void {
  const body = recipe.body || '';
  const ov = openWith(`
    <header class="nb-imp-head">
      <span class="nb-imp-title">${escapeHtml(recipe.name)}</span>
      <button type="button" class="nb-imp-close">×</button>
    </header>
    <div class="nb-imp-recipe-meta">
      ${recipe.description ? `<p>${escapeHtml(recipe.description)}</p>` : ''}
      ${recipe.serverName ? `<span class="nb-imp-recipe-srv">${escapeHtml(recipe.serverName)}</span>` : ''}
    </div>
    <section class="nb-imp-body nb-imp-body-recipe" data-role="render"></section>
    <footer class="nb-imp-foot">
      <button type="button" class="nb-imp-btn" data-act="inject-all">Inject all cells</button>
    </footer>
  `);
  bindCloseAndTabs(ov);

  const target = ov.querySelector('[data-role="render"]') as HTMLElement;
  const { root } = renderMarkdownWithInjectButtons(body, ({ lang, content }) => {
    const cell = fenceToCell(lang, content);
    onInjectCell(cell);
  });
  target.appendChild(root);

  ov.querySelector('[data-act="inject-all"]')!.addEventListener('click', () => {
    const cells = extractCellsFromRecipe(body, { title: recipe.name, description: recipe.description });
    for (const c of cells) onInjectCell(c);
    closeImportModal();
  });
}

function fenceToCell(lang: string, content: string): NotebookCell {
  return extractCellFromFence(lang, content);
}

// ---------------------------------------------------------------------------
// openToolViewerModal — show tool meta + inject button
// ---------------------------------------------------------------------------

export function openToolViewerModal(
  tool: McpToolLike,
  onInjectCells: (cells: NotebookCell[]) => void,
): void {
  const schema = tool.inputSchema ?? tool.schema ?? {};
  const ov = openWith(`
    <header class="nb-imp-head">
      <span class="nb-imp-title">${escapeHtml(tool.name)}${tool.serverName ? ` <span class="nb-imp-recipe-srv">${escapeHtml(tool.serverName)}</span>` : ''}</span>
      <button type="button" class="nb-imp-close">×</button>
    </header>
    <section class="nb-imp-body nb-imp-body-tool">
      ${tool.description ? `<p class="nb-imp-tool-desc">${escapeHtml(tool.description)}</p>` : ''}
      <div class="nb-imp-tool-schema">
        <div class="nb-imp-hint">input schema</div>
        <pre><code>${escapeHtml(JSON.stringify(schema, null, 2))}</code></pre>
      </div>
    </section>
    <footer class="nb-imp-foot">
      <button type="button" class="nb-imp-btn nb-imp-primary" data-act="inject">↳ inject as cell</button>
    </footer>
  `);
  bindCloseAndTabs(ov);
  ov.querySelector('[data-act="inject"]')!.addEventListener('click', () => {
    onInjectCells(extractCellsFromTool(tool));
    closeImportModal();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bindCloseAndTabs(ov: HTMLElement) {
  ov.querySelector('.nb-imp-close')?.addEventListener('click', closeImportModal);
  const tabs = ov.querySelectorAll<HTMLElement>('.nb-imp-tab');
  const panels = ov.querySelectorAll<HTMLElement>('.nb-imp-panel');
  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.remove('nb-imp-tab-active'));
      t.classList.add('nb-imp-tab-active');
      const id = t.dataset.tab;
      panels.forEach((p) => { p.hidden = p.dataset.panel !== id; });
    });
  });
}

async function fetchViaProxy(url: string): Promise<string> {
  // Use the local proxy endpoint if available, else direct fetch.
  // Agent H wires /api/proxy.
  try {
    const prox = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(prox);
    if (res.ok) return await res.text();
  } catch { /* fallback to direct */ }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Styles (injected once)
// ---------------------------------------------------------------------------

function injectImportStyles() {
  if (document.getElementById('nb-import-styles')) return;
  const s = document.createElement('style');
  s.id = 'nb-import-styles';
  s.textContent = `
    .nb-import-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,0.5);
      display: none; align-items: center; justify-content: center;
    }
    .nb-import-overlay.open { display: flex; }
    .nb-import-modal {
      width: min(680px, 92vw); max-height: 84vh;
      background: var(--color-surface, #fff); color: var(--color-text1, #111);
      border-radius: 14px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: var(--font-sans, system-ui);
    }
    .nb-imp-head {
      display: flex; align-items: center; padding: 14px 18px;
      border-bottom: 1px solid var(--color-border, #eee);
    }
    .nb-imp-title { flex: 1; font-weight: 600; font-size: 14px; }
    .nb-imp-recipe-srv {
      font-family: monospace; font-size: 11px; color: var(--color-text2, #666);
      margin-left: 6px;
    }
    .nb-imp-close { background: none; border: none; cursor: pointer; font-size: 20px; line-height: 1; color: var(--color-text2, #666); }
    .nb-imp-tabs { display: flex; padding: 0 14px; border-bottom: 1px solid var(--color-border, #eee); }
    .nb-imp-tab {
      background: none; border: none; cursor: pointer; padding: 10px 14px;
      font-size: 12px; color: var(--color-text2, #666);
      border-bottom: 2px solid transparent;
    }
    .nb-imp-tab-active { color: var(--color-text1, #111); border-bottom-color: var(--color-accent, #6a55ff); }
    .nb-imp-body { padding: 16px 18px; overflow-y: auto; flex: 1; }
    .nb-imp-body-recipe, .nb-imp-body-tool { font-size: 13px; }
    .nb-imp-panel[hidden] { display: none; }
    .nb-imp-hint { font-size: 12px; color: var(--color-text2, #666); margin: 0 0 10px 0; }
    .nb-imp-btn {
      background: var(--color-surface2, #f4f4f5); border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 6px; padding: 8px 14px; font-size: 12px; cursor: pointer;
    }
    .nb-imp-btn:hover { background: var(--color-surface3, #eeeef0); }
    .nb-imp-primary { background: var(--color-accent, #6a55ff); color: #fff; border: 0; }
    .nb-imp-primary:hover { filter: brightness(1.08); }
    .nb-imp-search, .nb-imp-url {
      width: 100%; padding: 8px 10px; border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 6px; font-size: 12px; margin-bottom: 10px;
      background: var(--color-surface, #fff); color: var(--color-text1, #111);
    }
    .nb-imp-file { font-size: 12px; }
    .nb-imp-md-textarea {
      width: 100%; min-height: 180px;
      font-family: var(--font-mono, 'IBM Plex Mono', monospace);
      font-size: 13px; line-height: 1.5;
      padding: 10px 12px;
      border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 6px;
      background: var(--color-bg, #fff);
      color: var(--color-text1, #111);
      resize: vertical;
      outline: none;
      box-sizing: border-box;
    }
    .nb-imp-md-textarea:focus { border-color: var(--color-accent, #6a55ff); }
    .nb-imp-md-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
    .nb-imp-recipes { display: flex; flex-direction: column; gap: 6px; max-height: 46vh; overflow-y: auto; }
    .nb-imp-recipe {
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
      background: var(--color-surface2, #f4f4f5);
      transition: background 0.12s;
    }
    .nb-imp-recipe:hover { background: var(--color-surface3, #eeeef0); }
    .nb-imp-recipe-name { font-weight: 500; font-size: 13px; }
    .nb-imp-recipe-desc { font-size: 11.5px; color: var(--color-text2, #666); margin-top: 3px; }
    .nb-imp-recipe-meta { padding: 0 18px 10px; border-bottom: 1px solid var(--color-border, #eee); }
    .nb-imp-empty { color: var(--color-text2, #666); font-size: 12px; padding: 14px; text-align: center; }
    .nb-imp-foot { padding: 12px 18px; border-top: 1px solid var(--color-border, #eee); display: flex; justify-content: flex-end; gap: 8px; }
    .nb-imp-error { color: #c2323a; font-size: 12px; margin-top: 8px; }

    .nb-md-render { font-size: 13px; line-height: 1.5; }
    .nb-md-render h1, .nb-md-render h2, .nb-md-render h3 { margin: 12px 0 6px; }
    .nb-md-render p { margin: 6px 0; }
    .nb-md-render ul, .nb-md-render ol { margin: 6px 0 6px 20px; }
    .nb-md-render pre {
      background: var(--color-surface2, #f4f4f5); padding: 10px 12px;
      border-radius: 6px; overflow-x: auto; font-size: 12px;
    }
    .nb-md-render code { font-family: var(--font-mono, monospace); font-size: 12px; }
    .nb-md-fence {
      border: 1px solid var(--color-border, #e4e4e7); border-radius: 8px;
      margin: 10px 0; overflow: hidden;
    }
    .nb-md-fence-head {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 10px; background: var(--color-surface2, #f4f4f5);
      font-size: 11px; color: var(--color-text2, #666);
      border-bottom: 1px solid var(--color-border, #e4e4e7);
    }
    .nb-md-fence-lang { font-family: monospace; flex: 1; }
    .nb-md-fence-inject {
      background: var(--color-accent, #6a55ff); color: #fff; border: 0;
      border-radius: 4px; padding: 3px 9px; font-size: 11px; cursor: pointer;
    }
    .nb-md-fence-inject:hover { filter: brightness(1.08); }
    .nb-md-fence pre { margin: 0; border-radius: 0; background: transparent; }

    .nb-imp-tool-desc { font-size: 13px; margin: 0 0 10px; }
    .nb-imp-tool-schema pre {
      background: var(--color-surface2, #f4f4f5); padding: 10px;
      border-radius: 6px; max-height: 40vh; overflow: auto; font-size: 11.5px;
    }
  `;
  document.head.appendChild(s);
}
