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

  const { points = [], title, color = '#3b82f6', xLabel, yLabel } = data as any;
  const pad = { top: title ? 40 : 20, right: 20, bottom: 40, left: 50 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // Axes
  const axes = new PIXI.Graphics();
  axes.moveTo(pad.left, pad.top).lineTo(pad.left, H - pad.bottom).lineTo(W - pad.right, H - pad.bottom);
  axes.stroke({ width: 1, color: 0x888888 });
  app.stage.addChild(axes);

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }
  if (xLabel) {
    const t = new PIXI.Text({ text: xLabel, style: { fontSize: 11, fill: 0xaaaaaa, stroke: { color: 0x000000, width: 2 } } });
    t.x = W / 2 - t.width / 2;
    t.y = H - 18;
    app.stage.addChild(t);
  }
  if (yLabel) {
    const t = new PIXI.Text({ text: yLabel, style: { fontSize: 11, fill: 0xaaaaaa, stroke: { color: 0x000000, width: 2 } } });
    t.x = 4;
    t.y = H / 2 - t.height / 2;
    t.rotation = -Math.PI / 2;
    t.y = H / 2 + t.width / 2;
    t.x = 4;
    app.stage.addChild(t);
  }

  const hexColor = parseInt(color.replace('#', ''), 16);
  const dotContainer = new PIXI.Graphics();
  app.stage.addChild(dotContainer);

  let progress = 0;
  app.ticker.add((ticker) => {
    if (progress >= 1) return;
    progress = Math.min(1, progress + ticker.deltaTime * 0.03);
    dotContainer.clear();
    const count = Math.ceil(progress * points.length);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const px = pad.left + ((p.x - minX) / rangeX) * iW;
      const py = pad.top + iH - ((p.y - minY) / rangeY) * iH;
      const size = p.size || 4;
      const alpha = Math.min(1, (progress * points.length - i) * 2);
      dotContainer.circle(px, py, size).fill({ color: hexColor, alpha });
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
