// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const items = (data.items as { label: string; value: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = Math.max(300, items.length * 30 + 80);
  const margin = { top: title ? 50 : 20, right: 30, bottom: 30, left: 120 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const maxVal = Math.max(...items.map(it => it.value), 1);
  const gap = (h - margin.top - margin.bottom) / items.length;

  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  items.forEach((item, i) => {
    const y = margin.top + i * gap + gap / 2;
    const x = margin.left + (item.value / maxVal) * chartW;

    // dotted line
    svg.appendChild(rc.line(margin.left, y, x, y, { stroke: '#ddd', strokeWidth: 1, roughness: 0.5 }));

    // dot
    svg.appendChild(rc.circle(x, y, 14, {
      fill: COLORS[i % COLORS.length], fillStyle: 'solid', roughness: 1.2,
    }));

    addText(svg, margin.left - 6, y + 4, item.label, { fontSize: 10, anchor: 'end' });
    addText(svg, x + 12, y + 4, String(item.value), { fontSize: 9, anchor: 'start' });
  });

  return () => { svg.remove(); };
}
