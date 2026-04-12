// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const series = (data.series as { name: string; values: number[] }[]) || [];
  const title = data.title as string | undefined;
  const w = 560, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 60, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);

  const allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);
  const groupW = (w - margin.left - margin.right) / labels.length;
  const barW = (groupW * 0.8) / series.length;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  labels.forEach((label, i) => {
    const gx = margin.left + i * groupW;
    addText(svg, gx + groupW / 2, h - margin.bottom + 16, label, { fontSize: 10 });
    series.forEach((s, j) => {
      const val = s.values[i] || 0;
      const barH = (val / maxVal) * chartH;
      const x = gx + (groupW - barW * series.length) / 2 + j * barW;
      const y = h - margin.bottom - barH;
      svg.appendChild(rc.rectangle(x, y, barW * 0.9, barH, {
        fill: COLORS[j % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
      }));
    });
  });

  // legend
  series.forEach((s, j) => {
    const lx = margin.left + j * 100;
    svg.appendChild(rc.rectangle(lx, h - 18, 12, 12, { fill: COLORS[j % COLORS.length], fillStyle: 'solid', roughness: 0.5 }));
    addText(svg, lx + 18, h - 8, s.name, { fontSize: 10, anchor: 'start' });
  });

  return () => { svg.remove(); };
}
