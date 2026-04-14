// @ts-nocheck
// Pie chart — simple proportional sectors
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const slices = (data.slices ?? []) as { label: string; value: number }[];
  const title = (data.title as string) ?? '';
  if (!slices.length) { container.textContent = '[pie: no data]'; return; }

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const cx = W / 2, cy = (title ? H / 2 + 10 : H / 2);
  const radius = Math.min(W, H) * 0.35;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

  const total = slices.reduce((s, d) => s + d.value, 0);
  let angle = -Math.PI / 2;

  for (let i = 0; i < slices.length; i++) {
    const sweep = (slices[i].value / (total || 1)) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // Label
    const mid = angle + sweep / 2;
    const lx = cx + Math.cos(mid) * (radius * 0.65);
    const ly = cy + Math.sin(mid) * (radius * 0.65);
    if (sweep > 0.2) {
      ctx.font = '11px system-ui'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(slices[i].label, lx, ly);
    }
    angle += sweep;
  }

  return () => { canvas.remove(); };
}
