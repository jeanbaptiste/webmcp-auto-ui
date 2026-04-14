// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const tasks = (data.tasks as { name: string; start: number; end: number; group?: string }[]) || [];
  const title = data.title as string | undefined;
  const w = 560, h = Math.max(400, tasks.length * 36 + 80);
  const margin = { top: title ? 50 : 30, right: 20, bottom: 30, left: 120 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const allStarts = tasks.map(t => t.start);
  const allEnds = tasks.map(t => t.end);
  const minT = Math.min(...allStarts);
  const maxT = Math.max(...allEnds);
  const range = maxT - minT || 1;

  const rowH = chartH / tasks.length;

  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  tasks.forEach((task, i) => {
    const x1 = margin.left + ((task.start - minT) / range) * chartW;
    const x2 = margin.left + ((task.end - minT) / range) * chartW;
    const y = margin.top + i * rowH + rowH * 0.2;
    const barH = rowH * 0.6;

    svg.appendChild(rc.rectangle(x1, y, x2 - x1, barH, {
      fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));
    addText(svg, margin.left - 6, y + barH / 2 + 4, task.name, { fontSize: 10, anchor: 'end' });
  });

  return () => { svg.remove(); };
}
