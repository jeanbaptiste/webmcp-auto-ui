// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const items = (data.items as { label: string; value: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = 400;
  const margin = { top: title ? 45 : 10, right: 10, bottom: 10, left: 10 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  // simple squarified treemap — lay out in rows
  const sorted = [...items].sort((a, b) => b.value - a.value);

  let y = margin.top;
  let remaining = [...sorted];
  let remTotal = total;

  while (remaining.length > 0) {
    // determine how many items fit in this row
    const rowH = (remaining[0].value / remTotal) * chartH;
    const usableH = Math.max(rowH, chartH * 0.1);
    const rowArea = usableH * chartW;
    let row: typeof sorted = [];
    let rowSum = 0;

    for (const item of remaining) {
      row.push(item);
      rowSum += item.value;
      if (rowSum / total * (chartH) >= usableH) break;
    }
    remaining = remaining.slice(row.length);
    remTotal -= rowSum;

    const actualH = (rowSum / total) * chartH;
    let x = margin.left;
    row.forEach((item, i) => {
      const itemW = (item.value / rowSum) * chartW;
      svg.appendChild(rc.rectangle(x, y, itemW, actualH, {
        fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
      }));
      if (itemW > 40 && actualH > 20) {
        addText(svg, x + itemW / 2, y + actualH / 2, item.label, { fontSize: 10, fill: '#fff' });
        addText(svg, x + itemW / 2, y + actualH / 2 + 14, String(item.value), { fontSize: 9, fill: 'rgba(255,255,255,0.7)' });
      }
      x += itemW;
    });
    y += actualH;
  }

  return () => { svg.remove(); };
}
