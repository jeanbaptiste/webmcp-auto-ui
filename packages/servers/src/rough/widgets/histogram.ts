// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const bins = (data.bins as { min: number; max: number; count: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 50, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const allMin = Math.min(...bins.map(b => b.min));
  const allMax = Math.max(...bins.map(b => b.max));
  const xRange = allMax - allMin || 1;

  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  bins.forEach((bin, i) => {
    const x1 = margin.left + ((bin.min - allMin) / xRange) * chartW;
    const x2 = margin.left + ((bin.max - allMin) / xRange) * chartW;
    const barH = (bin.count / maxCount) * chartH;
    const y = h - margin.bottom - barH;
    svg.appendChild(rc.rectangle(x1, y, x2 - x1, barH, {
      fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));
    addText(svg, (x1 + x2) / 2, y - 6, String(bin.count), { fontSize: 9 });
  });

  // x-axis labels
  addText(svg, margin.left, h - margin.bottom + 16, String(allMin), { fontSize: 9, anchor: 'start' });
  addText(svg, w - margin.right, h - margin.bottom + 16, String(allMax), { fontSize: 9, anchor: 'end' });

  return () => { svg.remove(); };
}
