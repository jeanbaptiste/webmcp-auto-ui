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

  const { messages = [], speed = 1, color = '#ffffff', fontSize = 14, title } = data as any;
  const hexColor = parseInt(color.replace('#', ''), 16);

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const lineH = fontSize + 8;
  const startY = title ? 40 : 10;
  const feedContainer = new PIXI.Container();
  app.stage.addChild(feedContainer);

  // Create text items cycling from bottom to top
  const items = [];
  let nextIdx = 0;
  let spawnTimer = 0;

  app.ticker.add((ticker) => {
    spawnTimer += ticker.deltaTime;
    if (spawnTimer > 40 / speed && messages.length > 0) {
      spawnTimer = 0;
      const msg = messages[nextIdx % messages.length];
      nextIdx++;
      const t = new PIXI.Text({
        text: `> ${msg}`,
        style: { fontSize, fill: hexColor, fontFamily: 'monospace', stroke: { color: 0x000000, width: 2 } },
      });
      t.x = 10;
      t.y = H + 10;
      t.alpha = 0;
      feedContainer.addChild(t);
      items.push({ text: t, targetY: H - lineH });
    }

    // Move all items up
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.text.y += (item.targetY - item.text.y) * 0.08 * ticker.deltaTime;
      item.text.alpha = Math.min(1, item.text.alpha + 0.05 * ticker.deltaTime);

      // Fade out when near top
      if (item.text.y < startY + 20) {
        item.text.alpha -= 0.03 * ticker.deltaTime;
      }
      if (item.text.alpha <= 0) {
        feedContainer.removeChild(item.text);
        item.text.destroy();
        items.splice(i, 1);
      }
    }

    // Push existing items up when new ones arrive
    for (let i = 0; i < items.length - 1; i++) {
      items[i].targetY -= lineH * 0.02 * ticker.deltaTime;
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
