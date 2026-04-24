// @ts-nocheck
import { loadRecharts, loadReact, mountReact, THEME, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { xKey = 'x', areas = [], rows = [], stacked = false } = data as any;
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.AreaChart, { data: rows, margin: { top: 10, right: 20, bottom: 20, left: 10 } },
      h(R.CartesianGrid, { stroke: THEME.grid, strokeDasharray: '3 3' }),
      h(R.XAxis, { dataKey: xKey, stroke: THEME.stroke }),
      h(R.YAxis, { stroke: THEME.stroke }),
      h(R.Tooltip, null),
      h(R.Legend, null),
      ...(areas as any[]).map((a: any, i: number) => {
        const c = a.color ?? color(i);
        return h(R.Area, {
          key: a.dataKey,
          type: 'monotone',
          dataKey: a.dataKey,
          stroke: c,
          fill: c,
          fillOpacity: 0.3,
          stackId: stacked ? 'stack' : undefined,
        });
      })
    )
  );
  return mountReact(container, tree);
}
