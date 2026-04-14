// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const { data: entries = [], color = '#22c55e', title } = data as any;
  const baseHex = parseInt(color.replace('#', ''), 16);
  const r0 = (baseHex >> 16) & 0xff, g0 = (baseHex >> 8) & 0xff, b0 = baseHex & 0xff;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const maxVal = Math.max(...entries.map((e) => e.value || 0), 1);
  const cellSize = 12;
  const gap = 2;
  const pad = { top: title ? 44 : 20, left: 30 };

  // Build date map
  const dateMap = new Map();
  for (const e of entries) dateMap.set(e.date, e.value || 0);

  // Sort entries by date to get range
  const dates = entries.map((e) => e.date).sort();
  if (dates.length === 0) return;

  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  const dayLabels = ['', 'M', '', 'W', '', 'F', ''];

  // Draw day labels
  for (let d = 0; d < 7; d++) {
    if (dayLabels[d]) {
      const t = new PIXI.Text({ text: dayLabels[d], style: { fontSize: 9, fill: 0x888888 } });
      t.x = pad.left - 16;
      t.y = pad.top + d * (cellSize + gap);
      app.stage.addChild(t);
    }
  }

  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);

  const cur = new Date(start);
  // Align to Sunday
  cur.setDate(cur.getDate() - cur.getDay());

  let progress = 0;
  const cells = [];
  while (cur <= end || cells.length < 7) {
    const dateStr = cur.toISOString().slice(0, 10);
    const day = cur.getDay();
    const week = Math.floor(cells.length / 7);
    const val = dateMap.get(dateStr) || 0;
    cells.push({ x: pad.left + week * (cellSize + gap), y: pad.top + day * (cellSize + gap), val });
    cur.setDate(cur.getDate() + 1);
    if (cur > end && day === 6) break;
  }

  app.ticker.add((ticker) => {
    if (progress >= 1) return;
    progress = Math.min(1, progress + ticker.deltaTime * 0.02);
    gfx.clear();
    const count = Math.ceil(progress * cells.length);
    for (let i = 0; i < count && i < cells.length; i++) {
      const c = cells[i];
      const intensity = c.val / maxVal;
      if (intensity > 0) {
        const cr = Math.round(r0 * intensity * 0.3 + 30);
        const cg = Math.round(g0 * intensity * 0.3 + 30);
        const cb = Math.round(b0 * intensity * 0.3 + 30);
        const fillColor = (Math.round(r0 * intensity) << 16) | (Math.round(g0 * intensity) << 8) | Math.round(b0 * intensity);
        gfx.rect(c.x, c.y, cellSize, cellSize).fill({ color: fillColor });
      } else {
        gfx.rect(c.x, c.y, cellSize, cellSize).fill({ color: 0x222222 });
      }
    }
  });

  return () => { app.destroy(true); };
}
