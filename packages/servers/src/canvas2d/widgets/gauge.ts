// @ts-nocheck
// Gauge — semicircular meter with needle
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const value = (data.value as number) ?? 0;
  const min = (data.min as number) ?? 0;
  const max = (data.max as number) ?? 100;
  const title = (data.title as string) ?? '';
  const label = (data.label as string) ?? '';
  const zones = (data.zones ?? []) as { from: number; to: number; color: string }[];

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const cx = W / 2, cy = H - 40;
    const radius = Math.min(W, H) * 0.55;
    const range = max - min || 1;
    const startAngle = Math.PI, endAngle = 2 * Math.PI;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

    // Background arc
    ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 24; ctx.lineCap = 'butt'; ctx.stroke();

    // Zones
    if (zones.length) {
      for (const z of zones) {
        const a0 = startAngle + ((z.from - min) / range) * Math.PI;
        const a1 = startAngle + ((z.to - min) / range) * Math.PI;
        ctx.beginPath(); ctx.arc(cx, cy, radius, a0, a1);
        ctx.strokeStyle = z.color; ctx.lineWidth = 24; ctx.stroke();
      }
    } else {
      // Default green→yellow→red
      const thirds = Math.PI / 3;
      ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, startAngle + thirds); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 24; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle + thirds, startAngle + 2 * thirds); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 24; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle + 2 * thirds, endAngle); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 24; ctx.stroke();
    }

    // Needle
    const needleAngle = startAngle + (Math.max(min, Math.min(max, value)) - min) / range * Math.PI;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(needleAngle);
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(radius - 16, 0); ctx.lineTo(0, 4); ctx.closePath();
    ctx.fillStyle = '#333'; ctx.fill(); ctx.restore();

    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();

    // Value text
    ctx.font = 'bold 20px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(String(value), cx, cy + 14);
    if (label) { ctx.font = '12px system-ui'; ctx.fillStyle = '#666'; ctx.fillText(label, cx, cy + 38); }

    // Min/max labels
    ctx.font = '10px system-ui'; ctx.fillStyle = '#888';
    ctx.textAlign = 'left'; ctx.fillText(String(min), cx - radius - 10, cy + 8);
    ctx.textAlign = 'right'; ctx.fillText(String(max), cx + radius + 10, cy + 8);
  }, 400, 280);

  return cleanup;
}
