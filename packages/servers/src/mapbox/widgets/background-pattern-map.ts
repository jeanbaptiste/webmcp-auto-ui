// @ts-nocheck
// ---------------------------------------------------------------------------
// Background Pattern Map — custom pattern fill for polygons
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, d);

  map.on('load', () => {
    const geojson = d.geojson || { type: 'FeatureCollection', features: d.features || [] };
    const patternSize = d.patternSize ?? 16;
    const patternColor = d.patternColor || '#6366f1';
    const backgroundColor = d.backgroundColor || '#f8fafc';
    const patternType = d.patternType || 'diagonal'; // diagonal, dots, crosshatch, horizontal

    // Create pattern on canvas
    const canvas = document.createElement('canvas');
    canvas.width = patternSize;
    canvas.height = patternSize;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, patternSize, patternSize);
    ctx.strokeStyle = patternColor;
    ctx.lineWidth = 1.5;

    switch (patternType) {
      case 'dots':
        ctx.fillStyle = patternColor;
        ctx.beginPath();
        ctx.arc(patternSize / 2, patternSize / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'crosshatch':
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(patternSize, patternSize);
        ctx.moveTo(patternSize, 0); ctx.lineTo(0, patternSize);
        ctx.stroke();
        break;
      case 'horizontal':
        ctx.beginPath();
        ctx.moveTo(0, patternSize / 2); ctx.lineTo(patternSize, patternSize / 2);
        ctx.stroke();
        break;
      default: // diagonal
        ctx.beginPath();
        ctx.moveTo(0, patternSize); ctx.lineTo(patternSize, 0);
        ctx.stroke();
    }

    const img = new Image();
    img.onload = () => {
      if (!map.hasImage('custom-pattern')) {
        map.addImage('custom-pattern', img);
      }

      map.addSource('pattern-data', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'pattern-fill',
        type: 'fill',
        source: 'pattern-data',
        paint: {
          'fill-pattern': 'custom-pattern',
          'fill-opacity': d.opacity ?? 0.8,
        },
      });

      map.addLayer({
        id: 'pattern-outline',
        type: 'line',
        source: 'pattern-data',
        paint: {
          'line-color': patternColor,
          'line-width': 2,
        },
      });
    };
    img.src = canvas.toDataURL();
  });

  return () => { map.remove(); };
}
