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

  const { data: items = [], title } = data as any;
  const pad = { top: title ? 40 : 10, right: 10, bottom: 10, left: 10 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const colors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899, 0x06b6d4, 0x84cc16];

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  // Simple squarified treemap layout
  const total = items.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const sorted = [...items].sort((a, b) => (b.value || 0) - (a.value || 0));
  const rects = [];
  let x = pad.left, y = pad.top, remainW = iW, remainH = iH, remainVal = total;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const frac = (item.value || 0) / remainVal;
    let rw, rh;
    if (remainW > remainH) {
      rw = remainW * frac;
      rh = remainH;
      rects.push({ x, y, w: rw - 2, h: rh - 2, item, idx: i });
      x += rw;
      remainW -= rw;
    } else {
      rw = remainW;
      rh = remainH * frac;
      rects.push({ x, y, w: rw - 2, h: rh - 2, item, idx: i });
      y += rh;
      remainH -= rh;
    }
    remainVal -= (item.value || 0);
    if (remainVal <= 0) break;
  }

  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);
  const labels = new PIXI.Container();
  app.stage.addChild(labels);

  let progress = 0;
  let labelsDrawn = false;

  app.ticker.add((ticker) => {
    if (progress >= 1 && labelsDrawn) return;
    progress = Math.min(1, progress + ticker.deltaTime * 0.04);
    gfx.clear();

    for (const r of rects) {
      const color = r.item.color ? parseInt(r.item.color.replace('#', ''), 16) : colors[r.idx % colors.length];
      const scale = Math.min(1, progress * rects.length / (r.idx + 1));
      gfx.rect(r.x, r.y, r.w * scale, r.h * scale).fill({ color, alpha: 0.85 });
    }

    if (progress >= 1 && !labelsDrawn) {
      labelsDrawn = true;
      for (const r of rects) {
        if (r.w > 40 && r.h > 20) {
          const t = new PIXI.Text({ text: r.item.label || '', style: { fontSize: 11, fill: 0xffffff, fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } } });
          t.x = r.x + 4;
          t.y = r.y + 4;
          labels.addChild(t);
        }
      }
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
