// ---------------------------------------------------------------------------
// Chart renderer — Vega-Lite via lazy dynamic import of vega-embed.
//
// Design notes:
//  - vega-embed is imported dynamically so it does not bloat the initial
//    bundle. The first chart render pays a one-time cost; subsequent charts
//    share the cached module.
//  - On failure (missing dep, invalid spec, CSP denies eval, etc.) we fall
//    back to a readable <pre>JSON</pre> preview of the spec so the user
//    still sees *something* rather than an empty panel.
//  - vega-embed is declared as an optional peer dependency in package.json;
//    apps that want interactive charts install it, others degrade gracefully.
// ---------------------------------------------------------------------------

export interface ChartRenderer {
  mount(container: HTMLElement, spec: unknown): void | Promise<void>;
  destroy(): void;
}

let cachedEmbed: Promise<any> | null = null;

function loadEmbed(): Promise<any> {
  if (!cachedEmbed) {
    // @ts-ignore — vega-embed is an optional peer dep; resolved at runtime
    cachedEmbed = import('vega-embed').then((m: any) => m?.default ?? m);
  }
  return cachedEmbed;
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function renderFallback(container: HTMLElement, spec: unknown, reason?: string): void {
  let preview: string;
  try { preview = JSON.stringify(spec, null, 2); } catch { preview = String(spec); }
  const note = reason ? `<div class="nb-chart-fallback-note">${escapeHtml(reason)}</div>` : '';
  container.innerHTML = `${note}<pre class="nb-chart-fallback">${escapeHtml(preview)}</pre>`;
}

/**
 * Render a Vega / Vega-Lite spec into the given container. Resolves once the
 * chart is mounted (or falls back to a JSON preview on error). Never throws.
 */
export async function renderChart(container: HTMLElement, spec: unknown): Promise<void> {
  if (!container) return;
  if (!spec || typeof spec !== 'object') {
    renderFallback(container, spec, 'Invalid chart spec');
    return;
  }
  try {
    const embed = await loadEmbed();
    if (typeof embed !== 'function') {
      renderFallback(container, spec, 'vega-embed unavailable');
      return;
    }
    container.innerHTML = '';
    await embed(container, spec as any, { actions: false, renderer: 'canvas' });
  } catch (err: any) {
    renderFallback(container, spec, `chart render failed: ${String(err?.message ?? err)}`);
  }
}
