// @ts-nocheck
import { loadRecharts, loadReact, mountReact, THEME, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { series = [], xKey = 'x', yKey = 'y', zKey } = data as any;
  const kids: any[] = [
    h(R.CartesianGrid, { key: 'g', stroke: THEME.grid, strokeDasharray: '3 3' }),
    h(R.XAxis, { key: 'x', type: 'number', dataKey: xKey, stroke: THEME.stroke, name: xKey }),
    h(R.YAxis, { key: 'y', type: 'number', dataKey: yKey, stroke: THEME.stroke, name: yKey }),
    zKey ? h(R.ZAxis, { key: 'z', type: 'number', dataKey: zKey, range: [40, 400], name: zKey }) : null,
    h(R.Tooltip, { key: 't', cursor: { strokeDasharray: '3 3' } }),
    h(R.Legend, { key: 'l' }),
  ].filter(Boolean);
  (series as any[]).forEach((s: any, i: number) => {
    kids.push(h(R.Scatter, { key: 's' + i, name: s.name ?? 'series ' + i, data: s.rows, fill: s.color ?? color(i) }));
  });
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.ScatterChart, { margin: { top: 10, right: 20, bottom: 20, left: 10 } }, ...kids)
  );
  return mountReact(container, tree);
}
