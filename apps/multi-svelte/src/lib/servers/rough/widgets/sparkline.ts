// @ts-nocheck
import { createRoughSVG, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const values = (data.values as number[]) || [];
  const w = 200, h = 60;
  const { svg, rc } = await createRoughSVG(container, w, h);
  const pad = 4;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => pad + (i / (values.length - 1 || 1)) * chartW;
  const toY = (v: number) => pad + chartH - ((v - minVal) / range) * chartH;

  for (let i = 0; i < values.length - 1; i++) {
    svg.appendChild(rc.line(toX(i), toY(values[i]), toX(i + 1), toY(values[i + 1]), {
      stroke: COLORS[0], strokeWidth: 1.5, roughness: 1,
    }));
  }

  // highlight last point
  if (values.length > 0) {
    const last = values.length - 1;
    svg.appendChild(rc.circle(toX(last), toY(values[last]), 6, {
      fill: COLORS[3], fillStyle: 'solid', roughness: 0.8,
    }));
  }

  return () => { svg.remove(); };
}
