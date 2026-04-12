// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const { value = 0, min = 0, max = 100, title, unit = '', color = '#3b82f6' } = data as any;
  const hexColor = parseInt(color.replace('#', ''), 16);
  const cx = W / 2, cy = H * 0.55;
  const radius = Math.min(W, H) * 0.35;
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const totalAngle = endAngle - startAngle;
  const targetFrac = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  // Track
  const track = new PIXI.Graphics();
  track.arc(cx, cy, radius, startAngle, endAngle);
  track.stroke({ width: 16, color: 0x333333 });
  app.stage.addChild(track);

  // Value arc
  const arc = new PIXI.Graphics();
  app.stage.addChild(arc);

  // Needle
  const needle = new PIXI.Graphics();
  app.stage.addChild(needle);

  // Value text
  const valText = new PIXI.Text({ text: '0', style: { fontSize: 28, fontWeight: 'bold', fill: 0xffffff } });
  valText.x = cx - valText.width / 2;
  valText.y = cy + 10;
  app.stage.addChild(valText);

  // Tick labels
  for (let i = 0; i <= 5; i++) {
    const frac = i / 5;
    const angle = startAngle + frac * totalAngle;
    const v = Math.round(min + frac * (max - min));
    const tx = cx + Math.cos(angle) * (radius + 20);
    const ty = cy + Math.sin(angle) * (radius + 20);
    const t = new PIXI.Text({ text: String(v), style: { fontSize: 10, fill: 0x888888 } });
    t.x = tx - t.width / 2;
    t.y = ty - 5;
    app.stage.addChild(t);
  }

  let currentFrac = 0;
  app.ticker.add((ticker) => {
    if (Math.abs(currentFrac - targetFrac) < 0.001) return;
    currentFrac += (targetFrac - currentFrac) * Math.min(1, ticker.deltaTime * 0.05);

    arc.clear();
    arc.arc(cx, cy, radius, startAngle, startAngle + currentFrac * totalAngle);
    arc.stroke({ width: 16, color: hexColor });

    const angle = startAngle + currentFrac * totalAngle;
    needle.clear();
    needle.moveTo(cx, cy);
    needle.lineTo(cx + Math.cos(angle) * (radius - 10), cy + Math.sin(angle) * (radius - 10));
    needle.stroke({ width: 3, color: 0xffffff });
    needle.circle(cx, cy, 5).fill({ color: 0xffffff });

    const displayVal = Math.round(min + currentFrac * (max - min));
    valText.text = `${displayVal}${unit}`;
    valText.x = cx - valText.width / 2;
  });

  return () => { app.destroy(true); };
}
