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
const sentry = await call('jpl_sentry', { limit: 50 }).catch(() => null);
const raw    = sentry?.data ?? sentry?.results ?? (Array.isArray(sentry) ? sentry : []);
const rows   = raw.filter(r => r);
if (rows.length === 0) return widget('text', { content: 'Sentry list is empty or unavailable.' });

// 2. Enrich top-5 with SBDB (diameter, fullname)
const top5 = rows.slice(0, 5);
const enriched = await Promise.all(
  top5.map(r => r?.des ? call('jpl_sbdb', { sstr: r.des }).catch(() => null) : Promise.resolve(null))
);
const diam = enriched.map(s => (s?.phys_par ?? []).find(p => p?.name === 'diameter')?.value);

// 3. KPIs
const ipVals = rows.map(r => +(r?.ip ?? 0)).filter(Number.isFinite);
const psVals = rows.map(r => +(r?.ps_cum ?? -99)).filter(Number.isFinite);
const ipMax = ipVals.length > 0 ? Math.max(...ipVals) : 0;
const psMax = psVals.length > 0 ? Math.max(...psVals) : 0;
const recent = rows.filter(r => +(r?.year_range?.split('-')?.[0] ?? 9999) <= 2050).length;
await widget('stat-card', { label: 'Monitored', value: rows.length, icon: 'shield' });
await widget('stat-card', { label: 'Max IP', value: ipMax.toExponential(2), icon: 'alert' });
await widget('stat-card', { label: 'Max Palermo', value: psMax.toFixed(2), icon: 'gauge' });
await widget('stat-card', { label: 'Within 2050', value: recent, icon: 'calendar' });

// 4. Top objects by cumulative impact probability
const chartRows = rows.filter(r => Number.isFinite(+r?.ip)).slice(0, 15);
await widget('chart', {
  bars: chartRows.map(r => [r?.des ?? '—', +r.ip])
});

// 5. Ranked table
await widget('data-table', {
  columns: ['Designation', 'Years', 'IP', 'Palermo', 'Torino', 'H', 'V-inf (km/s)'],
  rows: rows.map(r => [r?.des ?? '—', r?.year_range ?? '—', r?.ip ?? '—', r?.ps_cum ?? '—', r?.ts_max ?? 0, r?.h ?? '—', r?.v_inf ?? '—'])
});

// 6. Top-3 cards with diameter
await widget('cards', {
  items: top5.slice(0, 3).map((r, i) => ({
    title: r?.fullname || r?.des || '—',
    subtitle: `IP ${r?.ip ?? '—'} · Palermo ${r?.ps_cum ?? '—'}`,
    description: diam[i] ? `Diameter ≈ ${diam[i]} km, monitored ${r?.year_range ?? '—'}` : `Monitored ${r?.year_range ?? '—'}`
  }))
});
```

## Examples

### Default top 50
```js
const sentry = await call('jpl_sentry', { limit: 50 }).catch(() => null);
const raw  = sentry?.data ?? sentry?.results ?? (Array.isArray(sentry) ? sentry : []);
const data = raw.filter(r => r);
const rows = data.map(r => [r?.des ?? '—', r?.ip ?? '—', r?.ps_cum ?? '—', r?.h ?? '—']);
await widget('stat-card', { label: 'Sentry list', value: data.length });
await widget('data-table', { columns: ['Des', 'IP', 'PS', 'H'], rows: rows.length ? rows : [['101955 Bennu', '5.7e-04', '-1.41', '20.21']] });
```

### Filter on Palermo > -3
```js
const sentry = await call('jpl_sentry', { ps_min: '-3', limit: 30 }).catch(() => null);
const raw  = sentry?.data ?? sentry?.results ?? (Array.isArray(sentry) ? sentry : []);
const data = raw.filter(r => r);
const items = data.slice(0, 5).map(r => ({ title: r?.des ?? '—', subtitle: 'PS ' + (r?.ps_cum ?? '—'), description: 'Years ' + (r?.year_range ?? '—') }));
await widget('cards', { items: items.length ? items : [{ title: '101955 Bennu', subtitle: 'PS -1.41', description: 'Years 2178-2290' }] });
```

## Common mistakes

- Treating IP as percentage — Sentry returns probabilities like `2.7e-05`, multiply by 100 only if labelling as %
- Hiding the Palermo Scale — IP without PS is misleading (a 1-in-million event over a tiny rock is irrelevant)
- Forgetting that Sentry removes objects after re-observation — always show the date the list was queried
- Calling `jpl_sbdb` for every row — keep enrichment to top-N (5-10) to stay fast
- Confusing Torino and Palermo — Torino is a 0-10 public scale, Palermo is a logarithmic scientific one
