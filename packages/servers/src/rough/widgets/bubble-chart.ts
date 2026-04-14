// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const bubbles = (data.bubbles as { x: number; y: number; r: number; label?: string }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 30, bottom: 50, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const xs = bubbles.map(b => b.x);
  const ys = bubbles.map(b => b.y);
  const rs = bubbles.map(b => b.r);
  const xMin = Math.min(...xs, 0), xMax = Math.max(...xs, 1);
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 1);
  const rMax = Math.max(...rs, 1);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });
  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  bubbles.forEach((b, i) => {
    const cx = margin.left + ((b.x - xMin) / xRange) * chartW;
    const cy = margin.top + chartH - ((b.y - yMin) / yRange) * chartH;
    const radius = (b.r / rMax) * 40 + 8;
    svg.appendChild(rc.circle(cx, cy, radius * 2, {
      fill: COLORS[i % COLORS.length], fillStyle: 'cross-hatch', fillWeight: 1, roughness: 1.5, bowing: 1,
    }));
    if (b.label) addText(svg, cx, cy + 4, b.label, { fontSize: 9 });
  });

  return () => { svg.remove(); };
}
