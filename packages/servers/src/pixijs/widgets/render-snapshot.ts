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

  const { elements = [], title, background } = data as any;

  if (background) {
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, W, H).fill({ color: parseInt(background.replace('#', ''), 16) });
    app.stage.addChild(bg);
  }

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  for (const el of elements) {
    const color = el.color ? parseInt(el.color.replace('#', ''), 16) : 0xffffff;

    switch (el.type) {
      case 'rect': {
        const g = new PIXI.Graphics();
        g.rect(el.x || 0, el.y || 0, el.width || 50, el.height || 50).fill({ color });
        app.stage.addChild(g);
        break;
      }
      case 'circle': {
        const g = new PIXI.Graphics();
        g.circle(el.x || 0, el.y || 0, el.radius || 20).fill({ color });
        app.stage.addChild(g);
        break;
      }
      case 'line': {
        const g = new PIXI.Graphics();
        g.moveTo(el.x || 0, el.y || 0).lineTo(el.x2 || 100, el.y2 || 100);
        g.stroke({ width: 2, color });
        app.stage.addChild(g);
        break;
      }
      case 'text': {
        const t = new PIXI.Text({
          text: el.text || '',
          style: { fontSize: el.fontSize || 14, fill: color, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } },
        });
        t.x = el.x || 0;
        t.y = el.y || 0;
        app.stage.addChild(t);
        break;
      }
    }
  }

  return () => { ro.disconnect(); app.destroy(true); };
}
