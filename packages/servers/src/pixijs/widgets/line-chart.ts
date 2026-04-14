// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const { values = [], labels = [], title, color = '#3b82f6', lineWidth = 2 } = data as any;
  const pad = { top: title ? 40 : 20, right: 20, bottom: 40, left: 50 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  // Axes
  const axes = new PIXI.Graphics();
  axes.moveTo(pad.left, pad.top).lineTo(pad.left, H - pad.bottom).lineTo(W - pad.right, H - pad.bottom);
  axes.stroke({ width: 1, color: 0x888888 });
  app.stage.addChild(axes);

  // Title
  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  // X labels
  for (let i = 0; i < labels.length; i++) {
    const x = pad.left + (i / Math.max(labels.length - 1, 1)) * iW;
    const t = new PIXI.Text({ text: labels[i], style: { fontSize: 10, fill: 0xaaaaaa } });
    t.x = x - t.width / 2;
    t.y = H - pad.bottom + 6;
    app.stage.addChild(t);
  }

  // Animated line
  const line = new PIXI.Graphics();
  app.stage.addChild(line);
  const pts = values.map((v, i) => ({
    x: pad.left + (i / Math.max(values.length - 1, 1)) * iW,
    y: pad.top + iH - ((v - minV) / range) * iH,
  }));

  // Dots
  const dots = new PIXI.Graphics();
  app.stage.addChild(dots);

  let progress = 0;
  const hexColor = parseInt(color.replace('#', ''), 16);

  app.ticker.add((ticker) => {
    if (progress >= 1) return;
    progress = Math.min(1, progress + ticker.deltaTime * 0.02);

    line.clear();
    dots.clear();
    const count = Math.floor(progress * pts.length);

    if (count > 0) {
      line.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < count; i++) {
        line.lineTo(pts[i].x, pts[i].y);
      }
      // Partial segment
      if (count < pts.length) {
        const frac = (progress * pts.length) - count;
        const prev = pts[count - 1];
        const next = pts[count];
        line.lineTo(prev.x + (next.x - prev.x) * frac, prev.y + (next.y - prev.y) * frac);
      }
      line.stroke({ width: lineWidth, color: hexColor });

      for (let i = 0; i < count; i++) {
        dots.circle(pts[i].x, pts[i].y, 3).fill({ color: hexColor });
      }
    }
  });

  return () => { app.destroy(true); };
}
