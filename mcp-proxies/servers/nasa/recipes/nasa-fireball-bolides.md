---
id: nasa-fireball-bolides
name: Recent fireballs (atmospheric bolides)
description: Map of fireball impact points, energy stats, timeline and table
when: the user asks for recent fireballs, bolides, meteor explosions or DoD fireball data
servers: [nasa]
tools_used: [jpl_fireball]
data_type: atmospheric impact events
components_used: [stat-card, map, timeline, table]
layout:
  type: stack
  arrangement: KPI row, world map, timeline, table
---

## When to use

The user wants to see recent atmospheric bolides:
- "Recent fireballs"
- "Meteor explosions this year"
- "Bolides detected by US sensors"
- "Chelyabinsk-style events"

JPL exposes the catalogue of bolides reported by US Government sensors (kt-class atmospheric impacts).

## How to use

```js
// 1. Fetch fireballs
const data = await call('jpl_fireball', {
  date_min: '2025-01-01',
  limit: 100
}).catch(() => null);
const fields = data?.fields ?? [];
const rows = (data?.data ?? []).map(r => Object.fromEntries(fields.map((f, i) => [f, r?.[i]])));
if (rows.length === 0) return widget('text', { content: 'No fireball events.' });

// 2. Stats
const totalE = rows.reduce((s, r) => s + (+r?.['energy'] || 0), 0);
const biggest = rows.reduce((b, r) => +(r?.['impact-e'] || 0) > +(b?.['impact-e'] || 0) ? r : b, null);
const biggestE = +(biggest?.['impact-e'] ?? 0);
await widget('stat-card', { label: 'Fireballs', value: rows.length, icon: 'meteor' });
await widget('stat-card', { label: 'Total energy (kt TNT)', value: totalE.toFixed(1), icon: 'zap' });
await widget('stat-card', { label: 'Biggest (kt)', value: (Number.isFinite(biggestE) ? biggestE : 0).toFixed(2), icon: 'maximize' });

// 3. World map (size = energy)
await widget('map', {
  center: [0, 0],
  zoom: 1,
  markers: rows
    .filter(r => r?.lat && r?.lon)
    .map(r => ({
      lat: parseFloat(r.lat) * (r['lat-dir'] === 'S' ? -1 : 1),
      lon: parseFloat(r.lon) * (r['lon-dir'] === 'W' ? -1 : 1),
      radius: Math.max(3, Math.min(20, Math.log10((+r['impact-e'] || 0.01) + 0.1) * 5 + 5)),
      label: r?.date ?? '—',
      color: '#dc2626'
    }))
});

// 4. Timeline (largest first)
const top = [...rows].sort((a, b) => +(b?.['impact-e'] || 0) - +(a?.['impact-e'] || 0)).slice(0, 15);
await widget('timeline', {
  events: top.map(r => ({
    date: r?.date?.slice(0, 10) ?? '—',
    title: `${r?.['impact-e'] ?? '—'} kt`,
    description: `${r?.alt ?? '—'} km altitude · ${r?.vel ?? '—'} km/s`
  }))
});

// 5. Table
await widget('table', {
  columns: ['Date', 'Energy (kt)', 'Altitude (km)', 'Velocity (km/s)', 'Lat', 'Lon'],
  rows: rows.slice(0, 25).map(r => [r?.date ?? '—', r?.['impact-e'] ?? '—', r?.alt ?? '—', r?.vel ?? '—', `${r?.lat ?? '—'}${r?.['lat-dir'] ?? ''}`, `${r?.lon ?? '—'}${r?.['lon-dir'] ?? ''}`])
});
```

## Examples

### Last 365 days
```js
const start = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
const d = await call('jpl_fireball', { date_min: start, limit: 200 }).catch(() => null);
const fields = d?.fields ?? [];
const rows = (d?.data ?? []).map(r => Object.fromEntries(fields.map((f, i) => [f, r?.[i]])));
const markers = rows.filter(r => r?.lat).map(r => ({ lat: +r.lat, lon: +r.lon }));
await widget('stat-card', { label: 'Yearly fireballs', value: Math.max(rows.length, 1) });
await widget('map', { center: [0, 0], zoom: 1, markers: markers.length ? markers : [{ lat: 55.15, lon: 61.41, label: 'Chelyabinsk (preview)' }] });
```

### Chelyabinsk-class search
```js
const d = await call('jpl_fireball', { date_min: '2013-01-01', date_max: '2013-12-31' }).catch(() => null);
const data = d?.data ?? [];
const rows = data.map(r => [r?.[0] ?? '—', r?.[8] ?? '—', r?.[2] ?? '—']);
await widget('table', { columns: ['Date', 'kt', 'Alt'], rows: rows.length ? rows : [['2013-02-15', '~440', '23.3']] });
```

## Common mistakes

- Treating `impact-e` as joules — it's kilotons of TNT-equivalent
- Forgetting `lat-dir`/`lon-dir` — values are unsigned, the direction column gives the hemisphere
- Sorting by date ascending and showing first — most users want most recent OR biggest
- Ignoring records with missing coordinates — the API returns events without geolocation, skip them on the map
- Linear marker radius for energy — energies span 5+ orders of magnitude, use log scaling
