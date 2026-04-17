// @ts-nocheck
// Donut chart — pie with hollow center
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const slices = (data.slices ?? []) as { label: string; value: number }[];
  const title = (data.title as string) ?? '';
  const centerLabel = (data.centerLabel as string) ?? '';
  if (!slices.length) { container.textContent = '[donut: no data]'; return; }

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const cx = W / 2, cy = (title ? H / 2 + 10 : H / 2);
    const outerR = Math.min(W, H) * 0.35;
    const innerR = outerR * 0.55;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

    const total = slices.reduce((s, d) => s + d.value, 0);
    let angle = -Math.PI / 2;

    for (let i = 0; i < slices.length; i++) {
      const sweep = (slices[i].value / (total || 1)) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, angle, angle + sweep);
      ctx.arc(cx, cy, innerR, angle + sweep, angle, true);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      angle += sweep;
    }

    // Center label
    if (centerLabel) {
      ctx.font = 'bold 16px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(centerLabel, cx, cy);
    }

    // Legend
    ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let i = 0; i < slices.length; i++) {
      const lx = 10, ly = H - 20 - (slices.length - 1 - i) * 16;
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fillRect(lx, ly - 4, 10, 8);
      ctx.fillStyle = '#333'; ctx.fillText(`${slices[i].label} (${slices[i].value})`, lx + 14, ly);
    }
  });

  return cleanup;
}
