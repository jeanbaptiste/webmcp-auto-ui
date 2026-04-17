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

  const { highlights = [], title, baseColor = '#334155' } = data as any;
  const baseDotColor = parseInt(baseColor.replace('#', ''), 16);

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  // Simplified world map as a dot grid using Mercator-like projection
  // Rough continental boundaries encoded as lat/lon ranges
  const continents = [
    // North America
    { latMin: 15, latMax: 70, lonMin: -170, lonMax: -50 },
    // South America
    { latMin: -55, latMax: 15, lonMin: -80, lonMax: -35 },
    // Europe
    { latMin: 35, latMax: 70, lonMin: -10, lonMax: 40 },
    // Africa
    { latMin: -35, latMax: 35, lonMin: -18, lonMax: 52 },
    // Asia
    { latMin: 10, latMax: 70, lonMin: 40, lonMax: 145 },
    // Oceania
    { latMin: -45, latMax: -10, lonMin: 110, lonMax: 175 },
  ];

  const toX = (lon) => ((lon + 180) / 360) * W;
  const toY = (lat) => ((90 - lat) / 180) * H;

  const mapGfx = new PIXI.Graphics();
  app.stage.addChild(mapGfx);

  const step = 6;
  for (let lat = -60; lat <= 75; lat += step) {
    for (let lon = -170; lon <= 175; lon += step) {
      const inContinent = continents.some(
        (c) => lat >= c.latMin && lat <= c.latMax && lon >= c.lonMin && lon <= c.lonMax,
      );
      if (inContinent) {
        mapGfx.circle(toX(lon), toY(lat), 1.5).fill({ color: baseDotColor, alpha: 0.6 });
      }
    }
  }

  // Highlight points with pulsing animation
  const pulseGfx = new PIXI.Graphics();
  app.stage.addChild(pulseGfx);
  const labelContainer = new PIXI.Container();
  app.stage.addChild(labelContainer);

  const pts = highlights.map((h) => {
    const color = h.color ? parseInt(h.color.replace('#', ''), 16) : 0xef4444;
    const px = toX(h.lon);
    const py = toY(h.lat);
    if (h.label) {
      const t = new PIXI.Text({ text: h.label, style: { fontSize: 10, fill: 0xffffff, stroke: { color: 0x000000, width: 2 } } });
      t.x = px + (h.size || 6) + 4;
      t.y = py - 6;
      labelContainer.addChild(t);
    }
    return { x: px, y: py, color, size: h.size || 6 };
  });

  let time = 0;
  app.ticker.add((ticker) => {
    time += ticker.deltaTime * 0.05;
    pulseGfx.clear();
    for (const p of pts) {
      const pulse = 1 + Math.sin(time * 2) * 0.3;
      pulseGfx.circle(p.x, p.y, p.size * pulse * 1.5).fill({ color: p.color, alpha: 0.2 });
      pulseGfx.circle(p.x, p.y, p.size).fill({ color: p.color });
    }
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
