// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = (data.points as { label: string; value: number; error: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 50, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const allMax = Math.max(...points.map(p => p.value + p.error), 1);
  const allMin = Math.min(...points.map(p => p.value - p.error), 0);
  const range = allMax - allMin || 1;

  const toY = (v: number) => margin.top + chartH - ((v - allMin) / range) * chartH;
  const gap = chartW / points.length;

  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  points.forEach((p, i) => {
    const cx = margin.left + i * gap + gap / 2;
    const cy = toY(p.value);
    const yTop = toY(p.value + p.error);
    const yBot = toY(p.value - p.error);

    // error bar
    svg.appendChild(rc.line(cx, yTop, cx, yBot, { stroke: '#666', strokeWidth: 1.5, roughness: 1 }));
    svg.appendChild(rc.line(cx - 6, yTop, cx + 6, yTop, { stroke: '#666', strokeWidth: 1.5, roughness: 1 }));
    svg.appendChild(rc.line(cx - 6, yBot, cx + 6, yBot, { stroke: '#666', strokeWidth: 1.5, roughness: 1 }));

    // dot
    svg.appendChild(rc.circle(cx, cy, 10, { fill: COLORS[i % COLORS.length], fillStyle: 'solid', roughness: 1 }));

    addText(svg, cx, h - margin.bottom + 16, p.label, { fontSize: 10 });
  });

  return () => { svg.remove(); };
}
