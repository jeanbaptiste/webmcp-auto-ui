// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const values = (data.values as number[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 50, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);

  const maxVal = Math.max(...values, 1);
  const barW = (w - margin.left - margin.right) / labels.length * 0.7;
  const gap = (w - margin.left - margin.right) / labels.length;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  // axis line
  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  values.forEach((v, i) => {
    const barH = (v / maxVal) * (h - margin.top - margin.bottom);
    const x = margin.left + i * gap + (gap - barW) / 2;
    const y = h - margin.bottom - barH;
    svg.appendChild(rc.rectangle(x, y, barW, barH, {
      fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));
    addText(svg, x + barW / 2, h - margin.bottom + 16, labels[i] || '', { fontSize: 10 });
    addText(svg, x + barW / 2, y - 6, String(v), { fontSize: 10 });
  });

  return () => { svg.remove(); };
}
