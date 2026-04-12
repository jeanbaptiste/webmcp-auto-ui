// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const categories = (data.categories as { label: string; total: number; segments: { label: string; value: number }[] }[]) || [];
  const title = data.title as string | undefined;
  const w = 520, h = 420;
  const margin = { top: title ? 50 : 20, right: 20, bottom: 50, left: 20 };
  const { svg, rc } = await createRoughSVG(container, w, h);
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const grandTotal = categories.reduce((s, c) => s + c.total, 0) || 1;

  let x = margin.left;
  categories.forEach((cat, ci) => {
    const colW = (cat.total / grandTotal) * chartW;
    const segTotal = cat.segments.reduce((s, seg) => s + seg.value, 0) || 1;

    let y = margin.top;
    cat.segments.forEach((seg, si) => {
      const segH = (seg.value / segTotal) * chartH;
      svg.appendChild(rc.rectangle(x, y, colW, segH, {
        fill: COLORS[si % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
      }));
      if (colW > 40 && segH > 18) {
        addText(svg, x + colW / 2, y + segH / 2 + 4, seg.label, { fontSize: 9, fill: '#fff' });
      }
      y += segH;
    });

    addText(svg, x + colW / 2, h - margin.bottom + 14, cat.label, { fontSize: 10 });
    addText(svg, x + colW / 2, h - margin.bottom + 28, String(cat.total), { fontSize: 9, fill: '#666' });
    x += colW;
  });

  return () => { svg.remove(); };
}
