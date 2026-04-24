// @ts-nocheck
import { loadRecharts, loadReact, mountReact } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { nodes = [], links = [] } = data as any;
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.Sankey, {
      data: { nodes, links },
      nodePadding: 20,
      margin: { left: 20, right: 20, top: 20, bottom: 20 },
      link: { stroke: '#4f8cff' },
    },
      h(R.Tooltip, null)
    )
  );
  return mountReact(container, tree);
}
