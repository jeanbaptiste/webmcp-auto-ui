// @ts-nocheck
// ---------------------------------------------------------------------------
// Left pane — collapsible resource browser (Chrome-bookmarks-style).
// Lists recipes + tools per connected MCP server.
// Click opens the appropriate viewer modal (recipe / tool).
// Collapsed by default.
// ---------------------------------------------------------------------------

import { callToolViaPostMessage } from '@webmcp-auto-ui/core';
import { openRecipeViewerModal, openToolViewerModal, type ImportedRecipe } from './import-modals.js';
import type { NotebookCell, NotebookState, DataServerDescriptor } from './shared.js';

export interface LeftPaneHandlers {
  /** Called when the user injects one or more cells from a recipe/tool viewer. */
  onInjectCells: (cells: NotebookCell[]) => void;
}

export interface LeftPaneHandle {
  root: HTMLElement;
  setServers(servers: DataServerDescriptor[]): void;
  toggle(open?: boolean): void;
  destroy(): void;
}

/**
 * Mount a left pane inside `host`. The pane is collapsed by default;
 * click the handle to expand. Returns a handle the widget can use to
 * feed updated server lists or toggle programmatically.
 */
export function mountLeftPane(
  host: HTMLElement,
  state: NotebookState,
  initialServers: DataServerDescriptor[],
  handlers: LeftPaneHandlers,
): LeftPaneHandle {
  injectLeftPaneStyles();

  const root = document.createElement('aside');
  root.className = 'nb-lp';
  root.innerHTML = `
    <button type="button" class="nb-lp-handle" aria-label="Toggle resources" title="Resources">
      <span class="nb-lp-handle-icon">▸</span>
      <span class="nb-lp-handle-label">Resources</span>
    </button>
    <div class="nb-lp-body" hidden>
      <header class="nb-lp-head">
        <span class="nb-lp-title">Resources</span>
        <button type="button" class="nb-lp-close" aria-label="Close">×</button>
      </header>
      <div class="nb-lp-servers" data-role="servers"></div>
    </div>
  `;
  host.appendChild(root);

  const handle = root.querySelector('.nb-lp-handle') as HTMLElement;
  const body = root.querySelector('.nb-lp-body') as HTMLElement;
  const closeBtn = root.querySelector('.nb-lp-close') as HTMLElement;
  const serversEl = root.querySelector('[data-role="servers"]') as HTMLElement;

  let servers: DataServerDescriptor[] = initialServers ?? [];
  // Recipe-body cache per serverName/name key
  const recipeBodyCache = new Map<string, string>();

  function render() {
    serversEl.innerHTML = '';
    if (!servers.length) {
      serversEl.innerHTML = '<div class="nb-lp-empty">No servers connected.</div>';
      return;
    }
    for (const srv of servers) {
      const section = document.createElement('section');
      section.className = 'nb-lp-srv';
      section.innerHTML = `
        <header class="nb-lp-srv-head">
          <span class="nb-lp-srv-dot"></span>
          <span class="nb-lp-srv-name">${escapeHtml(srv.name)}</span>
          <span class="nb-lp-srv-meta">${(srv.recipes?.length ?? 0)} recipes · ${(srv.tools?.length ?? 0)} tools</span>
        </header>
        <div class="nb-lp-srv-groups">
          ${srv.recipes?.length ? `
            <details class="nb-lp-group" open>
              <summary>📜 Recipes (${srv.recipes.length})</summary>
              <ul class="nb-lp-list" data-role="recipes"></ul>
            </details>
          ` : ''}
          ${srv.tools?.length ? `
            <details class="nb-lp-group">
              <summary>⚙ Tools (${srv.tools.length})</summary>
              <ul class="nb-lp-list" data-role="tools"></ul>
            </details>
          ` : ''}
        </div>
      `;
      const recList = section.querySelector('[data-role="recipes"]') as HTMLElement | null;
      if (recList && srv.recipes) {
        for (const r of srv.recipes) {
          const li = document.createElement('li');
          li.className = 'nb-lp-item';
          li.innerHTML = `
            <span class="nb-lp-item-name">${escapeHtml(r.name)}</span>
            ${r.description ? `<span class="nb-lp-item-desc">${escapeHtml(r.description)}</span>` : ''}
          `;
          li.addEventListener('click', () => onRecipeClick(srv, r));
          recList.appendChild(li);
        }
      }
      const toolList = section.querySelector('[data-role="tools"]') as HTMLElement | null;
      if (toolList && srv.tools) {
        for (const t of srv.tools) {
          const li = document.createElement('li');
          li.className = 'nb-lp-item';
          li.innerHTML = `
            <span class="nb-lp-item-name nb-lp-tool">${escapeHtml(t.name)}</span>
            ${t.description ? `<span class="nb-lp-item-desc">${escapeHtml(t.description)}</span>` : ''}
          `;
          li.addEventListener('click', () => onToolClick(srv, t));
          toolList.appendChild(li);
        }
      }
      serversEl.appendChild(section);
    }
  }

  async function onRecipeClick(srv: DataServerDescriptor, r: { name: string; description?: string; body?: string }) {
    const imported: ImportedRecipe = {
      name: r.name,
      description: r.description,
      body: r.body,
      serverName: srv.name,
      originalName: r.name,
    };
    const key = srv.name + ':' + r.name;
    if (!imported.body && recipeBodyCache.has(key)) {
      imported.body = recipeBodyCache.get(key);
    }
    if (!imported.body) {
      try {
        const res: any = await callToolViaPostMessage('get_recipe', { name: r.name, id: r.name });
        const text = res?.content?.find?.((c: any) => c.type === 'text')?.text;
        if (text) {
          let body = text;
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') body = parsed.content;
          } catch { /* not JSON */ }
          imported.body = body;
          recipeBodyCache.set(key, body);
        }
      } catch { /* pass empty body to viewer */ }
    }
    openRecipeViewerModal(imported, (cell) => handlers.onInjectCells([cell]));
  }

  function onToolClick(srv: DataServerDescriptor, t: { name: string; description?: string; inputSchema?: unknown }) {
    openToolViewerModal({ ...t, serverName: srv.name }, (cells) => handlers.onInjectCells(cells));
  }

  handle.addEventListener('click', () => toggle());
  closeBtn.addEventListener('click', () => toggle(false));

  function toggle(open?: boolean) {
    const nextOpen = typeof open === 'boolean' ? open : !!body.hidden;
    body.hidden = !nextOpen;
    root.classList.toggle('nb-lp-open', nextOpen);
    (root.querySelector('.nb-lp-handle-icon') as HTMLElement).textContent = nextOpen ? '◂' : '▸';
  }

  render();

  return {
    root,
    setServers(next) {
      servers = next ?? [];
      render();
    },
    toggle,
    destroy() {
      root.remove();
    },
  };
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectLeftPaneStyles() {
  if (document.getElementById('nb-lp-styles')) return;
  const s = document.createElement('style');
  s.id = 'nb-lp-styles';
  s.textContent = `
    .nb-lp {
      position: relative; display: flex; flex-direction: row; flex-shrink: 0;
      font-family: var(--font-sans, system-ui); font-size: 12px;
      color: var(--color-text1, #111);
    }
    .nb-lp-handle {
      writing-mode: vertical-rl; transform: rotate(180deg);
      background: var(--color-surface2, #f4f4f5);
      border: 1px solid var(--color-border, #e4e4e7); border-radius: 6px;
      padding: 10px 5px; cursor: pointer;
      display: flex; align-items: center; gap: 6px;
      height: fit-content; font-size: 11px; color: var(--color-text2, #666);
      align-self: flex-start; margin-top: 12px; margin-right: 4px;
    }
    .nb-lp-handle:hover { background: var(--color-surface3, #eeeef0); }
    .nb-lp-handle-icon { font-size: 10px; }
    .nb-lp.nb-lp-open .nb-lp-handle { display: none; }
    .nb-lp-body[hidden] { display: none !important; }
    .nb-lp-body {
      width: 260px; border-right: 1px solid var(--color-border, #e4e4e7);
      background: var(--color-surface, #fff);
      display: flex; flex-direction: column; max-height: 100%; overflow: hidden;
    }
    .nb-lp-head {
      display: flex; align-items: center; padding: 10px 12px;
      border-bottom: 1px solid var(--color-border, #e4e4e7);
    }
    .nb-lp-title { flex: 1; font-weight: 600; font-size: 12px; }
    .nb-lp-close { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--color-text2, #666); }
    .nb-lp-servers { overflow-y: auto; padding: 8px 10px 12px; flex: 1; }
    .nb-lp-srv { margin-bottom: 10px; }
    .nb-lp-srv-head {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 2px; font-size: 11px; color: var(--color-text2, #666);
    }
    .nb-lp-srv-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent, #6a55ff);
      flex-shrink: 0;
    }
    .nb-lp-srv-name { font-weight: 600; color: var(--color-text1, #111); }
    .nb-lp-srv-meta { margin-left: auto; font-family: monospace; font-size: 10.5px; }
    .nb-lp-group > summary {
      cursor: pointer; padding: 4px 2px; font-size: 11px;
      color: var(--color-text2, #666); font-family: monospace;
    }
    .nb-lp-list { list-style: none; padding: 0 0 0 6px; margin: 2px 0 6px; }
    .nb-lp-item {
      padding: 5px 8px; border-radius: 4px; cursor: pointer;
      display: flex; flex-direction: column; gap: 2px;
    }
    .nb-lp-item:hover { background: var(--color-surface2, #f4f4f5); }
    .nb-lp-item-name { font-size: 12px; }
    .nb-lp-tool { font-family: monospace; }
    .nb-lp-item-desc { font-size: 10.5px; color: var(--color-text2, #666); }
    .nb-lp-empty { padding: 12px; font-size: 11px; color: var(--color-text2, #666); text-align: center; }
  `;
  document.head.appendChild(s);
}
