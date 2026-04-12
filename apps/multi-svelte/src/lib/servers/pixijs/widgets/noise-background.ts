// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const { color1 = '#1e1b4b', color2 = '#7c3aed', speed = 1, scale = 4, title } = data as any;
  const c1 = parseInt(color1.replace('#', ''), 16);
  const c2 = parseInt(color2.replace('#', ''), 16);
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  // Simple value noise using sine combinations
  const cellSize = 8;
  const cols = Math.ceil(W / cellSize);
  const rows = Math.ceil(H / cellSize);
  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);

  let time = 0;

  function noise(x, y, t) {
    return (
      Math.sin(x * 0.3 / scale + t) * 0.5 +
      Math.sin(y * 0.4 / scale + t * 0.7) * 0.3 +
      Math.sin((x + y) * 0.2 / scale + t * 1.3) * 0.2
    ) * 0.5 + 0.5;
  }

  app.ticker.add((ticker) => {
    time += ticker.deltaTime * 0.01 * speed;
    gfx.clear();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = Math.max(0, Math.min(1, noise(c, r, time)));
        const cr = Math.round(r1 + (r2 - r1) * n);
        const cg = Math.round(g1 + (g2 - g1) * n);
        const cb = Math.round(b1 + (b2 - b1) * n);
        const color = (cr << 16) | (cg << 8) | cb;
        gfx.rect(c * cellSize, r * cellSize, cellSize, cellSize).fill({ color });
      }
    }
  });

  return () => { app.destroy(true); };
}
