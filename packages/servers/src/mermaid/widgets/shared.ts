// @ts-nocheck
export async function renderMermaid(
  container: HTMLElement,
  definition: string
): Promise<() => void> {
  const mermaid = await import('mermaid');
  mermaid.default.initialize({ startOnLoad: false, theme: 'default' });

  const render = async () => {
    const id = 'mermaid-' + Math.random().toString(36).slice(2);
    const { svg } = await mermaid.default.render(id, definition);
    container.innerHTML = svg;
  };

  await render();

  // Debounced re-render when the container is resized (responsive layouts, split panels, etc.)
  let timer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      render().catch(() => {
        /* swallow re-render errors — original SVG stays visible */
      });
    }, 150);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (timer) clearTimeout(timer);
  };
}
