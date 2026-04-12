// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const series = (data.series as { name: string; values: number[] }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 60, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartH = h - margin.top - margin.bottom;

  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] || 0), 0));
  const maxVal = Math.max(...totals, 1);
  const barW = (w - margin.left - margin.right) / labels.length * 0.7;
  const gap = (w - margin.left - margin.right) / labels.length;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });
  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  labels.forEach((label, i) => {
    const x = margin.left + i * gap + (gap - barW) / 2;
    let yOffset = 0;
    series.forEach((s, j) => {
      const val = s.values[i] || 0;
      const segH = (val / maxVal) * chartH;
      const y = h - margin.bottom - yOffset - segH;
      svg.appendChild(rc.rectangle(x, y, barW, segH, {
        fill: COLORS[j % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
      }));
      yOffset += segH;
    });
    addText(svg, x + barW / 2, h - margin.bottom + 16, label, { fontSize: 10 });
  });

  series.forEach((s, j) => {
    const lx = margin.left + j * 100;
    svg.appendChild(rc.rectangle(lx, h - 18, 12, 12, { fill: COLORS[j % COLORS.length], fillStyle: 'solid', roughness: 0.5 }));
    addText(svg, lx + 18, h - 8, s.name, { fontSize: 10, anchor: 'start' });
  });

  return () => { svg.remove(); };
}
