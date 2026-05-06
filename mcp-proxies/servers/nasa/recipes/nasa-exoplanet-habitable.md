---
id: nasa-exoplanet-habitable
name: Habitable-zone exoplanets (Earth-likes nearby)
description: Custom Exoplanet Archive query rendered as table, scatter chart, cards and stats
when: the user asks for habitable exoplanets, Earth-like worlds or planets with mild temperatures
servers: [nasa]
tools_used: [nasa_exoplanet]
data_type: exoplanet catalogue subset
components_used: [stat-card, chart, table, cards]
layout:
  type: stack
  arrangement: KPI stat-cards, scatter chart, table, top candidate cards
---

## When to use

The user asks about habitable / Earth-like exoplanets:
- "Habitable exoplanets"
- "Earth-like planets nearby"
- "Worlds in the habitable zone"
- "Super-Earths under 50 parsecs"

The Exoplanet Archive lets users craft custom SQL-like queries — the recipe ships sensible presets.

## How to use

```js
// 1. Query the planetary systems table for habitable-zone candidates
const res = await call('nasa_exoplanet', {
  table:  'ps',
  select: 'pl_name,hostname,pl_rade,pl_eqt,sy_dist,discoverymethod,disc_year',
  where:  'default_flag=1 and pl_eqt between 200 and 320 and pl_rade between 0.5 and 1.6',
  order:  'sy_dist asc',
  limit:  60
}).catch(() => null);
const planets = (Array.isArray(res) ? res : (res?.data ?? [])).filter(p => p);
if (planets.length === 0) return widget('text', { content: 'No habitable candidates returned.' });

// 2. KPI stat-cards
const closest = planets[0];
const methods = new Set(planets.map(p => p?.discoverymethod).filter(Boolean));
const closestDist = +closest?.sy_dist;
await widget('stat-card', { label: 'Candidates', value: planets.length, icon: 'globe' });
await widget('stat-card', { label: 'Closest (pc)', value: Number.isFinite(closestDist) ? closestDist.toFixed(1) : '—', icon: 'map-pin' });
await widget('stat-card', { label: 'Detection methods', value: methods.size, icon: 'eye' });

// 3. Scatter: radius vs equilibrium temperature
await widget('chart', {
  type: 'scatter',
  data: planets.filter(p => Number.isFinite(+p?.pl_rade) && Number.isFinite(+p?.pl_eqt)).map(p => ({
    x: +p.pl_rade,
    y: +p.pl_eqt,
    label: p?.pl_name ?? '—',
    color: +p?.sy_dist < 20 ? '#16a34a' : '#3b82f6'
  })),
  xLabel: 'Radius (R⊕)',
  yLabel: 'Equilibrium T (K)'
});

// 4. Sortable table
await widget('data-table', {
  columns: ['Planet', 'Host', 'Radius (R⊕)', 'Teq (K)', 'Distance (pc)', 'Method', 'Year'],
  rows: planets.map(p => [p?.pl_name ?? '—', p?.hostname ?? '—', p?.pl_rade ?? '—', p?.pl_eqt ?? '—', p?.sy_dist ?? '—', p?.discoverymethod ?? '—', p?.disc_year ?? '—'])
});

// 5. Top candidate cards (closest)
await widget('cards', {
  items: planets.slice(0, 6).map(p => {
    const d = +p?.sy_dist;
    return {
      title: p?.pl_name ?? '—',
      subtitle: `${Number.isFinite(d) ? d.toFixed(1) : '—'} pc · ${p?.discoverymethod ?? '—'}`,
      description: `Radius ${p?.pl_rade ?? '—'} R⊕ · Teq ${p?.pl_eqt ?? '—'} K`
    };
  })
});
```

## Examples

### Earth twins
```js
const res = await call('nasa_exoplanet', {
  table: 'ps',
  select: 'pl_name,hostname,pl_rade,pl_eqt,sy_dist',
  where: 'default_flag=1 and pl_rade between 0.8 and 1.2 and pl_eqt between 250 and 310',
  limit: 30
}).catch(() => null);
const list = (Array.isArray(res) ? res : (res?.data ?? [])).filter(p => p);
const items = list.map(p => ({ title: p?.pl_name ?? '—', subtitle: 'd=' + (p?.sy_dist ?? '—') + ' pc' }));
await widget('cards', { items: items.length ? items : [{ title: 'Earth twin (preview)', subtitle: 'Run live for candidates' }] });
```

### Super-Earths within 20 pc
```js
const res = await call('nasa_exoplanet', {
  table: 'ps',
  select: 'pl_name,sy_dist,pl_rade',
  where: 'default_flag=1 and sy_dist < 20 and pl_rade between 1.2 and 2.0',
  limit: 50
}).catch(() => null);
const list = (Array.isArray(res) ? res : (res?.data ?? [])).filter(p => p);
const rows = list.map(p => [p?.pl_name ?? '—', p?.sy_dist ?? '—', p?.pl_rade ?? '—']);
await widget('data-table', { columns: ['Planet', 'd (pc)', 'R (R⊕)'], rows: rows.length ? rows : [['Super-Earth (preview)', '—', '—']] });
```

## Common mistakes

- Forgetting `default_flag=1` — without it the same planet appears multiple times (one row per study)
- Mixing `ps` and `pscomppars` tables — `ps` has multiple rows per planet, `pscomppars` is a curated single-row view
- Filtering on `pl_eqt < 300` for "habitable" — equilibrium T depends on albedo, widen the band to 200-320 K
- Using SQL injection-style strings — the API accepts ADQL-like `where`, keep quotes minimal
- Asking 5000 rows — start with `limit: 50` and refine; the response is heavy
