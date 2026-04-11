/** map — Map display (textual — no Leaflet/Mapbox in vanilla) */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const center = data.center as { lat: number; lng: number } | undefined;
  const zoom = data.zoom as number | undefined;
  const markers = (data.markers as Array<{ lat: number; lng: number; label?: string; color?: string }>) ?? [];
  const height = (data.height as string) ?? '300px';

  let html = `<div style="padding:12px 16px;font-family:system-ui,sans-serif;background:#1a1a2e;border:1px solid #333;border-radius:8px;">`;
  if (title) html += `<div style="font-size:14px;font-weight:600;color:#e0e0e0;margin-bottom:8px;">${esc(title)}</div>`;

  // Map placeholder with marker pins rendered as a simple coordinate view
  html += `<div style="height:${esc(height)};background:#0d0d1a;border:1px solid #333;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;">`;
  html += '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-1.447-.894L15 12m0 8V12M9 7l6-2.5"/></svg>';

  if (center) {
    html += `<div style="font-size:11px;color:#888;font-family:ui-monospace,monospace;">Centre: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}${zoom ? ` (zoom ${zoom})` : ''}</div>`;
  }
  html += `<div style="font-size:10px;color:#555;">Carte interactive non disponible en mode vanilla</div>`;
  html += '</div>';

  // Marker list
  if (markers.length) {
    html += `<div style="margin-top:8px;font-size:11px;color:#888;font-family:ui-monospace,monospace;">${markers.length} marqueur${markers.length > 1 ? 's' : ''}</div>`;
    html += '<div style="margin-top:4px;display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;">';
    for (const m of markers) {
      const color = m.color ?? '#6c5ce7';
      html += `<div style="display:flex;align-items:center;gap:8px;font-size:11px;padding:4px 8px;background:#111;border-radius:4px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${esc(color)};flex-shrink:0;"></div>
        <span style="color:#e0e0e0;">${esc(m.label ?? `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`)}</span>
        <span style="color:#555;margin-left:auto;font-family:ui-monospace,monospace;">${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</span>
      </div>`;
    }
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
