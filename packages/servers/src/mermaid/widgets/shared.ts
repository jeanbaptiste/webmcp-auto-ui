// @ts-nocheck
export async function renderMermaid(container: HTMLElement, definition: string): Promise<void> {
  const mermaid = await import('mermaid');
  mermaid.default.initialize({ startOnLoad: false, theme: 'default' });
  const id = 'mermaid-' + Math.random().toString(36).slice(2);
  const { svg } = await mermaid.default.render(id, definition);
  container.innerHTML = svg;
}
