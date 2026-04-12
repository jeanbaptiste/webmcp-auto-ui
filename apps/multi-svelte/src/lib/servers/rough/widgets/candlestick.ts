// @ts-nocheck
import { createRoughSVG, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const candles = (data.candles as { date?: string; open: number; high: number; low: number; close: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 520, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 50, left: 60 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const allVals = candles.flatMap(c => [c.high, c.low]);
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const yRange = yMax - yMin || 1;

  const toY = (v: number) => margin.top + chartH - ((v - yMin) / yRange) * chartH;
  const candleW = Math.min(16, chartW / candles.length * 0.7);
  const gap = chartW / candles.length;

  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));
  svg.appendChild(rc.line(margin.left, margin.top, margin.left, h - margin.bottom, { roughness: 0.5 }));

  candles.forEach((c, i) => {
    const cx = margin.left + i * gap + gap / 2;
    const isUp = c.close >= c.open;
    const color = isUp ? '#10b981' : '#ef4444';
    const bodyTop = toY(Math.max(c.open, c.close));
    const bodyBot = toY(Math.min(c.open, c.close));
    const bodyH = Math.max(bodyBot - bodyTop, 1);

    // wick
    svg.appendChild(rc.line(cx, toY(c.high), cx, toY(c.low), { stroke: '#333', strokeWidth: 1, roughness: 1 }));

    // body
    svg.appendChild(rc.rectangle(cx - candleW / 2, bodyTop, candleW, bodyH, {
      fill: color, fillStyle: isUp ? 'hachure' : 'solid', fillWeight: 2, roughness: 1.5, bowing: 1, stroke: color,
    }));

    if (c.date && (i % Math.ceil(candles.length / 6) === 0)) {
      addText(svg, cx, h - margin.bottom + 14, c.date, { fontSize: 8 });
    }
  });

  return () => { svg.remove(); };
}
