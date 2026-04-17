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

  const { stages = [], title } = data as any;
  const colors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899];
  const pad = { top: title ? 44 : 20, bottom: 20, left: 40, right: 40 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  if (stages.length === 0) return () => { ro.disconnect(); app.destroy(true); };
  const maxVal = stages[0].value || 1;
  const stageH = iH / stages.length;

  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);
  const labelContainer = new PIXI.Container();
  app.stage.addChild(labelContainer);

  let progress = 0;
  let labelsDrawn = false;

  app.ticker.add((ticker) => {
    if (progress >= 1 && labelsDrawn) return;
    progress = Math.min(1, progress + ticker.deltaTime * 0.03);
    gfx.clear();

    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      const frac = (s.value || 0) / maxVal;
      const nextFrac = i < stages.length - 1 ? (stages[i + 1].value || 0) / maxVal : frac * 0.6;
      const color = s.color ? parseInt(s.color.replace('#', ''), 16) : colors[i % colors.length];

      const topW = frac * iW * Math.min(1, progress * stages.length / (i + 1));
      const botW = nextFrac * iW * Math.min(1, progress * stages.length / (i + 1));
      const y = pad.top + i * stageH;
      const cx = W / 2;

      gfx.moveTo(cx - topW / 2, y);
      gfx.lineTo(cx + topW / 2, y);
      gfx.lineTo(cx + botW / 2, y + stageH - 2);
      gfx.lineTo(cx - botW / 2, y + stageH - 2);
      gfx.closePath();
      gfx.fill({ color, alpha: 0.85 });
    }

    if (progress >= 1 && !labelsDrawn) {
      labelsDrawn = true;
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        const y = pad.top + i * stageH + stageH / 2;
        const t = new PIXI.Text({
          text: `${s.label || ''} (${s.value})`,
          style: { fontSize: 12, fill: 0xffffff, fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } },
        });
        t.x = W / 2 - t.width / 2;
        t.y = y - 8;
        labelContainer.addChild(t);
      }
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
