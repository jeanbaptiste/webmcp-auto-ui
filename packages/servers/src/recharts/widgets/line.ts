// @ts-nocheck
import { loadRecharts, loadReact, mountReact, THEME, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { xKey = 'x', lines = [], rows = [], title, xLabel, yLabel } = data as any;
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.LineChart, { data: rows, margin: { top: title ? 30 : 10, right: 20, bottom: 30, left: 10 } },
      h(R.CartesianGrid, { stroke: THEME.grid, strokeDasharray: '3 3' }),
      h(R.XAxis, { dataKey: xKey, stroke: THEME.stroke, label: xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fill: THEME.text } : undefined }),
      h(R.YAxis, { stroke: THEME.stroke, label: yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: THEME.text } : undefined }),
      h(R.Tooltip, null),
      h(R.Legend, null),
      ...(lines as any[]).map((l: any, i: number) =>
        h(R.Line, { key: l.dataKey, type: 'monotone', dataKey: l.dataKey, stroke: l.color ?? color(i), dot: false, strokeWidth: 2 })
      )
    )
  );
  return mountReact(container, tree);
}
