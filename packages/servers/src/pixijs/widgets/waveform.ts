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

  const { waves = 3, amplitude = 50, frequency = 1, color = '#3b82f6', title } = data as any;
  const hexColor = parseInt(color.replace('#', ''), 16);

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const gfx = new PIXI.Graphics();
  app.stage.addChild(gfx);
  let time = 0;

  app.ticker.add((ticker) => {
    time += ticker.deltaTime * 0.02 * frequency;
    gfx.clear();
    const cy = H / 2;

    for (let w = 0; w < waves; w++) {
      const alpha = 0.3 + 0.5 * ((waves - w) / waves);
      const amp = amplitude * (1 - w * 0.15);
      const phaseOffset = w * 0.8;
      const freqMult = 1 + w * 0.3;

      gfx.moveTo(0, cy);
      for (let x = 0; x <= W; x += 3) {
        const y = cy + Math.sin(x * 0.01 * freqMult + time + phaseOffset) * amp
                      + Math.sin(x * 0.02 * freqMult + time * 1.3 + phaseOffset) * amp * 0.3;
        gfx.lineTo(x, y);
      }
      gfx.stroke({ width: 2, color: hexColor, alpha });
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
