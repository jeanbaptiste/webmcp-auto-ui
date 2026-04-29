---
id: nasa-neo-week-dashboard
name: Weekly Near-Earth Object dashboard
description: KPIs, scatter chart, sortable table and hazardous-asteroid cards over a 7-day window
when: the user asks for NEOs of the week, asteroids passing close to Earth, or a near-earth-object dashboard
servers: [nasa]
tools_used: [nasa_neo]
data_type: 7-day NEO close approaches
components_used: [stat-card, chart, table, cards]
layout:
  type: grid
  columns: 4
  arrangement: 4 KPI stat-cards on top, full-width scatter chart, table left, hazardous cards right
---

## When to use

The user asks about asteroids approaching Earth in the coming week:
- "Asteroids of the week"
- "NEO close approaches"
- "Show me dangerous asteroids"
- "Near-Earth objects dashboard"
- "Astéroïdes géocroiseurs"

The NEO Web Service caps queries at 7 days, so the recipe is naturally weekly.

## How to use

```js
// 1. Fetch the 7-day NEO feed
const today = new Date().toISOString().slice(0, 10);
const week  = new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const data = await call('nasa_neo', { start_date: today, end_date: week }).catch(() => null);

// 2. Flatten across days
const all = Object.values(data?.near_earth_objects ?? {}).flat().filter(n => n);
if (all.length === 0) return widget('text', { content: 'No NEO data this week.' });

const dia = n => +(n?.estimated_diameter?.meters?.estimated_diameter_max ?? 0);
const ld = n => +(n?.close_approach_data?.[0]?.miss_distance?.lunar ?? Infinity);
const hazardous = all.filter(n => n?.is_potentially_hazardous_asteroid);
const biggest = all.reduce((b, n) => dia(n) > dia(b ?? {}) ? n : b, null);
const closest = all.reduce((c, n) => ld(n) < ld(c ?? {}) ? n : c, null);

// 3. KPI stat-cards
await widget('stat-card', { label: 'NEO this week', value: all.length, icon: 'globe' });
await widget('stat-card', { label: 'Potentially hazardous', value: hazardous.length, icon: 'alert' });
await widget('stat-card', { label: 'Largest (m)', value: biggest ? Math.round(dia(biggest)) : '—', icon: 'maximize' });
await widget('stat-card', { label: 'Closest (LD)', value: closest && Number.isFinite(ld(closest)) ? ld(closest).toFixed(2) : '—', icon: 'target' });

// 4. Scatter chart: distance vs size
await widget('chart', {
  type: 'scatter',
  data: all.filter(n => Number.isFinite(ld(n)) && dia(n) > 0).map(n => ({
    x: ld(n),
    y: dia(n),
    label: n?.name ?? '—',
    color: n?.is_potentially_hazardous_asteroid ? '#dc2626' : '#3b82f6'
  })),
  xLabel: 'Miss distance (lunar dist.)',
  yLabel: 'Diameter max (m)'
});

// 5. Sortable table
await widget('table', {
  columns: ['Name', 'Approach', 'Distance (LD)', 'Velocity (km/s)', 'Diameter max (m)', 'Hazardous'],
  rows: all.map(n => {
    const ca = n?.close_approach_data?.[0];
    const lunar = +(ca?.miss_distance?.lunar ?? NaN);
    const vel = +(ca?.relative_velocity?.kilometers_per_second ?? NaN);
    return [
      n?.name ?? '—',
      ca?.close_approach_date ?? '—',
      Number.isFinite(lunar) ? lunar.toFixed(2) : '—',
      Number.isFinite(vel) ? vel.toFixed(1) : '—',
      Math.round(dia(n)),
      n?.is_potentially_hazardous_asteroid ? 'YES' : 'no'
    ];
  })
});

// 6. Hazardous asteroid cards
await widget('cards', {
  items: hazardous.slice(0, 6).map(n => {
    const lunar = ld(n);
    return {
      title: n?.name ?? '—',
      subtitle: n?.close_approach_data?.[0]?.close_approach_date ?? '—',
      description: `${Math.round(dia(n))} m, ${Number.isFinite(lunar) ? lunar.toFixed(2) : '—'} LD`
    };
  })
});
```

## Examples

### This week (default)
```js
const today = new Date().toISOString().slice(0, 10);
const wk    = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
const data = await call('nasa_neo', { start_date: today, end_date: wk }).catch(() => null);
const all  = Object.values(data?.near_earth_objects ?? {}).flat().filter(n => n);
await widget('stat-card', { label: 'NEO', value: all.length });
await widget('table', { columns: ['Name', 'Date', 'LD'], rows: all.map(n => {
  const lunar = +(n?.close_approach_data?.[0]?.miss_distance?.lunar ?? NaN);
  return [n?.name ?? '—', n?.close_approach_data?.[0]?.close_approach_date ?? '—', Number.isFinite(lunar) ? lunar.toFixed(2) : '—'];
}) });
```

### A historical week
```js
const data = await call('nasa_neo', { start_date: '2013-02-13', end_date: '2013-02-19' }).catch(() => null);
const all  = Object.values(data?.near_earth_objects ?? {}).flat().filter(n => n);
await widget('stat-card', { label: 'Historical NEO', value: all.length });
await widget('cards', { items: all.filter(n => n?.is_potentially_hazardous_asteroid).map(n => ({ title: n?.name ?? '—', subtitle: n?.close_approach_data?.[0]?.close_approach_date ?? '—' })) });
```

## Common mistakes

- Asking ranges longer than 7 days — the API rejects it, paginate week by week
- Using miss distance in km — lunar distances (LD) are far more readable for the public
- Showing all NEOs as hazardous — typically <5% are flagged, highlight the flag explicitly
- Forgetting the scatter colour — without colour the chart hides the dangerous outliers
- Using `name_limited` instead of `name` — `name` is the canonical designation
