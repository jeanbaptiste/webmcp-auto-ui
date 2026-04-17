// @ts-nocheck
// Timeline — horizontal event blocks on time axis
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const events = (data.events ?? []) as { label: string; start: number; end: number; category?: string }[];
  const title = (data.title as string) ?? '';
  if (!events.length) { container.textContent = '[timeline: no data]'; return; }

  let tMin = Infinity, tMax = -Infinity;
  for (const e of events) { if (e.start < tMin) tMin = e.start; if (e.end > tMax) tMax = e.end; }
  const tRange = tMax - tMin || 1;

  const catMap = new Map<string, number>();
  let ci = 0;
  for (const e of events) if (e.category && !catMap.has(e.category)) catMap.set(e.category, ci++);

  // Group by row (simple greedy)
  const rows: { end: number }[] = [];
  const eventRows: number[] = [];
  for (const e of events) {
    let placed = false;
    for (let r = 0; r < rows.length; r++) {
      if (e.start >= rows[r].end) { rows[r].end = e.end; eventRows.push(r); placed = true; break; }
    }
    if (!placed) { rows.push({ end: e.end }); eventRows.push(rows.length - 1); }
  }

  const rowH = 24, gap = 4;
  const neededH = Math.max(400, (title ? 40 : 20) + rows.length * (rowH + gap) + 40);

  const { cleanup } = createCanvas(container, (ctx, W, _H) => {
    const m = { top: title ? 30 : 10, right: 14, bottom: 30, left: 14 };
    const pW = W - m.left - m.right;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const x = m.left + ((e.start - tMin) / tRange) * pW;
      const w = Math.max(2, ((e.end - e.start) / tRange) * pW);
      const y = m.top + eventRows[i] * (rowH + gap);
      const color = COLORS[(e.category ? (catMap.get(e.category) ?? 0) : i) % COLORS.length];
      ctx.fillStyle = color; ctx.beginPath();
      ctx.roundRect(x, y, w, rowH, 4); ctx.fill();
      if (w > 30) {
        ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const tx = x + 4;
        const ty = y + rowH / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(e.label, tx, ty, w - 8);
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.fillText(e.label, tx, ty, w - 8);
      }
    }
  }, 500, neededH);

  return cleanup;
}
