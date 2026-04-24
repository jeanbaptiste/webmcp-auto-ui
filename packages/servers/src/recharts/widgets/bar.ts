// @ts-nocheck
import { loadRecharts, loadReact, mountReact, THEME, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { xKey = 'x', bars = [], rows = [], title, stacked = false, layout = 'horizontal' } = data as any;
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.BarChart, { data: rows, layout, margin: { top: title ? 30 : 10, right: 20, bottom: 20, left: 10 } },
      h(R.CartesianGrid, { stroke: THEME.grid, strokeDasharray: '3 3' }),
      layout === 'vertical'
        ? h(R.XAxis, { type: 'number', stroke: THEME.stroke })
        : h(R.XAxis, { dataKey: xKey, stroke: THEME.stroke }),
      layout === 'vertical'
        ? h(R.YAxis, { type: 'category', dataKey: xKey, stroke: THEME.stroke })
        : h(R.YAxis, { stroke: THEME.stroke }),
      h(R.Tooltip, null),
      h(R.Legend, null),
      ...(bars as any[]).map((b: any, i: number) =>
        h(R.Bar, { key: b.dataKey, dataKey: b.dataKey, fill: b.color ?? color(i), stackId: stacked ? 'stack' : undefined })
      )
    )
  );
  return mountReact(container, tree);
}
