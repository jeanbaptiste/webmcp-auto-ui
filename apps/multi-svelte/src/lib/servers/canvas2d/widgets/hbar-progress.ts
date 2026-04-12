// @ts-nocheck
// Horizontal bar progress — labeled bars with % fill
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const items = (data.items ?? []) as { label: string; value: number; max?: number }[];
  const title = (data.title as string) ?? '';
  if (!items.length) { container.textContent = '[hbar-progress: no data]'; return; }

  const barH = 24, gap = 8;
  const neededH = Math.max(400, (title ? 40 : 16) + items.length * (barH + gap) + 16);
  const { canvas, ctx } = createCanvas(container, 500, neededH);
  const W = 500;
  const m = { top: title ? 30 : 10, left: 100, right: 50 };
  const pW = W - m.left - m.right;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

  const globalMax = Math.max(...items.map(d => d.max ?? d.value));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const max = item.max ?? globalMax;
    const pct = Math.min(1, item.value / (max || 1));
    const y = m.top + i * (barH + gap);

    // Label
    ctx.font = '11px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(item.label, m.left - 8, y + barH / 2);

    // Track
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath(); ctx.roundRect(m.left, y, pW, barH, 4); ctx.fill();

    // Fill
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath(); ctx.roundRect(m.left, y, pW * pct, barH, 4); ctx.fill();

    // Value
    ctx.font = '10px system-ui'; ctx.fillStyle = '#555'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(pct * 100)}%`, m.left + pW + 6, y + barH / 2);
  }

  return () => { canvas.remove(); };
}
