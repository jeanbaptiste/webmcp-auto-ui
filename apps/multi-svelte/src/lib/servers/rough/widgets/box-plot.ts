// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const groups = (data.groups as { label: string; min: number; q1: number; median: number; q3: number; max: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 50, left: 50 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const allVals = groups.flatMap(g => [g.min, g.max]);
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const yRange = yMax - yMin || 1;

  const toY = (v: number) => margin.top + chartH - ((v - yMin) / yRange) * chartH;
  const boxW = Math.min(60, chartW / groups.length * 0.6);
  const gap = chartW / groups.length;

  svg.appendChild(rc.line(margin.left, h - margin.bottom, w - margin.right, h - margin.bottom, { roughness: 0.5 }));

  groups.forEach((g, i) => {
    const cx = margin.left + i * gap + gap / 2;
    const x = cx - boxW / 2;

    // whisker lines
    svg.appendChild(rc.line(cx, toY(g.max), cx, toY(g.q3), { roughness: 1, stroke: '#333' }));
    svg.appendChild(rc.line(cx, toY(g.q1), cx, toY(g.min), { roughness: 1, stroke: '#333' }));

    // whisker caps
    svg.appendChild(rc.line(cx - boxW / 4, toY(g.max), cx + boxW / 4, toY(g.max), { roughness: 1, stroke: '#333' }));
    svg.appendChild(rc.line(cx - boxW / 4, toY(g.min), cx + boxW / 4, toY(g.min), { roughness: 1, stroke: '#333' }));

    // box
    const boxY = toY(g.q3);
    const boxH = toY(g.q1) - toY(g.q3);
    svg.appendChild(rc.rectangle(x, boxY, boxW, boxH, {
      fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));

    // median line
    svg.appendChild(rc.line(x, toY(g.median), x + boxW, toY(g.median), {
      stroke: '#333', strokeWidth: 2, roughness: 1,
    }));

    addText(svg, cx, h - margin.bottom + 16, g.label, { fontSize: 10 });
  });

  return () => { svg.remove(); };
}
