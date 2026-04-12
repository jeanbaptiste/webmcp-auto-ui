// @ts-nocheck
import { createRoughSVG, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = (data.rows as string[]) || [];
  const cols = (data.cols as string[]) || [];
  const matrix = (data.values as number[][]) || [];
  const title = data.title as string | undefined;
  const w = 520, h = 420;
  const margin = { top: title ? 50 : 30, right: 20, bottom: 30, left: 70 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const allVals = matrix.flat();
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 1);
  const range = maxVal - minVal || 1;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const cellW = chartW / cols.length;
  const cellH = chartH / rows.length;

  // color interpolation: light yellow → deep purple
  function getColor(val: number): string {
    const t = (val - minVal) / range;
    const r = Math.round(255 - t * 120);
    const g = Math.round(255 - t * 200);
    const b = Math.round(100 + t * 156);
    return `rgb(${r},${g},${b})`;
  }

  rows.forEach((row, ri) => {
    addText(svg, margin.left - 6, margin.top + ri * cellH + cellH / 2 + 4, row, { fontSize: 10, anchor: 'end' });
    cols.forEach((_, ci) => {
      const val = matrix[ri]?.[ci] ?? 0;
      const x = margin.left + ci * cellW;
      const y = margin.top + ri * cellH;
      svg.appendChild(rc.rectangle(x, y, cellW, cellH, {
        fill: getColor(val), fillStyle: 'solid', roughness: 1.2, stroke: '#fff', strokeWidth: 1,
      }));
      if (cellW > 30 && cellH > 20) {
        addText(svg, x + cellW / 2, y + cellH / 2 + 4, String(val), { fontSize: 9, fill: '#333' });
      }
    });
  });

  cols.forEach((col, ci) => {
    addText(svg, margin.left + ci * cellW + cellW / 2, margin.top - 8, col, { fontSize: 10 });
  });

  return () => { svg.remove(); };
}
