// @ts-nocheck
// ---------------------------------------------------------------------------
// import-modal-api.ts — Imperative wrappers around <auto-import-modal>
//
// Replaces import-modals.ts. Same 4-function API:
//   openAddMdModal(onPick)
//   openAddRecipeModal(opts)
//   openRecipeViewerModal(recipe, onInjectCell)
//   openToolViewerModal(tool, onInjectCells)
//   closeImportModal()
//
// Each function ensures the singleton CE is mounted, then calls openModal()
// on it. CustomEvent 'widget:interact' carries the results back.
// ---------------------------------------------------------------------------

// Side-effect import: registers <auto-import-modal> custom element
import './import-modal.svelte';

import { renderMarkdownWithInjectButtons } from './prose.js';
import { extractCellsFromRecipe, extractCellsFromTool, extractCellFromFence } from './resource-extractor.js';
import type { NotebookCell } from './shared.js';
import type { McpToolLike } from './resource-extractor.js';

// ---------------------------------------------------------------------------
// Types (defined here to avoid exporting from .svelte; consumers import from
// import-modal-api.js, not from import-modal.svelte)
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

export interface AddRecipeModalOptions {
  mcpServers?: Array<{ name: string; url?: string }>;
  scope?: 'data' | 'all';
  onPick: (recipe: ImportedRecipe) => void;
}

// ---------------------------------------------------------------------------
// Singleton mount
// ---------------------------------------------------------------------------

type ModalEl = HTMLElement & {
  openModal(data: Record<string, unknown>): void;
  closeModal(): void;
};

let _modal: ModalEl | null = null;
let _cleanup: (() => void) | null = null;

function ensureModal(): ModalEl {
  if (_modal && document.contains(_modal)) return _modal;

  // Register the CE if not already done (Svelte registers it on first import
  // but we ensure it here for safety).
  if (!customElements.get('auto-import-modal')) {
    // Dynamic import triggers CE registration via Svelte's customElement decorator.
    // Since this module is already bundled with the CE, it's already registered.
    // If somehow not registered, fall back gracefully.
  }

  const el = document.createElement('auto-import-modal') as ModalEl;
  document.body.appendChild(el);
  _modal = el;
  return el;
}

// ---------------------------------------------------------------------------
// closeImportModal — public
// ---------------------------------------------------------------------------

export function closeImportModal(): void {
  _modal?.closeModal?.();
}

// ---------------------------------------------------------------------------
// openAddMdModal
// ---------------------------------------------------------------------------

export function openAddMdModal(onPick: (content: string) => void): void {
  const el = ensureModal();

  // Clean up previous listener
  _cleanup?.();

  const handler = (e: CustomEvent) => {
    const { action, payload } = e.detail ?? {};
    if (action === 'pick-md') {
      onPick(payload as string);
    }
    if (action === 'pick-md' || action === 'close') {
      el.removeEventListener('widget:interact', handler as EventListener);
      _cleanup = null;
    }
  };

  el.addEventListener('widget:interact', handler as EventListener);
  _cleanup = () => el.removeEventListener('widget:interact', handler as EventListener);

  el.openModal({ mode: 'add-md' });
}

// ---------------------------------------------------------------------------
// openAddRecipeModal
// ---------------------------------------------------------------------------

export function openAddRecipeModal(opts: AddRecipeModalOptions): void {
  const el = ensureModal();

  _cleanup?.();

  const handler = (e: CustomEvent) => {
    const { action, payload } = e.detail ?? {};
    if (action === 'pick-recipe') {
      opts.onPick(payload as ImportedRecipe);
    }
    if (action === 'pick-recipe' || action === 'close') {
      el.removeEventListener('widget:interact', handler as EventListener);
      _cleanup = null;
    }
  };

  el.addEventListener('widget:interact', handler as EventListener);
  _cleanup = () => el.removeEventListener('widget:interact', handler as EventListener);

  el.openModal({
    mode: 'add-recipe',
    mcpServers: opts.mcpServers,
    scope: opts.scope,
  });
}

// ---------------------------------------------------------------------------
// openRecipeViewerModal
// ---------------------------------------------------------------------------

export function openRecipeViewerModal(
  recipe: ImportedRecipe,
  onInjectCell: (cell: NotebookCell) => void,
): void {
  const el = ensureModal();

  _cleanup?.();

  // We'll hold a reference to the prose renderer's destroy fn.
  let proseDestroy: (() => void) | null = null;

  const handler = (e: CustomEvent) => {
    const { action, payload } = e.detail ?? {};

    if (action === 'inject-fence') {
      const { lang, content } = payload as { lang: string; content: string };
      const cell = extractCellFromFence(lang, content);
      onInjectCell(cell);
    }

    if (action === 'inject-all') {
      const cells = extractCellsFromRecipe(recipe.body ?? '', {
        title: recipe.name,
        description: recipe.description,
      });
      for (const c of cells) onInjectCell(c);
    }

    if (action === 'inject-all' || action === 'close') {
      el.removeEventListener('widget:interact', handler as EventListener);
      proseDestroy?.();
      proseDestroy = null;
      _cleanup = null;
    }
  };

  el.addEventListener('widget:interact', handler as EventListener);
  _cleanup = () => {
    el.removeEventListener('widget:interact', handler as EventListener);
    proseDestroy?.();
    proseDestroy = null;
  };

  el.openModal({ mode: 'recipe-viewer', recipe });

  // After the CE opens, inject the rendered markdown into [data-role="render"].
  // requestAnimationFrame ensures Svelte has rendered the modal DOM.
  requestAnimationFrame(() => {
    const renderTarget = el.querySelector('[data-role="render"]') as HTMLElement | null;
    if (!renderTarget) return;
    const { root, destroy } = renderMarkdownWithInjectButtons(
      recipe.body ?? '',
      ({ lang, content }) => {
        const cell = extractCellFromFence(lang, content);
        onInjectCell(cell);
      },
    );
    renderTarget.appendChild(root);
    proseDestroy = destroy;
  });
}

// ---------------------------------------------------------------------------
// openToolViewerModal
// ---------------------------------------------------------------------------

export function openToolViewerModal(
  tool: McpToolLike,
  onInjectCells: (cells: NotebookCell[]) => void,
): void {
  const el = ensureModal();

  _cleanup?.();

  const handler = (e: CustomEvent) => {
    const { action } = e.detail ?? {};

    if (action === 'inject-tool') {
      const cells = extractCellsFromTool(tool);
      onInjectCells(cells);
    }

    if (action === 'inject-tool' || action === 'close') {
      el.removeEventListener('widget:interact', handler as EventListener);
      _cleanup = null;
    }
  };

  el.addEventListener('widget:interact', handler as EventListener);
  _cleanup = () => el.removeEventListener('widget:interact', handler as EventListener);

  el.openModal({ mode: 'tool-viewer', tool });
}
