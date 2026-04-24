// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Vega utilities — lazy loading, theme, embed helper
// ---------------------------------------------------------------------------

let _embed: any = null;

/** Lazy-load vega-embed (single import, cached). */
export async function loadVegaEmbed(): Promise<any> {
  if (_embed) return _embed;
  const mod = await import('vega-embed');
  _embed = mod.default ?? mod;
  return _embed;
}

/**
 * Theme-adaptive Vega config — transparent background, mid-gray text/grid
 * readable on both light and dark surfaces.
 */
export function vegaTheme(): any {
  const textColor = '#666';
  const gridColor = '#ccc';
  return {
    background: 'transparent',
    axis: {
      domainColor: gridColor,
      gridColor,
      tickColor: gridColor,
      labelColor: textColor,
      titleColor: textColor,
    },
    legend: {
      labelColor: textColor,
      titleColor: textColor,
    },
    title: {
      color: textColor,
    },
    view: {
      stroke: 'transparent',
    },
  };
}

/**
 * Render a Vega spec inside `container`. Returns a cleanup function.
 * Merges a transparent theme config and wires a ResizeObserver.
 */
export async function renderVegaSpec(
  container: HTMLElement,
  spec: any,
  opts?: { mode?: 'vega' | 'vega-lite' },
): Promise<() => void> {
  const embed = await loadVegaEmbed();

  container.style.width = container.style.width || '100%';
  container.style.minHeight = container.style.minHeight || '300px';

  const mergedConfig = { ...vegaTheme(), ...(spec?.config ?? {}) };
  const finalSpec = { ...spec, config: mergedConfig };

  const mode = opts?.mode ?? (finalSpec.$schema && String(finalSpec.$schema).includes('vega-lite') ? 'vega-lite' : 'vega');

  const result = await embed(container, finalSpec, {
    actions: false,
    renderer: 'canvas',
    mode,
  });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      try {
        const w = container.clientWidth;
        if (w > 0 && result?.view) {
          result.view.width(w).run();
        }
      } catch {
        // ignore
      }
    }, 50);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    try {
      result?.finalize?.();
    } catch {
      // ignore
    }
  };
}

/** Base dimensions for responsive charts. */
export function baseSize() {
  return { width: 'container', height: 300, autosize: { type: 'fit', contains: 'padding', resize: true } };
}
