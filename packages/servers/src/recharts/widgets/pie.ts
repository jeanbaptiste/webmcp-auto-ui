// @ts-nocheck
import { loadRecharts, loadReact, mountReact, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { rows = [], nameKey = 'name', valueKey = 'value', donut = false, label = true } = data as any;
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.PieChart, null,
      h(R.Pie, {
        data: rows,
        dataKey: valueKey,
        nameKey,
        innerRadius: donut ? '50%' : 0,
        outerRadius: '80%',
        label,
      }, ...(rows as any[]).map((_r: any, i: number) =>
        h(R.Cell, { key: i, fill: color(i) })
      )),
      h(R.Tooltip, null),
      h(R.Legend, null)
    )
  );
  return mountReact(container, tree);
}
