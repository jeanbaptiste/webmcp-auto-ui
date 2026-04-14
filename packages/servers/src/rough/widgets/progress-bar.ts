// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const items = (data.items as { label: string; value: number; max?: number }[]) || [];
  const title = data.title as string | undefined;
  const w = 500, h = Math.max(200, items.length * 50 + (title ? 60 : 30));
  const margin = { top: title ? 50 : 20, right: 20, bottom: 20, left: 120 };
  const { svg, rc } = await createRoughSVG(container, w, h);

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  const barH = 24;
  const gap = 40;
  const maxW = w - margin.left - margin.right;

  items.forEach((item, i) => {
    const y = margin.top + i * gap + 10;
    const max = item.max || 100;
    const pct = Math.min(item.value / max, 1);

    // background track
    svg.appendChild(rc.rectangle(margin.left, y, maxW, barH, {
      fill: '#f0f0f0', fillStyle: 'solid', roughness: 1, stroke: '#ccc',
    }));

    // filled portion
    svg.appendChild(rc.rectangle(margin.left, y, maxW * pct, barH, {
      fill: COLORS[i % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5, bowing: 1,
    }));

    addText(svg, margin.left - 6, y + barH / 2 + 4, item.label, { fontSize: 10, anchor: 'end' });
    addText(svg, margin.left + maxW * pct + 6, y + barH / 2 + 4, `${Math.round(pct * 100)}%`, { fontSize: 10, anchor: 'start' });
  });

  return () => { svg.remove(); };
}
