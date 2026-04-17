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

  const { bubbles = [], title } = data as any;
  const colors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899];

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const maxVal = Math.max(...bubbles.map((b) => b.value || 0), 1);
  const maxR = Math.min(W, H) * 0.2;

  const simBubbles = bubbles.map((b, i) => {
    const r = Math.sqrt((b.value || 1) / maxVal) * maxR;
    return {
      label: b.label || '',
      color: b.color ? parseInt(b.color.replace('#', ''), 16) : colors[i % colors.length],
      r,
      targetR: r,
      currentR: 0,
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H / 2 + (Math.random() - 0.5) * H * 0.3,
      vx: 0,
      vy: 0,
    };
  });

  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);
  const labelContainer = new PIXI.Container();
  app.stage.addChild(labelContainer);

  let settled = false;
  let frame = 0;

  app.ticker.add((ticker) => {
    frame++;
    // Grow animation
    for (const b of simBubbles) {
      if (b.currentR < b.targetR) {
        b.currentR = Math.min(b.targetR, b.currentR + ticker.deltaTime * 1.5);
      }
    }

    // Simple collision + centering
    for (let i = 0; i < simBubbles.length; i++) {
      const a = simBubbles[i];
      for (let j = i + 1; j < simBubbles.length; j++) {
        const b = simBubbles[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = a.currentR + b.currentR + 4;
        if (dist < minDist) {
          const force = (minDist - dist) * 0.05;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      a.vx += (W / 2 - a.x) * 0.002;
      a.vy += (H / 2 - a.y) * 0.002;
      a.vx *= 0.9; a.vy *= 0.9;
      a.x += a.vx; a.y += a.vy;
    }

    gfx.clear();
    for (const b of simBubbles) {
      gfx.circle(b.x, b.y, b.currentR).fill({ color: b.color, alpha: 0.8 });
    }

    // Labels once settled
    if (frame > 60 && !settled) {
      settled = true;
      for (const b of simBubbles) {
        if (b.targetR > 20 && b.label) {
          const t = new PIXI.Text({ text: b.label, style: { fontSize: 11, fill: 0xffffff, fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } } });
          t.x = b.x - t.width / 2;
          t.y = b.y - 6;
          labelContainer.addChild(t);
        }
      }
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
