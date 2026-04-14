// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const values = (data.values as number[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 50, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });
  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  const points = values.map((v, i) => {
    const x = margin.left + (i / (values.length - 1 || 1)) * chartW;
    const y = margin.top + chartH - ((v - minVal) / range) * chartH;
    return [x, y] as [number, number];
  });

  // draw line segments
  for (let i = 0; i < points.length - 1; i++) {
    svg.appendChild(rc.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], {
      stroke: COLORS[0], strokeWidth: 2, roughness: 1.2,
    }));
  }

  // dots
  points.forEach(([x, y]) => {
    svg.appendChild(rc.circle(x, y, 8, { fill: COLORS[0], fillStyle: 'solid', roughness: 0.8 }));
  });

  // labels
  labels.forEach((label, i) => {
    if (i % Math.ceil(labels.length / 8) === 0 || labels.length <= 10) {
      const x = margin.left + (i / (labels.length - 1 || 1)) * chartW;
      addText(svg, x, h - margin.bottom + 16, label, { fontSize: 9 });
    }
  });

  return () => { svg.remove(); };
}
