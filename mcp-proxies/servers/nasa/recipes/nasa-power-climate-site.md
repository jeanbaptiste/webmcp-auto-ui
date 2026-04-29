---
id: nasa-power-climate-site
name: Climate report for a single site (NASA POWER)
description: Solar irradiance, temperature, wind and humidity series for one location
when: the user asks for solar resource, energy potential or climate data at a specific site
servers: [nasa]
tools_used: [nasa_power]
data_type: meteorological time series
components_used: [chart, chart-rich, stat-card, kv]
layout:
  type: stack
  arrangement: KPI stat-cards, rich irradiance chart, secondary chart, kv site descriptor
---

## When to use

The user asks for ground meteorological data:
- "Solar resource in Marrakech"
- "Wind potential on the Brittany coast"
- "POWER data for site at 31.6N 8.0W"
- "Annual irradiance at Berlin"

POWER returns daily/monthly series for hundreds of variables — perfect for site assessments.

## How to use

```js
// 1. Fetch a year of daily series
const lat = 31.6, lon = -8.0;
const data = await call('nasa_power', {
  parameters: 'ALLSKY_SFC_SW_DWN,T2M,WS10M,RH2M',
  community: 'RE',
  latitude: lat,
  longitude: lon,
  start: '20240101',
  end:   '20241231',
  format: 'json'
});

const series = data.properties?.parameter || {};
const dates = Object.keys(series.T2M || {});

// 2. Annual KPIs
const avg = obj => Object.values(obj).reduce((s, v) => s + v, 0) / Object.values(obj).length;
const sum = obj => Object.values(obj).reduce((s, v) => s + v, 0);
await widget('stat-card', { label: 'Avg T2M (°C)', value: avg(series.T2M).toFixed(1), icon: 'thermometer' });
await widget('stat-card', { label: 'Avg wind (m/s)', value: avg(series.WS10M).toFixed(2), icon: 'wind' });
await widget('stat-card', { label: 'Total irradiance (kWh/m²)', value: sum(series.ALLSKY_SFC_SW_DWN).toFixed(0), icon: 'sun' });
await widget('stat-card', { label: 'Avg humidity (%)', value: avg(series.RH2M).toFixed(0), icon: 'droplet' });

// 3. Rich irradiance chart
await widget('chart-rich', {
  type: 'area',
  series: [{
    name: 'Surface SW down (kWh/m²/day)',
    data: dates.map(d => ({ x: d, y: series.ALLSKY_SFC_SW_DWN[d] }))
  }],
  xLabel: 'Day', yLabel: 'kWh/m²/day'
});

// 4. Temperature + wind dual chart
await widget('chart', {
  type: 'line',
  series: [
    { name: 'T2M (°C)',     data: dates.map(d => ({ x: d, y: series.T2M[d] })) },
    { name: 'Wind (m/s)',   data: dates.map(d => ({ x: d, y: series.WS10M[d] })) }
  ]
});

// 5. Site descriptor
await widget('kv', {
  items: [
    { label: 'Latitude', value: lat },
    { label: 'Longitude', value: lon },
    { label: 'Period', value: '2024-01-01 → 2024-12-31' },
    { label: 'Community', value: 'Renewable Energy' }
  ]
});
```

## Examples

### Marrakech 2024
```js
const d = await call('nasa_power', { parameters: 'ALLSKY_SFC_SW_DWN', community: 'RE', latitude: 31.6, longitude: -8.0, start: '20240101', end: '20241231' });
const s = d.properties.parameter.ALLSKY_SFC_SW_DWN;
await widget('chart-rich', { type: 'area', series: [{ name: 'Solar', data: Object.entries(s).map(([d, v]) => ({ x: d, y: v })) }] });
```

### Berlin temperature record
```js
const d = await call('nasa_power', { parameters: 'T2M_MAX', community: 'AG', latitude: 52.5, longitude: 13.4, start: '20200101', end: '20241231' });
const s = d.properties.parameter.T2M_MAX;
await widget('stat-card', { label: 'Hottest day (°C)', value: Math.max(...Object.values(s)).toFixed(1) });
```

## Common mistakes

- Date format — POWER expects `YYYYMMDD`, not `YYYY-MM-DD`
- Wrong community — `RE` (renewables), `AG` (agro), `SB` (sustainable buildings) — irradiance is in `RE`
- Asking too many parameters — keep it under ~6, the response grows fast
- Using `T2M` in Fahrenheit — values are Celsius
- Sums vs averages — irradiance is energy/day; multiply by days to get yearly kWh/m², don't average
