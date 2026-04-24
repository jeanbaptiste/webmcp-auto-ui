// @ts-nocheck
import { loadRecharts, loadReact, mountReact, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { rows = [], dataKey = 'size', nameKey = 'name' } = data as any;
  const colored = (rows as any[]).map((r: any, i: number) => ({ ...r, fill: r.fill ?? color(i) }));
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.Treemap, {
      data: colored,
      dataKey,
      nameKey,
      stroke: '#fff',
      fill: '#4f8cff',
    })
  );
  return mountReact(container, tree);
}
