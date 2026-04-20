// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const chartH = (data as any).height || 60;
  const H = chartH + ((data as any).title ? 30 : 0);
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const ro = new ResizeObserver(() => {
    const newW = container.clientWidth || W;
    app.renderer.resize(newW, H);
  });
  ro.observe(container);

  const { values = [], color = '#3b82f6', fill = false, title } = data as any;
  const hexColor = parseInt(color.replace('#', ''), 16);
  const topPad = title ? 26 : 4;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 12, fontWeight: 'bold', fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } } });
    t.x = 4;
    t.y = 4;
    app.stage.addChild(t);
  }

  if (values.length < 2) return () => { ro.disconnect(); app.destroy(true); };
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;

  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: topPad + (1 - (v - minV) / range) * (chartH - 8),
  }));

  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);

  let progress = 0;
  app.ticker.add((ticker) => {
    if (progress >= 1) return;
    progress = Math.min(1, progress + ticker.deltaTime * 0.04);
    gfx.clear();

    const count = Math.ceil(progress * pts.length);

    if (fill && count > 1) {
      gfx.moveTo(pts[0].x, H);
      gfx.lineTo(pts[0].x, pts[0].y);
      for (let i = 1; i < count; i++) gfx.lineTo(pts[i].x, pts[i].y);
      gfx.lineTo(pts[count - 1].x, H);
      gfx.closePath();
      gfx.fill({ color: hexColor, alpha: 0.15 });
    }

    if (count > 0) {
      gfx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < count; i++) gfx.lineTo(pts[i].x, pts[i].y);
      gfx.stroke({ width: 2, color: hexColor });
    }

    // End dot
    if (count > 0) {
      const last = pts[count - 1];
      gfx.circle(last.x, last.y, 3).fill({ color: hexColor });
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
