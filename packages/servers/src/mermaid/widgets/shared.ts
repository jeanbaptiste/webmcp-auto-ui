// @ts-nocheck
let mermaidReady: Promise<any> | null = null;
async function getMermaid() {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((m) => {
      m.default.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
      return m.default;
    });
  }
  return mermaidReady;
}

export async function renderMermaid(
  container: HTMLElement,
  definition: string
): Promise<() => void> {
  const mermaid = await getMermaid();

  const render = async () => {
    const id = 'mermaid-' + Math.random().toString(36).slice(2);
    try {
      const { svg } = await mermaid.render(id, definition);
      container.innerHTML = svg;
    } catch (err) {
      container.innerHTML = `<pre style="color:#b91c1c;font:11px/1.4 monospace;white-space:pre-wrap;padding:8px">mermaid error: ${String((err as Error)?.message ?? err)}</pre>`;
    }
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
