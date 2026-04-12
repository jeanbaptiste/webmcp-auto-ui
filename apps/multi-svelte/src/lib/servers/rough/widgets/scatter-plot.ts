// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = (data.points as { x: number; y: number; label?: string }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 50, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const xMin = Math.min(...xs, 0), xMax = Math.max(...xs, 1);
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 1);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });
  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  points.forEach((p, i) => {
    const cx = margin.left + ((p.x - xMin) / xRange) * chartW;
    const cy = margin.top + chartH - ((p.y - yMin) / yRange) * chartH;
    svg.appendChild(rc.circle(cx, cy, 12, {
      fill: COLORS[i % COLORS.length], fillStyle: 'solid', roughness: 1.2,
    }));
    if (p.label) addText(svg, cx, cy - 10, p.label, { fontSize: 9 });
  });

  addText(svg, margin.left, h - margin.bottom + 16, String(xMin), { fontSize: 9, anchor: 'start' });
  addText(svg, w - margin.right, h - margin.bottom + 16, String(xMax), { fontSize: 9, anchor: 'end' });
  addText(svg, margin.left - 8, h - margin.bottom, String(yMin), { fontSize: 9, anchor: 'end' });
  addText(svg, margin.left - 8, margin.top, String(yMax), { fontSize: 9, anchor: 'end' });

  return () => { svg.remove(); };
}
