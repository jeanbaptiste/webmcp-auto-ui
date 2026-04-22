// @ts-nocheck
// ---------------------------------------------------------------------------
// recipe-browser — vanilla widget renderer
// Interactive browser: search, filter by kind/tags, layout toggle, preview, pick/download.
// ---------------------------------------------------------------------------

// NOTE: this widget lives in @webmcp-auto-ui/ui but imports runtime helpers from
// @webmcp-auto-ui/agent, creating an ESM cycle ui <-> agent. The cycle is safe
// because these imports are only used inside functions (no top-level eval).
import { filterRecipes, sortRecipes, recipeToDownloadBlob, recipeToMarkdown } from '@webmcp-auto-ui/agent';
import type { Recipe } from '@webmcp-auto-ui/agent';

export interface RecipeBrowserData {
  recipes: Recipe[];
  filters?: { tags?: string[]; kind?: 'webmcp' | 'mcp' | 'all'; q?: string };
  layout?: 'list' | 'grid';
  onPick?: (recipe: Recipe) => void;
}

const STYLE_ID = 'rb-recipe-browser-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .recipe-browser-root {
      display: flex; flex-direction: column; gap: 10px;
      font-family: var(--font-sans, system-ui, sans-serif);
      color: var(--color-text1, #111);
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 10px;
      padding: 14px;
      min-height: 360px;
      box-sizing: border-box;
    }
    .recipe-browser-root * { box-sizing: border-box; }
    .rb-head {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--color-border, #e4e4e7);
    }
    .rb-search {
      flex: 1 1 200px; min-width: 160px;
      padding: 7px 10px; font-size: 13px;
      border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 6px;
      background: var(--color-surface, #fff);
      color: var(--color-text1, #111);
      outline: none;
    }
    .rb-search:focus { border-color: var(--color-accent, #6a55ff); }
    .rb-select {
      padding: 7px 10px; font-size: 12px;
      border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 6px;
      background: var(--color-surface, #fff);
      color: var(--color-text1, #111);
    }
    .rb-layout-toggle { display: inline-flex; border: 1px solid var(--color-border, #e4e4e7); border-radius: 6px; overflow: hidden; }
    .rb-layout-btn {
      background: var(--color-surface, #fff); color: var(--color-text2, #666);
      border: 0; padding: 7px 10px; font-size: 12px; cursor: pointer;
    }
    .rb-layout-btn.rb-on { background: var(--color-accent, #6a55ff); color: #fff; }
    .rb-body {
      display: grid; grid-template-columns: minmax(220px, 320px) 1fr;
      gap: 12px; min-height: 280px;
    }
    .rb-body[data-layout="grid"] { grid-template-columns: 1fr; }
    .rb-body[data-layout="grid"] .rb-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; max-height: none; }
    .rb-list {
      display: flex; flex-direction: column; gap: 6px;
      max-height: 420px; overflow-y: auto;
      padding-right: 4px;
    }
    .rb-item {
      padding: 9px 11px; border-radius: 8px;
      background: var(--color-surface2, #f4f4f5);
      border: 1px solid transparent;
      cursor: pointer; transition: background .12s, border-color .12s;
    }
    .rb-item:hover { background: var(--color-surface3, #eeeef0); }
    .rb-item.rb-selected { border-color: var(--color-accent, #6a55ff); background: var(--color-surface3, #eeeef0); }
    .rb-item-name { font-weight: 600; font-size: 13px; margin-bottom: 3px; }
    .rb-item-desc { font-size: 11.5px; color: var(--color-text2, #666); margin-bottom: 6px; line-height: 1.35; }
    .rb-item-foot { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .rb-chip {
      font-size: 10.5px; font-family: var(--font-mono, monospace);
      padding: 1px 6px; border-radius: 999px;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e4e4e7);
      color: var(--color-text2, #666);
    }
    .rb-chip.rb-srv { background: var(--color-accent, #6a55ff); color: #fff; border-color: transparent; }
    .rb-preview {
      display: flex; flex-direction: column; min-height: 260px;
      border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 8px; overflow: hidden;
      background: var(--color-surface, #fff);
    }
    .rb-preview-head {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 12px;
      border-bottom: 1px solid var(--color-border, #e4e4e7);
      background: var(--color-surface2, #f4f4f5);
    }
    .rb-preview-title { flex: 1; font-weight: 600; font-size: 13px; }
    .rb-preview-body {
      flex: 1; padding: 12px; overflow-y: auto;
      font-size: 12.5px; line-height: 1.5;
      max-height: 420px;
    }
    .rb-preview-body pre {
      background: var(--color-surface2, #f4f4f5);
      padding: 10px; border-radius: 6px;
      overflow-x: auto;
      font-family: var(--font-mono, monospace);
      font-size: 11.5px;
      white-space: pre-wrap;
      margin: 0;
    }
    .rb-btn {
      background: var(--color-surface2, #f4f4f5);
      border: 1px solid var(--color-border, #e4e4e7);
      border-radius: 6px; padding: 6px 12px; font-size: 12px;
      color: var(--color-text1, #111);
      cursor: pointer;
    }
    .rb-btn:hover { background: var(--color-surface3, #eeeef0); }
    .rb-btn-primary { background: var(--color-accent, #6a55ff); color: #fff; border-color: transparent; }
    .rb-btn-primary:hover { filter: brightness(1.08); }
    .rb-empty { padding: 24px; text-align: center; color: var(--color-text2, #666); font-size: 12px; }
    .rb-placeholder { color: var(--color-text2, #666); font-size: 12px; padding: 24px; text-align: center; }
  `;
  document.head.appendChild(s);
}

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function detectKind(r: Recipe): 'webmcp' | 'mcp' {
  // Heuristic: if frontmatter 'servers' present and non-empty, treat as MCP-connected.
  const srv = (r as any).server ?? (r as any).serverName;
  if (typeof srv === 'string' && srv && srv !== 'webmcp') return 'mcp';
  return 'webmcp';
}

function recipeTags(r: Recipe): string[] {
  const out: string[] = [];
  if (Array.isArray(r.servers)) out.push(...r.servers);
  if (Array.isArray(r.components_used)) out.push(...r.components_used.slice(0, 3));
  return out;
}

function serverLabel(r: Recipe): string {
  const srv = (r as any).server ?? (r as any).serverName;
  if (typeof srv === 'string' && srv) return srv;
  if (Array.isArray(r.servers) && r.servers.length) return r.servers[0];
  return 'webmcp';
}

function simpleMarkdown(body: string): string {
  // Minimal safe rendering: escape + preserve paragraphs + wrap fences in <pre>.
  const escaped = escapeHtml(body);
  // Code fences
  const withFences = escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${code}</code></pre>`;
  });
  // Paragraphs (double newlines)
  const paras = withFences.split(/\n{2,}/).map((p) => {
    if (p.startsWith('<pre>')) return p;
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  });
  return paras.join('\n');
}

export function render(container: HTMLElement, data: RecipeBrowserData): () => void {
  injectStyles();

  const all: Recipe[] = Array.isArray(data?.recipes) ? data.recipes : [];
  if (!all.length) {
    container.innerHTML = '<div class="recipe-browser-root"><div class="rb-empty">No recipes available.</div></div>';
    return () => { container.innerHTML = ''; };
  }

  const initialFilters = data?.filters ?? {};
  let q = initialFilters.q ?? '';
  let kind: 'all' | 'webmcp' | 'mcp' = initialFilters.kind ?? 'all';
  let layout: 'list' | 'grid' = data?.layout === 'grid' ? 'grid' : 'list';
  let selectedId: string | null = null;

  const root = document.createElement('div');
  root.className = 'recipe-browser-root';
  root.innerHTML = `
    <div class="rb-head">
      <input type="search" class="rb-search" placeholder="Search recipes..." value="${escapeHtml(q)}" />
      <select class="rb-select" data-role="kind">
        <option value="all"${kind === 'all' ? ' selected' : ''}>All kinds</option>
        <option value="webmcp"${kind === 'webmcp' ? ' selected' : ''}>WebMCP</option>
        <option value="mcp"${kind === 'mcp' ? ' selected' : ''}>MCP</option>
      </select>
      <div class="rb-layout-toggle">
        <button type="button" class="rb-layout-btn${layout === 'list' ? ' rb-on' : ''}" data-layout="list">list</button>
        <button type="button" class="rb-layout-btn${layout === 'grid' ? ' rb-on' : ''}" data-layout="grid">grid</button>
      </div>
    </div>
    <div class="rb-body" data-layout="${layout}">
      <div class="rb-list" data-role="list"></div>
      <div class="rb-preview" data-role="preview">
        <div class="rb-placeholder">Select a recipe to preview.</div>
      </div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(root);

  const searchEl = root.querySelector('.rb-search') as HTMLInputElement;
  const kindEl = root.querySelector('[data-role="kind"]') as HTMLSelectElement;
  const bodyEl = root.querySelector('.rb-body') as HTMLElement;
  const listEl = root.querySelector('[data-role="list"]') as HTMLElement;
  const previewEl = root.querySelector('[data-role="preview"]') as HTMLElement;
  const layoutBtns = Array.from(root.querySelectorAll('.rb-layout-btn')) as HTMLButtonElement[];

  const listeners: Array<{ el: EventTarget; type: string; fn: EventListener }> = [];
  function on<T extends EventTarget>(el: T, type: string, fn: EventListener) {
    el.addEventListener(type, fn);
    listeners.push({ el, type, fn });
  }

  function applyFilters(): Recipe[] {
    let filtered = all.slice();
    if (kind !== 'all') filtered = filtered.filter((r) => detectKind(r) === kind);
    // Tag filter (optional): keep only recipes whose tags intersect data.filters.tags
    const wantTags = initialFilters.tags;
    if (Array.isArray(wantTags) && wantTags.length) {
      const wanted = new Set(wantTags.map((t) => String(t).toLowerCase()));
      filtered = filtered.filter((r) => recipeTags(r).some((t) => wanted.has(String(t).toLowerCase())));
    }
    filtered = filterRecipes(filtered, q);
    return sortRecipes(filtered);
  }

  function renderList() {
    const items = applyFilters();
    listEl.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'rb-empty';
      empty.textContent = 'No matches.';
      listEl.appendChild(empty);
      return;
    }
    for (const r of items) {
      const id = r.id ?? r.name ?? '';
      const node = document.createElement('div');
      node.className = 'rb-item' + (id === selectedId ? ' rb-selected' : '');
      const tags = recipeTags(r).slice(0, 4);
      node.innerHTML = `
        <div class="rb-item-name">${escapeHtml(r.name || 'Untitled')}</div>
        <div class="rb-item-desc">${escapeHtml(r.description || 'No description')}</div>
        <div class="rb-item-foot">
          <span class="rb-chip rb-srv">${escapeHtml(serverLabel(r))}</span>
          ${tags.map((t) => `<span class="rb-chip">${escapeHtml(t)}</span>`).join('')}
        </div>
      `;
      on(node, 'click', () => {
        selectedId = id;
        renderList();
        renderPreview(r);
      });
      listEl.appendChild(node);
    }
  }

  function renderPreview(r: Recipe) {
    const md = typeof r.body === 'string' && r.body.trim()
      ? r.body
      : (() => { try { return recipeToMarkdown(r as any); } catch { return ''; } })();
    previewEl.innerHTML = `
      <div class="rb-preview-head">
        <span class="rb-preview-title">${escapeHtml(r.name || 'Untitled')}</span>
        <button type="button" class="rb-btn" data-act="download">Download .md</button>
        <button type="button" class="rb-btn rb-btn-primary" data-act="pick">Pick</button>
      </div>
      <div class="rb-preview-body">${md ? simpleMarkdown(md) : '<div class="rb-placeholder">No body.</div>'}</div>
    `;

    const pickBtn = previewEl.querySelector('[data-act="pick"]') as HTMLButtonElement | null;
    const dlBtn = previewEl.querySelector('[data-act="download"]') as HTMLButtonElement | null;

    if (pickBtn) {
      on(pickBtn, 'click', () => {
        if (typeof data.onPick === 'function') {
          data.onPick(r);
        } else {
          container.dispatchEvent(new CustomEvent('widget:interact', {
            bubbles: true,
            detail: { action: 'pick', payload: r },
          }));
        }
      });
    }
    if (dlBtn) {
      on(dlBtn, 'click', () => {
        try {
          const { blob, filename } = recipeToDownloadBlob(r as any);
          triggerDownload(blob, filename);
        } catch {
          // fallback
          const body = typeof r.body === 'string' ? r.body : '';
          const blob = new Blob([body], { type: 'text/markdown' });
          const filename = (r.name || r.id || 'recipe').replace(/[^a-z0-9_.-]/gi, '-').toLowerCase() + '.md';
          triggerDownload(blob, filename);
        }
      });
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  on(searchEl, 'input', () => { q = searchEl.value; renderList(); });
  on(kindEl, 'change', () => { kind = (kindEl.value as any); renderList(); });
  for (const btn of layoutBtns) {
    on(btn, 'click', () => {
      layout = (btn.dataset.layout as 'list' | 'grid') || 'list';
      bodyEl.setAttribute('data-layout', layout);
      layoutBtns.forEach((b) => b.classList.toggle('rb-on', b === btn));
    });
  }

  renderList();

  return () => {
    for (const { el, type, fn } of listeners) el.removeEventListener(type, fn);
    listeners.length = 0;
    container.innerHTML = '';
  };
}
