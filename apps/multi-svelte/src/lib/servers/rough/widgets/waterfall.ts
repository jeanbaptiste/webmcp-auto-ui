// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels as string[]) || [];
  const values = (data.values as number[]) || [];
  const title = data.title as string | undefined;
  const w = 520, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 60, left: 60 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  // compute cumulative
  const cumulative: number[] = [];
  let running = 0;
  values.forEach(v => { cumulative.push(running); running += v; });
  cumulative.push(running); // final total

  const allY = [...cumulative, running];
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...allY, 1);
  const range = maxY - minY || 1;

  const barW = chartW / (labels.length + 1) * 0.6;
  const gap = chartW / (labels.length + 1);

  const toY = (v: number) => margin.top + chartH - ((v - minY) / range) * chartH;

  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));
  // zero line
  svg.appendChild(rc.line(margin.left, toY(0), w - margin.right, toY(0), { stroke: '#999', strokeWidth: 0.5, roughness: 0.3 }));

  values.forEach((v, i) => {
    const base = cumulative[i];
    const top = base + v;
    const y1 = toY(Math.max(base, top));
    const y2 = toY(Math.min(base, top));
    const x = margin.left + (i + 0.5) * gap - barW / 2;
    const barH = y2 - y1;
    const color = v >= 0 ? '#10b981' : '#ef4444';
    svg.appendChild(rc.rectangle(x, y1, barW, barH, {
      fill: color, fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));
    addText(svg, x + barW / 2, y1 - 6, (v >= 0 ? '+' : '') + String(v), { fontSize: 9 });
    addText(svg, x + barW / 2, h - margin.bottom + 14, labels[i] || '', { fontSize: 9 });

    // connector line
    if (i < values.length - 1) {
      const nextX = margin.left + (i + 1.5) * gap - barW / 2;
      const connY = toY(top);
      svg.appendChild(rc.line(x + barW, connY, nextX, connY, { stroke: '#999', strokeWidth: 0.5, roughness: 0.3 }));
    }
  });

  return () => { svg.remove(); };
}
