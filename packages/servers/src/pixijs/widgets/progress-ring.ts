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

  const { value = 0, color = '#3b82f6', trackColor = '#333333', title, label = '', size = 200 } = data as any;
  const hexColor = parseInt(color.replace('#', ''), 16);
  const hexTrack = parseInt(trackColor.replace('#', ''), 16);
  const cx = W / 2, cy = H / 2;
  const radius = size / 2;
  const targetFrac = Math.max(0, Math.min(1, value / 100));

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  // Track
  const track = new PIXI.Graphics();
  track.circle(cx, cy, radius);
  track.stroke({ width: 14, color: hexTrack });
  app.stage.addChild(track);

  // Progress arc
  const arc = new PIXI.Graphics();
  app.stage.addChild(arc);

  // Percentage text
  const pctText = new PIXI.Text({ text: '0%', style: { fontSize: 32, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 4 } } });
  pctText.x = cx - pctText.width / 2;
  pctText.y = cy - 20;
  app.stage.addChild(pctText);

  if (label) {
    const lbl = new PIXI.Text({ text: label, style: { fontSize: 13, fill: 0xaaaaaa, stroke: { color: 0x000000, width: 2 } } });
    lbl.x = cx - lbl.width / 2;
    lbl.y = cy + 18;
    app.stage.addChild(lbl);
  }

  let currentFrac = 0;
  app.ticker.add((ticker) => {
    if (Math.abs(currentFrac - targetFrac) < 0.002) return;
    currentFrac += (targetFrac - currentFrac) * Math.min(1, ticker.deltaTime * 0.04);

    arc.clear();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + currentFrac * Math.PI * 2;
    arc.arc(cx, cy, radius, startAngle, endAngle);
    arc.stroke({ width: 14, color: hexColor });

    const pct = Math.round(currentFrac * 100);
    pctText.text = `${pct}%`;
    pctText.x = cx - pctText.width / 2;
  });

  return () => { ro.disconnect(); app.destroy(true); };
}
