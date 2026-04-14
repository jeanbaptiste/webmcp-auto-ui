// @ts-nocheck
// Radial bar chart — concentric arcs representing values
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const items = (data.items ?? []) as { label: string; value: number; max?: number }[];
  const title = (data.title as string) ?? '';
  if (!items.length) { container.textContent = '[radial-bar: no data]'; return; }

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const cx = W / 2, cy = (title ? H / 2 + 10 : H / 2);
  const maxR = Math.min(W, H) * 0.38;
  const barW = Math.min(20, maxR / items.length - 2);
  const startAngle = -Math.PI / 2;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const r = maxR - i * (barW + 4);
    const maxVal = item.max ?? Math.max(...items.map(d => d.value));
    const sweep = (item.value / (maxVal || 1)) * Math.PI * 2;

    // Background track
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = barW; ctx.stroke();

    // Value arc
    ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
    ctx.strokeStyle = COLORS[i % COLORS.length]; ctx.lineWidth = barW; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineCap = 'butt';

    // Label
    ctx.font = '10px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(item.label, cx - maxR - 10, cy - r + maxR);
  }

  return () => { canvas.remove(); };
}
