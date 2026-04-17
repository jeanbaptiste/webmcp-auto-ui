// @ts-nocheck
// Bar chart — vertical bars with labels
import { createCanvas, COLORS, drawAxis, formatNum } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels ?? []) as string[];
  const values = (data.values ?? []) as number[];
  const title = (data.title as string) ?? '';
  const color = (data.color as string) ?? COLORS[0];
  if (!values.length) { container.textContent = '[bar-chart: no data]'; return; }

  const vMax = Math.max(...values, 0);
  const vMin = Math.min(...values, 0);
  const range = vMax - vMin || 1;

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const m = { top: title ? 30 : 14, right: 14, bottom: 50, left: 52 };
    const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
    drawAxis(ctx, m.left, m.top + pH, pH, vMin, vMax, false);

    const n = values.length;
    const barW = (pW / n) * 0.7;
    const gap = (pW / n) * 0.3;

    for (let i = 0; i < n; i++) {
      const x = m.left + i * (pW / n) + gap / 2;
      const barH = ((values[i] - vMin) / range) * pH;
      const y = m.top + pH - barH;
      ctx.fillStyle = typeof data.colors === 'object' ? (data.colors as string[])[i % (data.colors as string[]).length] : color;
      ctx.fillRect(x, y, barW, barH);
    }

    // Labels
    ctx.font = '10px system-ui'; ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i < Math.min(n, labels.length); i++) {
      const x = m.left + i * (pW / n) + (pW / n) / 2;
      ctx.save(); ctx.translate(x, m.top + pH + 6); ctx.rotate(-0.4); ctx.fillText(labels[i], 0, 0); ctx.restore();
    }
  });

  return cleanup;
}
