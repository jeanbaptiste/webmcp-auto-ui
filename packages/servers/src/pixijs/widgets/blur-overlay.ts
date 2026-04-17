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

  const { blobs = 5, colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'], speed = 1, title } = data as any;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const blobData = [];
  for (let i = 0; i < blobs; i++) {
    const hex = parseInt(colors[i % colors.length].replace('#', ''), 16);
    const radius = 40 + Math.random() * 60;
    blobData.push({
      x: Math.random() * W,
      y: Math.random() * H,
      radius,
      color: hex,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);
  let time = 0;

  app.ticker.add((ticker) => {
    time += ticker.deltaTime * 0.01 * speed;
    gfx.clear();

    for (const b of blobData) {
      b.x += b.vx * ticker.deltaTime;
      b.y += b.vy * ticker.deltaTime;

      // Bounce
      if (b.x < -b.radius) b.vx = Math.abs(b.vx);
      if (b.x > W + b.radius) b.vx = -Math.abs(b.vx);
      if (b.y < -b.radius) b.vy = Math.abs(b.vy);
      if (b.y > H + b.radius) b.vy = -Math.abs(b.vy);

      const pulse = 1 + Math.sin(time * 3 + b.phase) * 0.2;
      const r = b.radius * pulse;

      // Draw concentric circles with decreasing alpha for blur effect
      for (let ring = 5; ring >= 0; ring--) {
        const alpha = 0.04 + (ring === 0 ? 0.12 : 0);
        const ringR = r * (1 + ring * 0.4);
        gfx.circle(b.x, b.y, ringR).fill({ color: b.color, alpha });
      }
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
