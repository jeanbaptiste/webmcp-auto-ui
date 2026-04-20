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

  const { count = 200, color = '#3b82f6', speed = 1, title, direction = 'right' } = data as any;
  const hexColor = parseInt(color.replace('#', ''), 16);

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const particles = [];
  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 1 + Math.random() * 2,
      speed: (0.5 + Math.random()) * speed,
      alpha: 0.3 + Math.random() * 0.7,
    });
  }

  const cx = W / 2, cy = H / 2;

  app.ticker.add((ticker) => {
    gfx.clear();
    const dt = ticker.deltaTime;
    for (const p of particles) {
      switch (direction) {
        case 'left':
          p.x -= p.speed * dt;
          if (p.x < -5) { p.x = W + 5; p.y = Math.random() * H; }
          break;
        case 'up':
          p.y -= p.speed * dt;
          if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
          break;
        case 'down':
          p.y += p.speed * dt;
          if (p.y > H + 5) { p.y = -5; p.x = Math.random() * W; }
          break;
        case 'radial': {
          const dx = p.x - cx, dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          p.x += (dx / dist) * p.speed * dt;
          p.y += (dy / dist) * p.speed * dt;
          if (p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5) {
            p.x = cx + (Math.random() - 0.5) * 20;
            p.y = cy + (Math.random() - 0.5) * 20;
          }
          break;
        }
        default: // right
          p.x += p.speed * dt;
          if (p.x > W + 5) { p.x = -5; p.y = Math.random() * H; }
      }
      gfx.circle(p.x, p.y, p.size).fill({ color: hexColor, alpha: p.alpha });
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
