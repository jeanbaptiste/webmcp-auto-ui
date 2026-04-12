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

  const toX = (i: number) => margin.left + (i / (values.length - 1 || 1)) * chartW;
  const toY = (v: number) => margin.top + chartH - ((v - minVal) / range) * chartH;

  for (let i = 0; i < values.length - 1; i++) {
    const x1 = toX(i), y1 = toY(values[i]);
    const x2 = toX(i + 1), y2 = toY(values[i + 1]);
    // horizontal then vertical (step)
    svg.appendChild(rc.line(x1, y1, x2, y1, { stroke: COLORS[0], strokeWidth: 2, roughness: 1.2 }));
    svg.appendChild(rc.line(x2, y1, x2, y2, { stroke: COLORS[0], strokeWidth: 2, roughness: 1.2 }));
  }

  // dots
  values.forEach((v, i) => {
    svg.appendChild(rc.circle(toX(i), toY(v), 8, { fill: COLORS[0], fillStyle: 'solid', roughness: 0.8 }));
  });

  labels.forEach((label, i) => {
    if (i % Math.ceil(labels.length / 8) === 0 || labels.length <= 10) {
      addText(svg, toX(i), h - margin.bottom + 16, label, { fontSize: 9 });
    }
  });

  return () => { svg.remove(); };
}
