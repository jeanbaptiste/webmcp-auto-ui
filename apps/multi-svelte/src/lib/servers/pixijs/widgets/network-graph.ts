// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const PIXI = await import('pixi.js');
  const app = new PIXI.Application();
  const W = container.clientWidth || 500;
  const H = 400;
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  container.appendChild(app.canvas);

  const { nodes = [], edges = [], title } = data as any;

  if (title) {
    const t = new PIXI.Text({ text: title, style: { fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    t.x = W / 2 - t.width / 2;
    t.y = 8;
    app.stage.addChild(t);
  }

  const defaultColors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899];

  // Init positions randomly
  const nodeMap = new Map();
  const simNodes = nodes.map((n, i) => {
    const sn = {
      id: n.id,
      label: n.label || n.id,
      color: n.color ? parseInt(n.color.replace('#', ''), 16) : defaultColors[i % defaultColors.length],
      x: W / 2 + (Math.random() - 0.5) * W * 0.5,
      y: H / 2 + (Math.random() - 0.5) * H * 0.5,
      vx: 0,
      vy: 0,
    };
    nodeMap.set(n.id, sn);
    return sn;
  });

  const simEdges = edges.map((e) => ({
    source: nodeMap.get(e.source),
    target: nodeMap.get(e.target),
  })).filter(e => e.source && e.target);

  const edgeGfx = new PIXI.Graphics();
  app.stage.addChild(edgeGfx);

  const nodeContainers = simNodes.map((n) => {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.circle(0, 0, 12).fill({ color: n.color });
    c.addChild(g);
    const t = new PIXI.Text({ text: n.label, style: { fontSize: 10, fill: 0xffffff } });
    t.x = -t.width / 2;
    t.y = 16;
    c.addChild(t);
    c.x = n.x;
    c.y = n.y;
    app.stage.addChild(c);
    return c;
  });

  // Simple force simulation
  app.ticker.add(() => {
    // Repulsion
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i], b = simNodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 800 / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        a.vx -= dx; a.vy -= dy;
        b.vx += dx; b.vy += dy;
      }
    }
    // Attraction (edges)
    for (const e of simEdges) {
      const dx = e.target.x - e.source.x;
      const dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 80) * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      e.source.vx += fx; e.source.vy += fy;
      e.target.vx -= fx; e.target.vy -= fy;
    }
    // Center gravity
    for (const n of simNodes) {
      n.vx += (W / 2 - n.x) * 0.001;
      n.vy += (H / 2 - n.y) * 0.001;
      n.vx *= 0.9; n.vy *= 0.9;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(20, Math.min(W - 20, n.x));
      n.y = Math.max(30, Math.min(H - 20, n.y));
    }
    // Draw
    edgeGfx.clear();
    for (const e of simEdges) {
      edgeGfx.moveTo(e.source.x, e.source.y).lineTo(e.target.x, e.target.y);
    }
    edgeGfx.stroke({ width: 1, color: 0x555555 });

    simNodes.forEach((n, i) => {
      nodeContainers[i].x = n.x;
      nodeContainers[i].y = n.y;
    });
  });

  return () => { app.destroy(true); };
}
