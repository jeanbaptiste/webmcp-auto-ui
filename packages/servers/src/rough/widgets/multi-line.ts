// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const series = (data.series as { name: string; values: number[] }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 60, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });
  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  series.forEach((s, si) => {
    const pts = s.values.map((v, i) => {
      const x = margin.left + (i / (s.values.length - 1 || 1)) * chartW;
      const y = margin.top + chartH - ((v - minVal) / range) * chartH;
      return [x, y] as [number, number];
    });
    for (let i = 0; i < pts.length - 1; i++) {
      svg.appendChild(rc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], {
        stroke: COLORS[si % COLORS.length], strokeWidth: 2, roughness: 1.2,
      }));
    }
  });

  labels.forEach((label, i) => {
    if (i % Math.ceil(labels.length / 8) === 0 || labels.length <= 10) {
      const x = margin.left + (i / (labels.length - 1 || 1)) * chartW;
      addText(svg, x, h - margin.bottom + 16, label, { fontSize: 9 });
    }
  });

  series.forEach((s, j) => {
    const lx = margin.left + j * 100;
    svg.appendChild(rc.rectangle(lx, h - 18, 12, 12, { fill: COLORS[j % COLORS.length], fillStyle: 'solid', roughness: 0.5 }));
    addText(svg, lx + 18, h - 8, s.name, { fontSize: 10, anchor: 'start' });
  });

  return () => { svg.remove(); };
}
