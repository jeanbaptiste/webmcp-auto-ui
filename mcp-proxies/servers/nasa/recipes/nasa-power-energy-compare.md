---
id: nasa-power-energy-compare
name: Compare renewable potential of multiple sites (POWER)
description: Multi-site map, overlaid charts and ranked table for solar/wind comparison
when: the user asks to compare two or more sites for solar, wind or PV potential
servers: [nasa]
tools_used: [nasa_power]
data_type: comparative climate series
components_used: [map, chart, stat-card, table]
layout:
  type: grid
  columns: 2
  arrangement: map of sites + ranking stat-card on top, comparison chart full-width, ranked table below
---

## When to use

The user wants a head-to-head comparison:
- "Compare PV potential between Brest and Marrakech"
- "Best solar site between three options"
- "Wind comparison Paris vs Lyon vs Bordeaux"
- "Where should I install panels?"

POWER doesn't compare natively — the recipe issues parallel calls and aligns the series.

## How to use

```js
const sites = [
  { name: 'Marrakech', lat: 31.6, lon: -8.0 },
  { name: 'Brest',     lat: 48.4, lon: -4.5 },
  { name: 'Athens',    lat: 38.0, lon: 23.7 }
];

// 1. Parallel calls
const results = await Promise.all(sites.map(s =>
  call('nasa_power', {
    parameters: 'ALLSKY_SFC_SW_DWN,WS10M',
    community: 'RE',
    latitude:  s.lat,
    longitude: s.lon,
    start: '20240101',
    end:   '20241231',
    format: 'json'
  })
));

// 2. Aggregate annual sums + averages
const summary = sites.map((s, i) => {
  const p = results[i].properties?.parameter || {};
  const irr = Object.values(p.ALLSKY_SFC_SW_DWN || {});
  const wind = Object.values(p.WS10M || {});
  return {
    ...s,
    annualIrr: irr.reduce((a, b) => a + b, 0),
    avgWind:   wind.reduce((a, b) => a + b, 0) / Math.max(1, wind.length),
    irrSeries: p.ALLSKY_SFC_SW_DWN || {}
  };
});
summary.sort((a, b) => b.annualIrr - a.annualIrr);

// 3. Map of sites
await widget('map', {
  center: [40, 5],
  zoom: 3,
  markers: summary.map(s => ({
    lat: s.lat, lon: s.lon,
    label: s.name,
    popup: `${s.annualIrr.toFixed(0)} kWh/m²/yr · wind ${s.avgWind.toFixed(1)} m/s`
  }))
});

// 4. Headline stat-card (top site)
await widget('stat-card', { label: 'Top solar site', value: summary[0].name, icon: 'sun' });

// 5. Overlaid chart
await widget('chart', {
  type: 'line',
  series: summary.map(s => ({
    name: s.name,
    data: Object.entries(s.irrSeries).map(([d, v]) => ({ x: d, y: v }))
  })),
  xLabel: 'Day', yLabel: 'kWh/m²/day'
});

// 6. Ranking table
await widget('table', {
  columns: ['Rank', 'Site', 'Latitude', 'Annual irradiance (kWh/m²)', 'Avg wind (m/s)'],
  rows: summary.map((s, i) => [i + 1, s.name, s.lat, s.annualIrr.toFixed(0), s.avgWind.toFixed(2)])
});
```

## Examples

### Three French cities
```js
const sites = [{name:'Brest',lat:48.4,lon:-4.5},{name:'Marseille',lat:43.3,lon:5.4},{name:'Lyon',lat:45.75,lon:4.85}];
const res = await Promise.all(sites.map(s => call('nasa_power', { parameters: 'ALLSKY_SFC_SW_DWN', community: 'RE', latitude: s.lat, longitude: s.lon, start: '20240101', end: '20241231' })));
const sums = sites.map((s, i) => ({ ...s, total: Object.values(res[i].properties.parameter.ALLSKY_SFC_SW_DWN).reduce((a, b) => a + b, 0) }));
await widget('table', { columns: ['City', 'kWh/m²/yr'], rows: sums.map(s => [s.name, s.total.toFixed(0)]) });
```

### Wind sites Atlantic vs Mediterranean
```js
const a = await call('nasa_power', { parameters: 'WS50M', community: 'RE', latitude: 47.5, longitude: -4.0, start: '20240101', end: '20241231' });
const m = await call('nasa_power', { parameters: 'WS50M', community: 'RE', latitude: 43.0, longitude: 4.5,  start: '20240101', end: '20241231' });
await widget('chart', { type: 'line', series: [
  { name: 'Atlantic', data: Object.entries(a.properties.parameter.WS50M).map(([d, v]) => ({ x: d, y: v })) },
  { name: 'Med.',     data: Object.entries(m.properties.parameter.WS50M).map(([d, v]) => ({ x: d, y: v })) }
]});
```

## Common mistakes

- Sequential calls instead of `Promise.all` — three sites become a 9-second wait
- Mixing parameters between calls — keep the same `parameters` string for fair comparison
- Comparing sites at different periods — use the exact same `start`/`end`
- Ranking by daily average instead of yearly sum — sum is the headline metric for energy
- Using `WS10M` for wind farms — turbines are at 50-100 m, prefer `WS50M`
