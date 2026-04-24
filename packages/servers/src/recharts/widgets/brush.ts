// @ts-nocheck
import { loadRecharts, loadReact, mountReact, THEME, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { rows = [], xKey = 'x', lines = [], refAreas = [], refLines = [] } = data as any;
  const kids: any[] = [
    h(R.CartesianGrid, { key: 'g', stroke: THEME.grid, strokeDasharray: '3 3' }),
    h(R.XAxis, { key: 'x', dataKey: xKey, stroke: THEME.stroke }),
    h(R.YAxis, { key: 'y', stroke: THEME.stroke }),
    h(R.Tooltip, { key: 't' }),
    h(R.Legend, { key: 'l' }),
    h(R.Brush, { key: 'br', dataKey: xKey, height: 28, stroke: '#4f8cff' }),
  ];
  (refAreas as any[]).forEach((a: any, i: number) =>
    kids.push(h(R.ReferenceArea, { key: 'ra' + i, x1: a.x1, x2: a.x2, y1: a.y1, y2: a.y2, stroke: a.color ?? '#ffbe3d', fill: a.color ?? '#ffbe3d', fillOpacity: 0.15, label: a.label }))
  );
  (refLines as any[]).forEach((r: any, i: number) =>
    kids.push(h(R.ReferenceLine, { key: 'rl' + i, x: r.x, y: r.y, stroke: r.color ?? '#ff5f99', strokeDasharray: '4 4', label: r.label }))
  );
  (lines as any[]).forEach((l: any, i: number) =>
    kids.push(h(R.Line, { key: 'ln' + i, type: 'monotone', dataKey: l.dataKey, stroke: l.color ?? color(i), dot: false, strokeWidth: 2 }))
  );
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.LineChart, { data: rows, margin: { top: 10, right: 20, bottom: 10, left: 10 } }, ...kids)
  );
  return mountReact(container, tree);
}
