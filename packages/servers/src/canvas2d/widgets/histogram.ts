// @ts-nocheck
// Histogram — frequency distribution with bins
import { createCanvas, COLORS, drawAxis } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const values = (data.values ?? []) as number[];
  const bins = (data.bins as number) ?? 20;
  const title = (data.title as string) ?? '';
  const color = (data.color as string) ?? COLORS[4];
  if (!values.length) { container.textContent = '[histogram: no data]'; return; }

  const vMin = Math.min(...values), vMax = Math.max(...values);
  const range = vMax - vMin || 1;
  const binW = range / bins;
  const counts = new Array(bins).fill(0);
  for (const v of values) { const i = Math.min(Math.floor((v - vMin) / binW), bins - 1); counts[i]++; }
  const maxCount = Math.max(...counts);

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
    const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
    drawAxis(ctx, m.left, m.top + pH, pW, vMin, vMax, true);
    drawAxis(ctx, m.left, m.top + pH, pH, 0, maxCount, false);

    const barW = pW / bins;
    for (let i = 0; i < bins; i++) {
      const barH = (counts[i] / (maxCount || 1)) * pH;
      ctx.fillStyle = color;
      ctx.fillRect(m.left + i * barW, m.top + pH - barH, barW - 1, barH);
    }
  });

  return cleanup;
}
