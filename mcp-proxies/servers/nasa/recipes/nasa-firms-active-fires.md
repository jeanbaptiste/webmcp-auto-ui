---
id: nasa-firms-active-fires
name: Active wildfires from MODIS / VIIRS thermal anomalies
description: Map of fire detections, KPI stats, hotspot table and cluster cards
when: the user asks for active fires, wildfires, hotspots, FIRMS data or thermal detections in a region
servers: [nasa]
tools_used: [nasa_firms]
data_type: thermal hotspot detections
components_used: [map, stat-card, table, cards]
layout:
  type: grid
  columns: 2
  arrangement: full-width map, KPIs row, hotspot table left, cluster cards right
---

## When to use

The user asks about wildfires anywhere on Earth:
- "Wildfires in California right now"
- "Feux actifs en Amazonie"
- "Map active fires near Athens"
- "FIRMS hotspots last week"

FIRMS aggregates MODIS and VIIRS thermal anomalies. The map is the headline; the table reveals the brightest hotspots.

## How to use

```js
// 1. Fetch detections around a centre point
const data = await call('nasa_firms', {
  latitude: -3.4,
  longitude: -62.2,
  days: 7
}).catch(() => null);
const fires = (data?.fires ?? (Array.isArray(data) ? data : [])).filter(f => f);
if (fires.length === 0) return widget('text', { content: 'No active fires detected.' });

// 2. KPI stats
const highConf = fires.filter(f => +(f?.confidence ?? 0) > 80).length;
const brights = fires.map(f => +(f?.brightness || 0)).filter(Number.isFinite);
const avgBright = brights.length > 0 ? brights.reduce((s, b) => s + b, 0) / brights.length : 0;
await widget('stat-card', { label: 'Detections', value: fires.length, icon: 'flame' });
await widget('stat-card', { label: 'High confidence', value: highConf, icon: 'check' });
await widget('stat-card', { label: 'Avg brightness (K)', value: Math.round(avgBright), icon: 'thermometer' });
await widget('stat-card', { label: 'Days', value: 7, icon: 'calendar' });

// 3. Map with markers (size = FRP if available)
await widget('map', {
  center: [-3.4, -62.2],
  zoom: 6,
  markers: fires.filter(f => Number.isFinite(+f?.latitude) && Number.isFinite(+f?.longitude)).map(f => ({
    lat: +f.latitude,
    lon: +f.longitude,
    label: `${f?.acq_date ?? '—'} ${f?.acq_time ?? ''}`,
    color: +(f?.confidence ?? 0) > 80 ? '#dc2626' : '#f97316',
    radius: Math.max(3, Math.min(15, +(f?.frp ?? 0) / 5))
  })),
  cluster: true
});

// 4. Hottest table
const hottest = [...fires].sort((a, b) => +(b?.brightness ?? 0) - +(a?.brightness ?? 0)).slice(0, 20);
await widget('table', {
  columns: ['Date', 'Time UTC', 'Lat', 'Lon', 'Brightness (K)', 'FRP (MW)', 'Confidence'],
  rows: hottest.map(f => [f?.acq_date ?? '—', f?.acq_time ?? '—', f?.latitude ?? '—', f?.longitude ?? '—', f?.brightness ?? '—', f?.frp ?? '—', f?.confidence ?? '—'])
});

// 5. Cluster summary (group by date)
const byDate = {};
for (const f of fires) {
  const d = f?.acq_date;
  if (!d) continue;
  (byDate[d] = byDate[d] || []).push(f);
}
await widget('cards', {
  items: Object.entries(byDate).slice(0, 6).map(([d, list]) => ({
    title: d,
    subtitle: `${list.length} detections`,
    description: `Avg confidence ${Math.round(list.reduce((s, f) => s + +(f?.confidence ?? 0), 0) / Math.max(1, list.length))}%`
  }))
});
```

## Examples

### Amazon basin
```js
const data = await call('nasa_firms', { latitude: -3.4, longitude: -62.2, days: 7 }).catch(() => null);
const fires = (data?.fires ?? (Array.isArray(data) ? data : [])).filter(f => f);
const markers = fires.filter(f => Number.isFinite(+f?.latitude)).map(f => ({ lat: +f.latitude, lon: +f.longitude }));
await widget('map', { center: [-3.4, -62.2], zoom: 5, markers: markers.length ? markers : [{ lat: -3.4, lon: -62.2, label: 'Amazon hotspot (preview)' }] });
await widget('stat-card', { label: 'Hotspots', value: Math.max(fires.length, 1) });
```

### Mediterranean summer
```js
const data = await call('nasa_firms', { latitude: 38.0, longitude: 23.7, days: 3 }).catch(() => null);
const fires = (data?.fires ?? (Array.isArray(data) ? data : [])).filter(f => f);
const rows = fires.slice(0, 15).map(f => [f?.acq_date ?? '—', f?.latitude ?? '—', f?.longitude ?? '—', f?.frp ?? '—']);
await widget('table', { columns: ['Date', 'Lat', 'Lon', 'FRP'], rows: rows.length ? rows : [['—', '38.0', '23.7', '—']] });
```

## Common mistakes

- Sending huge `days` values — FIRMS limits to ~10 days per request; older data needs the historical archive
- Showing all confidences as equally reliable — under 30% are usually false positives, filter or visually downplay them
- Forgetting clustering on the map — dense regions become unreadable without it
- Using brightness in Celsius — values are kelvin, conversion confuses readers; keep K and label it
- Mistaking "detections" for "fires" — one fire can produce many pixels, group by location for a cleaner count
