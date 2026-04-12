// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const { count = 10, shapes = 'mixed', title, colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'] } = data as any;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const shapeTypes = shapes === 'mixed' ? ['circle', 'square', 'star'] : [shapes];
  const items = [];

  for (let i = 0; i < count; i++) {
    const hex = parseInt(colors[i % colors.length].replace('#', ''), 16);
    const size = 10 + Math.random() * 20;
    const shape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    const g = new PIXI.Graphics();

    if (shape === 'circle') {
      g.circle(0, 0, size).fill({ color: hex });
    } else if (shape === 'square') {
      g.rect(-size, -size, size * 2, size * 2).fill({ color: hex });
    } else {
      // star
      const pts = 5;
      const outer = size, inner = size * 0.5;
      for (let j = 0; j < pts * 2; j++) {
        const angle = (j * Math.PI) / pts - Math.PI / 2;
        const r = j % 2 === 0 ? outer : inner;
        if (j === 0) g.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else g.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      g.closePath().fill({ color: hex });
    }

    g.x = Math.random() * W;
    g.y = Math.random() * H;
    app.stage.addChild(g);

    items.push({
      gfx: g,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      size,
    });
  }

  app.ticker.add((ticker) => {
    for (const item of items) {
      item.gfx.x += item.vx * ticker.deltaTime;
      item.gfx.y += item.vy * ticker.deltaTime;
      item.gfx.rotation += item.rotSpeed * ticker.deltaTime;

      if (item.gfx.x < -item.size) item.gfx.x = W + item.size;
      if (item.gfx.x > W + item.size) item.gfx.x = -item.size;
      if (item.gfx.y < -item.size) item.gfx.y = H + item.size;
      if (item.gfx.y > H + item.size) item.gfx.y = -item.size;
    }
  });

  return () => { app.destroy(true); };
}
