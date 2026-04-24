// @ts-nocheck
import { loadRecharts, loadReact, mountReact, THEME, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { xKey = 'x', rows = [], series = [] } = data as any;
  const kids: any[] = [
    h(R.CartesianGrid, { key: 'g', stroke: THEME.grid, strokeDasharray: '3 3' }),
    h(R.XAxis, { key: 'x', dataKey: xKey, stroke: THEME.stroke }),
    h(R.YAxis, { key: 'y', stroke: THEME.stroke }),
    h(R.Tooltip, { key: 't' }),
    h(R.Legend, { key: 'l' }),
  ];
  (series as any[]).forEach((s: any, i: number) => {
    const c = s.color ?? color(i);
    if (s.type === 'bar') kids.push(h(R.Bar, { key: 'b' + i, dataKey: s.dataKey, fill: c }));
    else if (s.type === 'area') kids.push(h(R.Area, { key: 'a' + i, type: 'monotone', dataKey: s.dataKey, fill: c, stroke: c, fillOpacity: 0.3 }));
    else if (s.type === 'scatter') kids.push(h(R.Scatter, { key: 's' + i, dataKey: s.dataKey, fill: c }));
    else kids.push(h(R.Line, { key: 'ln' + i, type: 'monotone', dataKey: s.dataKey, stroke: c, dot: false, strokeWidth: 2 }));
  });
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.ComposedChart, { data: rows, margin: { top: 10, right: 20, bottom: 20, left: 10 } }, ...kids)
  );
  return mountReact(container, tree);
}
