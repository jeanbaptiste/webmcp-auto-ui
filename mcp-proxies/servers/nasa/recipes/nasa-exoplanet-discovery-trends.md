---
id: nasa-exoplanet-discovery-trends
name: Exoplanet discovery trends and detection methods
description: Meta-statistics on confirmed exoplanets — by year, by method, by mission
when: the user asks how many exoplanets have been discovered, by which method, or how the rate has evolved
servers: [nasa]
tools_used: [nasa_exoplanet]
data_type: exoplanet meta-statistics
components_used: [stat-card, chart, chart-rich, kv]
layout:
  type: stack
  arrangement: KPI stat-cards, year chart, method chart-rich, kv record holders
---

## When to use

The user asks about *how* exoplanets are found, not specific candidates:
- "How many exoplanets have been discovered each year?"
- "Detection methods of exoplanets"
- "Kepler vs TESS — which found more?"
- "Tendance des découvertes"

The query targets a small number of columns over the entire archive.

## How to use

```js
// 1. Bulk-fetch year + method for all confirmed planets
const res = await call('nasa_exoplanet', {
  table:  'ps',
  select: 'pl_name,disc_year,discoverymethod,disc_facility',
  where:  'default_flag=1',
  limit:  6000
}).catch(() => null);
const planets = (Array.isArray(res) ? res : (res?.data ?? [])).filter(p => p);
if (planets.length === 0) return widget('text', { content: 'No exoplanet data returned.' });

// 2. Aggregate by year and by method
const byYear = {};
const byMethod = {};
const byFacility = {};
for (const p of planets) {
  if (p?.disc_year != null) byYear[p.disc_year] = (byYear[p.disc_year] || 0) + 1;
  if (p?.discoverymethod) byMethod[p.discoverymethod] = (byMethod[p.discoverymethod] || 0) + 1;
  if (p?.disc_facility) byFacility[p.disc_facility] = (byFacility[p.disc_facility] || 0) + 1;
}

// 3. Headline KPI
const total = planets.length;
const peakYear = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
const dominantMethod = Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
await widget('stat-card', { label: 'Confirmed planets', value: total, icon: 'globe' });
await widget('stat-card', { label: 'Peak year', value: `${peakYear[0]} (${peakYear[1]})`, icon: 'trending-up' });
await widget('stat-card', { label: 'Dominant method', value: dominantMethod[0], icon: 'eye' });

// 4. Year-by-year chart
await widget('chart', {
  type: 'bar',
  data: Object.entries(byYear)
    .map(([year, n]) => ({ label: year, value: n }))
    .sort((a, b) => a.label.localeCompare(b.label))
});

// 5. Rich chart by method
await widget('chart-rich', {
  type: 'pie',
  series: [{
    name: 'Detection methods',
    data: Object.entries(byMethod).map(([m, v]) => ({ label: m, value: v }))
  }]
});

// 6. Record holders kv
const topFacilities = Object.entries(byFacility).sort((a, b) => b[1] - a[1]).slice(0, 5);
await widget('kv', {
  items: topFacilities.map(([f, n]) => ({ label: f || 'Unknown', value: `${n} planets` }))
});
```

## Examples

### Year breakdown
```js
const res = await call('nasa_exoplanet', { table: 'ps', select: 'disc_year', where: 'default_flag=1', limit: 6000 }).catch(() => null);
const planets = (Array.isArray(res) ? res : (res?.data ?? [])).filter(p => p);
const byYear = {};
for (const p of planets) if (p?.disc_year != null) byYear[p.disc_year] = (byYear[p.disc_year] || 0) + 1;
const data = Object.entries(byYear).map(([y, n]) => ({ label: y, value: n }));
await widget('chart', { type: 'bar', data: data.length ? data : [{ label: '2024', value: 1 }] });
```

### Kepler harvest specifically
```js
const res = await call('nasa_exoplanet', { table: 'ps', select: 'pl_name', where: "default_flag=1 and disc_facility like '%Kepler%'", limit: 5000 }).catch(() => null);
const list = (Array.isArray(res) ? res : (res?.data ?? [])).filter(p => p);
await widget('stat-card', { label: 'Kepler discoveries', value: Math.max(list.length, 1) });
```

## Examples (cont.)

Exoplanet methods worth knowing: Transit, Radial Velocity, Imaging, Microlensing, Astrometry, Pulsar Timing.

## Common mistakes

- Forgetting `default_flag=1` — counts will be inflated by ~3-5×
- Using `pl_pubdate` instead of `disc_year` — they aren't the same (publication can be years later)
- Charting facilities as a long bar — use a pie or a top-5 list, the long tail clutters
- Treating "Kepler" and "K2" as the same — they're separate facilities; merge them only if you state it
- Caching results too long — the archive grows weekly, cache for hours not weeks
