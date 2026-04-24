// @ts-nocheck
import { loadRecharts, loadReact, mountReact, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { rows = [], dataKey = 'value' } = data as any;
  const colored = (rows as any[]).map((r: any, i: number) => ({ ...r, fill: r.fill ?? color(i) }));
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.RadialBarChart, { data: colored, innerRadius: '20%', outerRadius: '90%', startAngle: 90, endAngle: -270 },
      h(R.RadialBar, { dataKey, background: true, label: { position: 'insideStart', fill: '#fff' } }),
      h(R.Tooltip, null),
      h(R.Legend, { iconSize: 10, layout: 'vertical', verticalAlign: 'middle', align: 'right' })
    )
  );
  return mountReact(container, tree);
}
