<script lang="ts">
  // Permanent published notebook viewer: /p/:slug.
  // Fetches /api/p/:slug → HyperSkill markdown, converts it to a notebook
  // state (cells from extractCellsFromRecipe + servers from frontmatter), then
  // mounts the full notebook widget — restoring the editorial typography,
  // server chips, prose styling and run panel from the widget itself.
  // Auto-connect of frontmatter `servers` is handled by the widget's own
  // autoConnectFrontmatterServers helper (reads globalThis.__canvasVanilla,
  // exposed by +layout.svelte).
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { mountWidget, jsonResult } from '@webmcp-auto-ui/core';
  import { autoui } from '@webmcp-auto-ui/agent';
  import { extractCellsFromRecipe } from '@webmcp-auto-ui/ui';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { runCode } from '@webmcp-auto-ui/sdk';
  import {
    loadFromSlug,
    extractMeta,
    NotebookLoadError,
    type NotebookPayload,
    type NotebookMeta,
  } from '$lib/notebook-loader';

  type View =
    | { status: 'loading' }
    | { status: 'ready'; payload: NotebookPayload; meta: NotebookMeta }
    | { status: 'error'; code: 'not_found' | 'other'; message: string };

  let view = $state<View>({ status: 'loading' });
  let host = $state<HTMLDivElement | null>(null);
  let cleanup: (() => void) | null = null;

  async function boot(slug: string) {
    view = { status: 'loading' };
    try {
      const payload = await loadFromSlug(slug);
      const meta = extractMeta(payload);
      view = { status: 'ready', payload, meta };
    } catch (err) {
      if (err instanceof NotebookLoadError && err.code === 'not_found') {
        view = { status: 'error', code: 'not_found', message: 'Notebook not found.' };
      } else {
        const msg = err instanceof NotebookLoadError
          ? err.message
          : 'Could not load this notebook.';
        view = { status: 'error', code: 'other', message: msg };
      }
    }
  }

  /**
   * Build the notebook widget data from a parsed HyperSkill payload.
   *  - `cells` reconstructed via extractCellsFromRecipe (drops fence ↔ cell
   *    mapping, peels @meta lines, etc.)
   *  - `servers` propagated as-is so the widget's autoConnectFrontmatterServers
   *    auto-connects them on mount.
   *  - `mode: 'view'`, `liveData: true`, `hideLiveToggle: true` mirror the
   *    previous nb.hyperskills.net behaviour.
   */
  /**
   * Pull the publish token from `?t=<token>` URL param if present (and persist
   * it in localStorage), or from a previously persisted entry. Returns '' when
   * no token is known — in that case the save button will exist but the server
   * rejects with 403, signalling read-only state.
   *
   * Storing in localStorage scopes the token to the visitor's browser on the
   * nb.hyperskills.net origin only. The URL is cleaned via history.replaceState
   * to avoid leaks (sharing, browser history, referer).
   */
  function hydrateToken(slug: string): string {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('t');
    const key = `nb-token-${slug}`;
    if (fromUrl) {
      try { window.localStorage.setItem(key, fromUrl); } catch {}
      url.searchParams.delete('t');
      try { window.history.replaceState({}, '', url.toString()); } catch {}
      return fromUrl;
    }
    try { return window.localStorage.getItem(key) ?? ''; } catch { return ''; }
  }

  function buildWidgetData(payload: NotebookPayload, meta: NotebookMeta, slug: string) {
    const cells = extractCellsFromRecipe(payload.body);
    const servers = (payload.frontmatter.servers ?? []).map((s) => ({
      name: s.name,
      url: s.url,
    }));
    const publishedToken = hydrateToken(slug);
    return {
      id: 'nb-' + slug,
      title: meta.title,
      mode: 'view',
      autoRun: false,
      liveData: true,
      hideLiveToggle: true,
      servers,
      cells,
      // Hydrate publish state so the button reads "save" (and updates the
      // existing slug) instead of "publish" (which would create a duplicate).
      publishedSlug: slug,
      publishedToken,
    };
  }

  $effect(() => {
    if (!browser) return;
    if (view.status !== 'ready' || !host) return;
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    host.innerHTML = '';
    const slug = $page.params.slug ?? '';
    const data = buildWidgetData(view.payload, view.meta, slug);
    const result = mountWidget(host, 'notebook', data, [autoui]);
    if (typeof result === 'function') cleanup = result;
    // Expose the loaded notebook elements as WebMCP tools so a connecting
    // agent (extension, IDE) can introspect/execute them — same pattern as
    // todo app: each domain primitive becomes a registerTool call.
    const unregister = registerNotebookTools(view.payload, view.meta, data.cells);
    return () => {
      try { unregister(); } catch {}
      if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    };
  });

  // ─── WebMCP tools registration ────────────────────────────────────────────
  // The page exposes the notebook content (meta, cells, recipes from
  // connected MCP servers) as tools. Pattern mirrored from apps/todo.
  function registerNotebookTools(
    payload: NotebookPayload,
    meta: NotebookMeta,
    cells: Array<{ id: string; type: string; content: string }>,
  ): () => void {
    const mc = (navigator as unknown as Record<string, unknown>).modelContext as {
      registerTool: (t: unknown) => void;
      unregisterTool: (n: string) => void;
    } | undefined;
    if (!mc) return () => {};

    const names: string[] = [];
    const reg = (tool: any) => { mc.registerTool(tool); names.push(tool.name); };

    reg({
      name: 'get_notebook_meta',
      description: 'Get the loaded notebook metadata: title, description, declared MCP servers.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult({
        title: meta.title,
        description: meta.description,
        servers: payload.frontmatter.servers ?? [],
      }),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'list_cells',
      description: 'List the cells of the loaded notebook (id, type, short content preview).',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(cells.map((c) => ({
        id: c.id,
        type: c.type,
        preview: (c.content || '').slice(0, 120),
      }))),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'get_cell',
      description: 'Get the full content of a notebook cell by id.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Cell id from list_cells.' } },
        required: ['id'],
      },
      execute: (a: Record<string, unknown>) => {
        const cell = cells.find((c) => c.id === a.id);
        if (!cell) return jsonResult({ error: `cell "${String(a.id)}" not found` });
        return jsonResult(cell);
      },
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'run_cell',
      description: 'Execute a code cell (sql/js) of the loaded notebook by id. Markdown cells return an error.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Cell id from list_cells.' } },
        required: ['id'],
      },
      execute: async (a: Record<string, unknown>) => {
        const cell = cells.find((c) => c.id === a.id);
        if (!cell) return jsonResult({ error: `cell "${String(a.id)}" not found` });
        if (cell.type === 'md') return jsonResult({ error: 'cannot run a markdown cell' });
        const lang = cell.type === 'sql' ? 'sql' : 'js';
        const multi = canvas.multiClient as Parameters<typeof runCode>[2];
        const result = await runCode(cell.content, lang, multi, {});
        return jsonResult(result);
      },
    });

    reg({
      name: 'list_connected_recipes',
      description: 'List recipes exposed by the MCP servers currently connected by this notebook.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => {
        const out: Array<{ server: string; name: string; description?: string }> = [];
        for (const s of canvas.dataServers ?? []) {
          if (!s.connected) continue;
          for (const r of (s.recipes ?? [])) {
            out.push({ server: s.name, name: r.name, description: r.description });
          }
        }
        return jsonResult(out);
      },
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'get_connected_recipe',
      description: 'Get a recipe body from a connected MCP server.',
      inputSchema: {
        type: 'object',
        properties: {
          server: { type: 'string', description: 'Server name (from list_connected_recipes).' },
          name:   { type: 'string', description: 'Recipe name (from list_connected_recipes).' },
        },
        required: ['server', 'name'],
      },
      execute: async (a: Record<string, unknown>) => {
        const s = (canvas.dataServers ?? []).find((d) => d.name === a.server);
        if (!s) return jsonResult({ error: `server "${String(a.server)}" not connected` });
        const cached = (s.recipes ?? []).find((r) => r.name === a.name);
        if (cached?.body) return jsonResult({ server: s.name, name: cached.name, body: cached.body });
        try {
          const res: any = await canvas.callTool(s.name, 'get_recipe', { name: a.name, id: a.name });
          const text = res?.content?.find?.((c: any) => c.type === 'text')?.text ?? '';
          return jsonResult({ server: s.name, name: a.name, body: text });
        } catch (err: any) {
          return jsonResult({ error: String(err?.message ?? err) });
        }
      },
      annotations: { readOnlyHint: true },
    });

    return () => {
      for (const n of names) {
        try { mc.unregisterTool(n); } catch {}
      }
    };
  }

  onMount(() => {
    const slug = $page.params.slug;
    if (slug) boot(slug);
    else view = { status: 'error', code: 'not_found', message: 'Missing slug.' };
    return () => {
      if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    };
  });

  const ogTitle = $derived(
    view.status === 'ready' ? `${view.meta.title} — nb.hyperskills.net` : 'Notebook — nb.hyperskills.net',
  );
  const ogDesc = $derived(
    view.status === 'ready'
      ? view.meta.description
      : 'A notebook published on nb.hyperskills.net',
  );
</script>

<svelte:head>
  <title>{ogTitle}</title>
  <meta name="description" content={ogDesc} />
  <meta property="og:title" content={ogTitle} />
  <meta property="og:description" content={ogDesc} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={ogTitle} />
  <meta name="twitter:description" content={ogDesc} />
</svelte:head>

{#if view.status === 'loading'}
  <main class="nb-page nb-loading"><p>Loading notebook…</p></main>
{:else if view.status === 'error' && view.code === 'not_found'}
  <main class="nb-page nb-error">
    <h1>404 — Notebook not found</h1>
    <p>{view.message}</p>
    <p><a href="/">← Back to index</a></p>
  </main>
{:else if view.status === 'error'}
  <main class="nb-page nb-error">
    <h1>Unable to display notebook</h1>
    <p>{view.message}</p>
    <p><a href="/">← Back to index</a></p>
  </main>
{:else}
  <div class="nb-viewer-host" bind:this={host}></div>
{/if}
