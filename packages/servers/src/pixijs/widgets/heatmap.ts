// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const ro = new ResizeObserver(() => {
    const newW = container.clientWidth || W;
    app.renderer.resize(newW, H);
  });
  ro.observe(container);

  const { data: grid = [], rowLabels = [], colLabels = [], title, colorRange = ['#1e3a5f', '#ef4444'] } = data as any;
  const pad = { top: title ? 40 : 20, right: 20, bottom: 40, left: 60 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (!rows || !cols) return () => { ro.disconnect(); app.destroy(true); };

  const flat = grid.flat();
  const minV = Math.min(...flat);
  const maxV = Math.max(...flat);
  const range = maxV - minV || 1;

  const c1 = parseInt(colorRange[0].replace('#', ''), 16);
  const c2 = parseInt(colorRange[1].replace('#', ''), 16);
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const cellW = iW / cols;
  const cellH = iH / rows;
  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);

  let progress = 0;
  app.ticker.add((ticker) => {
    if (progress >= 1) return;
    progress = Math.min(1, progress + ticker.deltaTime * 0.03);
    gfx.clear();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx / (rows * cols) > progress) continue;
        const t = (grid[r][c] - minV) / range;
        const cr = Math.round(r1 + (r2 - r1) * t);
        const cg = Math.round(g1 + (g2 - g1) * t);
        const cb = Math.round(b1 + (b2 - b1) * t);
        const color = (cr << 16) | (cg << 8) | cb;
        gfx.rect(pad.left + c * cellW, pad.top + r * cellH, cellW - 1, cellH - 1).fill({ color });
      }
    }
  });

  // Labels
  for (let r = 0; r < rowLabels.length && r < rows; r++) {
    const t = new PIXI.Text({ text: rowLabels[r], style: { fontSize: 10, fill: 0xaaaaaa, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } } });
    t.x = pad.left - t.width - 4;
    t.y = pad.top + r * cellH + cellH / 2 - 6;
    app.stage.addChild(t);
  }
  for (let c = 0; c < colLabels.length && c < cols; c++) {
    const t = new PIXI.Text({ text: colLabels[c], style: { fontSize: 10, fill: 0xaaaaaa, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } } });
    t.x = pad.left + c * cellW + cellW / 2 - t.width / 2;
    t.y = H - pad.bottom + 6;
    app.stage.addChild(t);
  }

  return () => { ro.disconnect(); app.destroy(true); };
}
