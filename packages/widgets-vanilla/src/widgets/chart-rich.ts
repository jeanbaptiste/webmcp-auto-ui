/** chart-rich — Multi-type chart (bar, line, area, pie, donut) */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const type = (data.type as string) ?? 'bar';
  const labels = (data.labels as string[]) ?? [];
  const series = (data.data as Array<{ label?: string; values: number[]; color?: string }>) ?? [];

  const defaultColors = ['#6c5ce7', '#e17055', '#00b894', '#fdcb6e', '#0984e3', '#e84393'];

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;background:#1a1a2e;border:1px solid #333;border-radius:8px;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;

  if (type === 'pie' || type === 'donut') {
    html += renderPie(series, type === 'donut', defaultColors);
  } else if (type === 'line' || type === 'area') {
    html += renderLine(labels, series, type === 'area', defaultColors);
  } else {
    html += renderBar(labels, series, defaultColors);
  }

  // Legend
  if (series.length > 1 || series.some(s => s.label)) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;">';
    series.forEach((s, i) => {
      const color = s.color ?? defaultColors[i % defaultColors.length];
      html += `<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#888;">
        <div style="width:8px;height:8px;border-radius:2px;background:${esc(color)};"></div>
        ${esc(s.label ?? `Serie ${i + 1}`)}
      </div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderBar(labels: string[], series: Array<{ label?: string; values: number[]; color?: string }>, defaultColors: string[]): string {
  const allVals = series.flatMap(s => s.values);
  const max = Math.max(...allVals, 1);
  const barCount = labels.length || Math.max(...series.map(s => s.values.length));

  let html = '<div style="display:flex;align-items:flex-end;gap:4px;height:120px;">';
  for (let i = 0; i < barCount; i++) {
    html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;">';
    html += '<div style="flex:1;display:flex;align-items:flex-end;gap:1px;width:100%;">';
    for (let si = 0; si < series.length; si++) {
      const val = series[si].values[i] ?? 0;
      const pct = Math.round((val / max) * 100);
      const color = series[si].color ?? defaultColors[si % defaultColors.length];
      html += `<div style="flex:1;background:${esc(color)};opacity:0.8;border-radius:2px 2px 0 0;height:${pct}%;min-height:${val > 0 ? 2 : 0}px;" title="${val}"></div>`;
    }
    html += '</div>';
    if (labels[i]) html += `<span style="font-size:9px;font-family:ui-monospace,monospace;color:#888;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(labels[i])}</span>`;
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderLine(labels: string[], series: Array<{ label?: string; values: number[]; color?: string }>, isArea: boolean, defaultColors: string[]): string {
  const allVals = series.flatMap(s => s.values);
  const max = Math.max(...allVals, 1);
  const min = Math.min(...allVals, 0);
  const range = max - min || 1;
  const W = 400, H = 120, padX = 20, padY = 10;

  let svgContent = '';
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const color = s.color ?? defaultColors[si % defaultColors.length];
    const pts = s.values.map((v, i) => {
      const x = padX + (i / Math.max(s.values.length - 1, 1)) * (W - 2 * padX);
      const y = padY + (1 - (v - min) / range) * (H - 2 * padY);
      return [x, y] as [number, number];
    });
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    if (isArea && pts.length > 1) {
      const areaPath = line + ` L${pts[pts.length - 1][0].toFixed(1)},${H - padY} L${pts[0][0].toFixed(1)},${H - padY} Z`;
      svgContent += `<path d="${areaPath}" fill="${color}" opacity="0.15"/>`;
    }
    svgContent += `<path d="${line}" fill="none" stroke="${color}" stroke-width="2"/>`;
    for (const p of pts) {
      svgContent += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${color}"/>`;
    }
  }

  // X labels
  if (labels.length) {
    labels.forEach((l, i) => {
      const x = padX + (i / Math.max(labels.length - 1, 1)) * (W - 2 * padX);
      svgContent += `<text x="${x.toFixed(1)}" y="${H}" text-anchor="middle" font-size="9" fill="#888" font-family="ui-monospace,monospace">${esc(l)}</text>`;
    });
  }

  return `<svg viewBox="0 0 ${W} ${H + 10}" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

function renderPie(series: Array<{ label?: string; values: number[]; color?: string }>, isDonut: boolean, defaultColors: string[]): string {
  // Sum values from all series (use first value of each, or sum all)
  const slices: { label: string; value: number; color: string }[] = [];
  for (let i = 0; i < series.length; i++) {
    const total = series[i].values.reduce((a, b) => a + b, 0);
    slices.push({
      label: series[i].label ?? `Serie ${i + 1}`,
      value: total,
      color: series[i].color ?? defaultColors[i % defaultColors.length],
    });
  }

  const sum = slices.reduce((a, s) => a + s.value, 0);
  if (sum === 0) return '<div style="color:#888;font-size:12px;">Aucune donn\u00E9e</div>';

  const size = 180, cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 5;
  const innerR = isDonut ? outerR * 0.55 : 0;

  let svgContent = '';
  let startAngle = -Math.PI / 2;

  for (const slice of slices) {
    const angle = (slice.value / sum) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    if (innerR > 0) {
      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);
      svgContent += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${outerR},${outerR} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix1.toFixed(1)},${iy1.toFixed(1)} A${innerR},${innerR} 0 ${largeArc},0 ${ix2.toFixed(1)},${iy2.toFixed(1)} Z" fill="${slice.color}" stroke="#1a1a2e" stroke-width="2"><title>${esc(slice.label)}: ${slice.value}</title></path>`;
    } else {
      svgContent += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${outerR},${outerR} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${slice.color}" stroke="#1a1a2e" stroke-width="2"><title>${esc(slice.label)}: ${slice.value}</title></path>`;
    }
    startAngle = endAngle;
  }

  return `<div style="display:flex;justify-content:center;"><svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg></div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
