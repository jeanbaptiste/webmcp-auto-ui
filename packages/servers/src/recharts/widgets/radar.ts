// @ts-nocheck
import { loadRecharts, loadReact, mountReact, color } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const R = await loadRecharts();
  const { createElement: h } = await loadReact();
  const { rows = [], angleKey = 'subject', series = [] } = data as any;
  const tree = h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.RadarChart, { data: rows, outerRadius: '80%' },
      h(R.PolarGrid, null),
      h(R.PolarAngleAxis, { dataKey: angleKey }),
      h(R.PolarRadiusAxis, null),
      h(R.Tooltip, null),
      h(R.Legend, null),
      ...(series as any[]).map((s: any, i: number) => {
        const c = s.color ?? color(i);
        return h(R.Radar, { key: s.dataKey, name: s.name ?? s.dataKey, dataKey: s.dataKey, stroke: c, fill: c, fillOpacity: 0.3 });
      })
    )
  );
  return mountReact(container, tree);
}
