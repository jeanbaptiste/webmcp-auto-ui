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

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });
  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  const points = values.map((v, i) => {
    const x = margin.left + (i / (values.length - 1 || 1)) * chartW;
    const y = margin.top + chartH - (v / maxVal) * chartH;
    return [x, y] as [number, number];
  });

  // build path for area fill
  const pathParts = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  pathParts.push(`L ${points[points.length - 1][0]} ${h - margin.bottom}`);
  pathParts.push(`L ${points[0][0]} ${h - margin.bottom} Z`);

  svg.appendChild(rc.path(pathParts.join(' '), {
    fill: COLORS[0], fillStyle: 'hachure', fillWeight: 1.5, roughness: 1.5, stroke: COLORS[0], strokeWidth: 2,
  }));

  labels.forEach((label, i) => {
    if (i % Math.ceil(labels.length / 8) === 0 || labels.length <= 10) {
      const x = margin.left + (i / (labels.length - 1 || 1)) * chartW;
      addText(svg, x, h - margin.bottom + 16, label, { fontSize: 9 });
    }
  });

  return () => { svg.remove(); };
}
