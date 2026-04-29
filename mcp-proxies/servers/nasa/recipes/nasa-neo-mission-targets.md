---
id: nasa-neo-mission-targets
name: Human-accessible NEO mission targets (NHATS)
description: Asteroids reachable by crewed missions ranked by delta-v and duration
when: the user asks which asteroids humans could visit, NHATS targets or human missions to NEOs
servers: [nasa]
tools_used: [jpl_nhats, jpl_sbdb]
data_type: human mission planning catalogue
components_used: [table, kv, chart, cards]
layout:
  type: grid
  columns: 2
  arrangement: KPI stat-card row, scatter chart, table left, top candidate cards right
---

## When to use

The user asks about feasibility of human visits to NEOs:
- "Which asteroids could humans visit?"
- "NHATS mission targets"
- "Reachable NEOs with low delta-v"
- "Crewed mission candidates 2030-2035"

NHATS keeps a catalogue of NEOs reachable with reasonable propellant + duration budgets — perfect for "could we go there?" questions.

## How to use

```js
// 1. Filter to a realistic crewed envelope
const data = await call('jpl_nhats', {
  dv: 6,         // ≤ 6 km/s total
  dur: 360,      // ≤ 360 days
  launch: '2030-2035'
});
const targets = data.data || [];

// 2. Rank
targets.sort((a, b) => +a.min_dv?.dv - +b.min_dv?.dv);

// 3. Enrich top-5 with SBDB
const top5 = targets.slice(0, 5);
const enriched = await Promise.all(
  top5.map(t => call('jpl_sbdb', { sstr: t.des }).catch(() => null))
);

// 4. KPIs
await widget('kv', {
  items: [
    { label: 'Targets', value: targets.length },
    { label: 'Min Δv (km/s)', value: targets[0]?.min_dv?.dv },
    { label: 'Min duration (d)', value: Math.min(...targets.map(t => +t.min_dur?.dur || Infinity)) },
    { label: 'Launch window', value: '2030-2035' }
  ]
});

// 5. Scatter Δv vs duration
await widget('chart', {
  type: 'scatter',
  data: targets.map(t => ({
    x: +t.min_dv?.dv,
    y: +t.min_dur?.dur,
    label: t.des,
    color: +t.min_dv?.dv < 5 ? '#16a34a' : '#3b82f6'
  })),
  xLabel: 'Min total Δv (km/s)',
  yLabel: 'Min mission duration (days)'
});

// 6. Sortable table
await widget('table', {
  columns: ['Designation', 'Min Δv (km/s)', 'Min duration (d)', 'H', 'OCC'],
  rows: targets.map(t => [t.des, t.min_dv?.dv, t.min_dur?.dur, t.h, t.occ])
});

// 7. Top-5 candidate cards
await widget('cards', {
  items: top5.map((t, i) => ({
    title: t.des,
    subtitle: `Δv ${t.min_dv?.dv} km/s · ${t.min_dur?.dur} d`,
    description: enriched[i]?.object?.orbit_class?.name || 'NEO'
  }))
});
```

## Examples

### Easiest reachable NEOs
```js
const data = await call('jpl_nhats', { dv: 5, dur: 270, launch: '2025-2030' });
await widget('kv', { items: [{ label: 'Easy targets', value: data.data.length }] });
await widget('cards', { items: data.data.slice(0, 3).map(t => ({ title: t.des, subtitle: 'Δv ' + t.min_dv.dv })) });
```

### Strict crewed budget
```js
const data = await call('jpl_nhats', { dv: 4, dur: 180 });
await widget('table', { columns: ['Des', 'Δv', 'Days'], rows: data.data.map(t => [t.des, t.min_dv.dv, t.min_dur.dur]) });
```

## Common mistakes

- Asking δv < 4 km/s — the API rejects values below 4 (no realistic crewed mission below that)
- Confusing total Δv with launch Δv — NHATS reports the total budget (out + in), not just departure
- Using `dur` < 60 — minimum mission duration is 60 days; shorter requests return empty
- Showing min Δv without the launch year — the same target has very different costs per launch window
- Not enriching with SBDB — `Δv 5 km/s for object 2009 BD` is far less compelling than `5 km/s for the 5-meter asteroid 2009 BD`
