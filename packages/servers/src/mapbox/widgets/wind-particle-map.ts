// @ts-nocheck
// ---------------------------------------------------------------------------
// Wind Particle Map — animated particles simulating wind flow
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, { ...d, style: d.style || 'mapbox://styles/mapbox/dark-v11' });
  let animId: number | null = null;

  map.on('load', () => {
    // Wind data as array of { coordinates, u, v } vectors
    const windData = d.windData || d.particles || generateSampleWind(d.center || [2.3522, 48.8566]);
    const particleCount = d.particleCount ?? 200;
    const particleColor = d.particleColor || '#64b5f6';
    const speed = d.speed ?? 0.003;

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0.8;';
    container.style.position = 'relative';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    // Simple particle system
    const particles: any[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({ x: Math.random(), y: Math.random(), age: Math.random() * 50 });
    }

    function animate() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = particleColor;

      particles.forEach((p) => {
        // Simple flow field
        const angle = (Math.sin(p.x * 6) + Math.cos(p.y * 6)) * Math.PI;
        p.x += Math.cos(angle) * speed;
        p.y += Math.sin(angle) * speed;
        p.age++;

        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1 || p.age > 80) {
          p.x = Math.random();
          p.y = Math.random();
          p.age = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(animate);
    }
    animate();
  });

  return () => {
    if (animId) cancelAnimationFrame(animId);
    map.remove();
  };
}

function generateSampleWind(center: [number, number]) {
  const pts = [];
  for (let i = 0; i < 50; i++) {
    pts.push({
      coordinates: [center[0] + (Math.random() - 0.5) * 5, center[1] + (Math.random() - 0.5) * 5],
      u: (Math.random() - 0.5) * 10,
      v: (Math.random() - 0.5) * 10,
    });
  }
  return pts;
}
