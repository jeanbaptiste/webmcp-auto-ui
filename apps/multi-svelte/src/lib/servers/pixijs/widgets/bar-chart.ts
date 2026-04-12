// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const { values = [], labels = [], title, colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'] } = data as any;
  const pad = { top: title ? 40 : 20, right: 20, bottom: 40, left: 50 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const maxV = Math.max(...values, 1);

  // Axes
  const axes = new PIXI.Graphics();
  axes.moveTo(pad.left, pad.top).lineTo(pad.left, H - pad.bottom).lineTo(W - pad.right, H - pad.bottom);
  axes.stroke({ width: 1, color: 0x888888 });
  app.stage.addChild(axes);

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const gap = 8;
  const barW = Math.max(4, (iW - gap * (values.length + 1)) / values.length);
  const bars = [];

  for (let i = 0; i < values.length; i++) {
    const hex = parseInt(colors[i % colors.length].replace('#', ''), 16);
    const targetH = (values[i] / maxV) * iH;
    const x = pad.left + gap + i * (barW + gap);
    const g = new PIXI.Graphics();
    app.stage.addChild(g);
    bars.push({ g, x, targetH, hex, currentH: 0 });

    if (labels[i]) {
      const t = new PIXI.Text({ text: labels[i], style: { fontSize: 10, fill: 0xaaaaaa } });
      t.x = x + barW / 2 - t.width / 2;
      t.y = H - pad.bottom + 6;
      app.stage.addChild(t);
    }
  }

  app.ticker.add((ticker) => {
    let allDone = true;
    for (const bar of bars) {
      if (bar.currentH < bar.targetH) {
        bar.currentH = Math.min(bar.targetH, bar.currentH + ticker.deltaTime * 4);
        allDone = false;
      }
      bar.g.clear();
      bar.g.rect(bar.x, H - pad.bottom - bar.currentH, barW, bar.currentH).fill({ color: bar.hex });
    }
    if (allDone) return;
  });

  return () => { app.destroy(true); };
}
