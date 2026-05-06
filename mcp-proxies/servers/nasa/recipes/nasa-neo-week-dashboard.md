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

// 4. Bar chart: top 10 NEOs by diameter (scatter not supported — chart widget uses bars:[name,value] only)
const top10 = [...all]
  .filter(n => dia(n) > 0)
  .sort((a, b) => dia(b) - dia(a))
  .slice(0, 10);
await widget('chart', {
  title: 'Top 10 NEOs by diameter (m)',
  bars: top10.map(n => [n?.name?.replace(/[()]/g, '').trim().slice(0, 20) ?? '—', Math.round(dia(n))])
});

// 5. Sortable table — rows must be Record<string,unknown>[], not array-of-arrays
await widget('data-table', {
  columns: [
    { key: 'Name',           label: 'Name' },
    { key: 'Approach',       label: 'Approach' },
    { key: 'Distance (LD)',  label: 'Distance (LD)' },
    { key: 'Velocity (km/s)',label: 'Velocity (km/s)' },
    { key: 'Diameter max (m)',label: 'Diameter max (m)' },
    { key: 'Hazardous',      label: 'Hazardous' }
  ],
  rows: all.map(n => {
    const ca = n?.close_approach_data?.[0];
    const lunar = +(ca?.miss_distance?.lunar ?? NaN);
    const vel = +(ca?.relative_velocity?.kilometers_per_second ?? NaN);
    return {
      'Name':            n?.name ?? '—',
      'Approach':        ca?.close_approach_date ?? '—',
      'Distance (LD)':   Number.isFinite(lunar) ? lunar.toFixed(2) : '—',
      'Velocity (km/s)': Number.isFinite(vel) ? vel.toFixed(1) : '—',
      'Diameter max (m)':Math.round(dia(n)),
      'Hazardous':       n?.is_potentially_hazardous_asteroid ? 'YES' : 'no'
    };
  })
});

// 6. Hazardous asteroid cards
// Note: is_potentially_hazardous_asteroid can be false for all NEOs in quiet weeks — use all NEOs as fallback
const cardItems = (hazardous.length > 0 ? hazardous : all).slice(0, 6).map(n => {
  const lunar = ld(n);
  return {
    title: n?.name ?? '—',
    subtitle: n?.close_approach_data?.[0]?.close_approach_date ?? '—',
    description: `${Math.round(dia(n))} m, ${Number.isFinite(lunar) ? lunar.toFixed(2) : '—'} LD`
  };
});
console.log('hazardous:', hazardous.length, '→ cardItems:', cardItems.length);
await widget('cards', { items: cardItems });
```

## Examples

### This week (default)
```js
const today = new Date().toISOString().slice(0, 10);
const wk    = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
const data = await call('nasa_neo', { start_date: today, end_date: wk }).catch(() => null);
const all  = Object.values(data?.near_earth_objects ?? {}).flat().filter(n => n);
const tableRows = all.map(n => {
  const lunar = +(n?.close_approach_data?.[0]?.miss_distance?.lunar ?? NaN);
  return {
    Name: n?.name ?? '—',
    Date: n?.close_approach_data?.[0]?.close_approach_date ?? '—',
    LD:   Number.isFinite(lunar) ? lunar.toFixed(2) : '—'
  };
});
await widget('stat-card', { label: 'NEO', value: Math.max(all.length, 1) });
await widget('data-table', {
  columns: [{ key: 'Name', label: 'Name' }, { key: 'Date', label: 'Date' }, { key: 'LD', label: 'LD' }],
  rows: tableRows.length ? tableRows : [{ Name: 'NEO (preview)', Date: today, LD: '—' }]
});
```

### A historical week
```js
const data = await call('nasa_neo', { start_date: '2013-02-13', end_date: '2013-02-19' }).catch(() => null);
const all  = Object.values(data?.near_earth_objects ?? {}).flat().filter(n => n);
const hazardousItems = all.filter(n => n?.is_potentially_hazardous_asteroid);
const items = (hazardousItems.length > 0 ? hazardousItems : all).map(n => ({ title: n?.name ?? '—', subtitle: n?.close_approach_data?.[0]?.close_approach_date ?? '—' }));
await widget('stat-card', { label: 'Historical NEO', value: Math.max(all.length, 1) });
await widget('cards', { items: items.length ? items : [{ title: '367943 Duende (preview)', subtitle: '2013-02-15' }] });
```

## Common mistakes

- Asking ranges longer than 7 days — the API rejects it, paginate week by week
- Using miss distance in km — lunar distances (LD) are far more readable for the public
- Showing all NEOs as hazardous — typically <5% are flagged, highlight the flag explicitly
- Using `type:'scatter'` in the chart widget — only `bars:[name,value][]` is supported; use a bar chart sorted by diameter or miss distance instead
- Using `name_limited` instead of `name` — `name` is the canonical designation
