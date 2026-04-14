// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const items = (data.items as { label: string; start: number; end: number }[]) || [];
  const startLabel = (data.startLabel as string) || 'Before';
  const endLabel = (data.endLabel as string) || 'After';
  const title = data.title as string | undefined;
  const w = 400, h = 400;
  const margin = { top: title ? 55 : 35, right: 60, bottom: 20, left: 60 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 24, title, { fontSize: 16 });

  const allVals = items.flatMap(it => [it.start, it.end]);
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 1);
  const range = maxVal - minVal || 1;

  const toY = (v: number) => margin.top + chartH - ((v - minVal) / range) * chartH;
  const x1 = margin.left + 40;
  const x2 = w - margin.right - 40;

  // column headers
  addText(svg, x1, margin.top - 10, startLabel, { fontSize: 12 });
  addText(svg, x2, margin.top - 10, endLabel, { fontSize: 12 });

  // vertical axes
  svg.appendChild(rc.line(x1, margin.top, x1, h - margin.bottom, { stroke: '#ccc', strokeWidth: 1, roughness: 0.5 }));
  svg.appendChild(rc.line(x2, margin.top, x2, h - margin.bottom, { stroke: '#ccc', strokeWidth: 1, roughness: 0.5 }));

  items.forEach((item, i) => {
    const y1 = toY(item.start);
    const y2 = toY(item.end);
    const color = COLORS[i % COLORS.length];

    svg.appendChild(rc.line(x1, y1, x2, y2, { stroke: color, strokeWidth: 2, roughness: 1.2 }));
    svg.appendChild(rc.circle(x1, y1, 10, { fill: color, fillStyle: 'solid', roughness: 0.8 }));
    svg.appendChild(rc.circle(x2, y2, 10, { fill: color, fillStyle: 'solid', roughness: 0.8 }));

    addText(svg, x1 - 14, y1 + 4, `${item.start}`, { fontSize: 9, anchor: 'end' });
    addText(svg, x2 + 14, y2 + 4, `${item.end} ${item.label}`, { fontSize: 9, anchor: 'start' });
  });

  return () => { svg.remove(); };
}
