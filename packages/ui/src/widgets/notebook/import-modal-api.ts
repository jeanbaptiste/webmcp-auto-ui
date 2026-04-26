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

async function ensureModal(): Promise<ModalEl> {
  if (_modal && document.contains(_modal)) return _modal;

  const el = document.createElement('auto-import-modal') as ModalEl;
  document.body.appendChild(el);
  // Svelte 5's connectedCallback is async (awaits a microtask before creating
  // $$c), and exported methods are exposed via getters that read $$c. Yield
  // one microtask so el.openModal/closeModal are defined when we call them.
  await Promise.resolve();
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

export async function openAddMdModal(onPick: (content: string) => void): Promise<void> {
  const el = await ensureModal();

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

export async function openAddRecipeModal(opts: AddRecipeModalOptions): Promise<void> {
  const el = await ensureModal();

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

export async function openRecipeViewerModal(
  recipe: ImportedRecipe,
  onInjectCell: (cell: NotebookCell) => void,
): Promise<void> {
  const el = await ensureModal();

  _cleanup?.();

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
      _cleanup = null;
    }
  };

  el.addEventListener('widget:interact', handler as EventListener);
  _cleanup = () => {
    el.removeEventListener('widget:interact', handler as EventListener);
  };

  el.openModal({ mode: 'recipe-viewer', recipe });
}

// ---------------------------------------------------------------------------
// openToolViewerModal
// ---------------------------------------------------------------------------

export async function openToolViewerModal(
  tool: McpToolLike,
  onInjectCells: (cells: NotebookCell[]) => void,
): Promise<void> {
  const el = await ensureModal();

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
