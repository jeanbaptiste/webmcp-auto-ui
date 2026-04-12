// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, links, title } = data as any;
  const traces = [{
    type: 'sankey',
    node: { label: nodes.label, color: nodes.color, pad: 15, thickness: 20 },
    link: { source: links.source, target: links.target, value: links.value, color: links.color },
  }];
  return plotly(container, traces, { ...darkLayout(title) });
}
