---
id: nasa-impact-risk-board
name: NEO impact-risk board (Sentry top objects)
description: Sentry-monitored asteroids ranked by Palermo and impact probability, enriched with SBDB sizes
when: the user asks for asteroids with impact risk, Sentry top, monitored objects, or "is X dangerous?"
servers: [nasa]
tools_used: [jpl_sentry, jpl_sbdb]
data_type: impact-risk leaderboard
components_used: [stat-card, table, chart, cards]
layout:
  type: grid
  columns: 4
  arrangement: 4 KPIs on top, scatter chart full-width, table + top-3 cards below
---

## When to use

The user wants the global picture of impact risk:
- "Asteroids at risk of impact"
- "Sentry top risks"
- "Which NEOs is NASA monitoring?"
- "Most dangerous asteroids"

Sentry maintains a list of objects with non-zero cumulative impact probability over the next century. The recipe is the dashboard for that list.

## How to use

```js
// 1. Top of the Sentry list
const sentry = await call('jpl_sentry', { limit: 50 });
const rows   = sentry.data || [];

// 2. Enrich top-5 with SBDB (diameter, fullname)
const top5 = rows.slice(0, 5);
const enriched = await Promise.all(
  top5.map(r => call('jpl_sbdb', { sstr: r.des }).catch(() => null))
);
const diam = enriched.map(s => s?.phys_par?.find(p => p.name === 'diameter')?.value);

// 3. KPIs
const ipMax = Math.max(...rows.map(r => +r.ip));
const psMax = Math.max(...rows.map(r => +r.ps_cum));
const recent = rows.filter(r => +r.year_range?.split('-')[0] <= 2050).length;
await widget('stat-card', { label: 'Monitored', value: rows.length, icon: 'shield' });
await widget('stat-card', { label: 'Max IP', value: ipMax.toExponential(2), icon: 'alert' });
await widget('stat-card', { label: 'Max Palermo', value: psMax.toFixed(2), icon: 'gauge' });
await widget('stat-card', { label: 'Within 2050', value: recent, icon: 'calendar' });

// 4. Scatter — size proxy (H magnitude) vs cumulative impact probability
await widget('chart', {
  type: 'scatter',
  data: rows.map(r => ({
    x: +r.h,
    y: +r.ip,
    label: r.des,
    color: +r.ps_cum > -2 ? '#dc2626' : '#3b82f6'
  })),
  xLabel: 'H (absolute magnitude, smaller = larger object)',
  yLabel: 'Cumulative impact probability',
  yLog: true
});

// 5. Ranked table
await widget('table', {
  columns: ['Designation', 'Years', 'IP', 'Palermo', 'Torino', 'H', 'V-inf (km/s)'],
  rows: rows.map(r => [r.des, r.year_range, r.ip, r.ps_cum, r.ts_max ?? 0, r.h, r.v_inf])
});

// 6. Top-3 cards with diameter
await widget('cards', {
  items: top5.slice(0, 3).map((r, i) => ({
    title: r.fullname || r.des,
    subtitle: `IP ${r.ip} · Palermo ${r.ps_cum}`,
    description: diam[i] ? `Diameter ≈ ${diam[i]} km, monitored ${r.year_range}` : `Monitored ${r.year_range}`
  }))
});
```

## Examples

### Default top 50
```js
const sentry = await call('jpl_sentry', { limit: 50 });
await widget('stat-card', { label: 'Sentry list', value: sentry.data.length });
await widget('table', { columns: ['Des', 'IP', 'PS', 'H'], rows: sentry.data.map(r => [r.des, r.ip, r.ps_cum, r.h]) });
```

### Filter on Palermo > -3
```js
const sentry = await call('jpl_sentry', { ps_min: '-3', limit: 30 });
await widget('cards', { items: sentry.data.slice(0, 5).map(r => ({ title: r.des, subtitle: 'PS ' + r.ps_cum, description: 'Years ' + r.year_range })) });
```

## Common mistakes

- Treating IP as percentage — Sentry returns probabilities like `2.7e-05`, multiply by 100 only if labelling as %
- Hiding the Palermo Scale — IP without PS is misleading (a 1-in-million event over a tiny rock is irrelevant)
- Forgetting that Sentry removes objects after re-observation — always show the date the list was queried
- Calling `jpl_sbdb` for every row — keep enrichment to top-N (5-10) to stay fast
- Confusing Torino and Palermo — Torino is a 0-10 public scale, Palermo is a logarithmic scientific one
