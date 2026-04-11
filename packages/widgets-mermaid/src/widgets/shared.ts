// ---------------------------------------------------------------------------
// Shared Mermaid rendering — dynamic import + SVG injection
// ---------------------------------------------------------------------------

let mermaidReady = false;

/**
 * Render a Mermaid definition string into a container as responsive SVG.
 * Mermaid is loaded lazily on first call.
 */
export async function renderMermaid(
  container: HTMLElement,
  definition: string,
): Promise<void> {
  const mermaid = (await import('mermaid')).default;

  if (!mermaidReady) {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    mermaidReady = true;
  }

  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { svg } = await mermaid.render(id, definition);

  container.innerHTML = svg;

  // Make SVG responsive
  const svgEl = container.querySelector('svg');
  if (svgEl) {
    svgEl.style.maxWidth = '100%';
    svgEl.style.height = 'auto';
    svgEl.removeAttribute('height');
  }
}
