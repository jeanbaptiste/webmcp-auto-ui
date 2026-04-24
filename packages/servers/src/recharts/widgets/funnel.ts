// @ts-nocheck
import { loadRecharts, loadReact, mountReact, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { rows = [], dataKey = 'value', nameKey = 'name' } = data as any;
  const colored = (rows as any[]).map((r: any, i: number) => ({ ...r, fill: r.fill ?? color(i) }));
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.FunnelChart, null,
      h(R.Tooltip, null),
      h(R.Funnel, { dataKey, nameKey, data: colored, isAnimationActive: true },
        h(R.LabelList, { position: 'right', fill: '#666', stroke: 'none', dataKey: nameKey })
      )
    )
  );
  return mountReact(container, tree);
}
