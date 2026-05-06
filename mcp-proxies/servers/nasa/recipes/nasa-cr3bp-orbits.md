---
id: nasa-cr3bp-orbits
name: Periodic orbits in the circular restricted three-body problem
description: Halo, Lyapunov and DRO families around Lagrange points with stability table
when: the user asks for halo orbits, Lagrange-point trajectories, CR3BP families or Artemis/Gateway orbits
servers: [nasa]
tools_used: [jpl_periodic_orbits, jpl_jd_cal]
data_type: astrodynamics CR3BP families
components_used: [chart-rich, table, kv, text]
layout:
  type: stack
  arrangement: didactic text on top, family chart full-width, table of orbits, kv epoch helpers
---

## When to use

The user works on mission design or wants to understand Lagrange-point dynamics:
- "Halo orbits around Earth-Moon L2"
- "Lyapunov orbits Sun-Earth L1"
- "Distant retrograde orbits for Artemis"
- "Trajectoires CR3BP Earth-Moon"

The recipe pulls a family from the Three-Body Periodic Orbits database, optionally converting Julian-Day epochs via `jpl_jd_cal`.

## How to use

```js
// 1. Fetch a family (halo orbits at Earth-Moon L2, north branch)
const fam = await call('jpl_periodic_orbits', {
  sys: 'earth-moon',
  family: 'halo',
  libr: 2,
  branch: 'N'
}).catch(() => null);
console.log(fam);
const orbits = (fam?.data ?? []).filter(o => o);
if (!Array.isArray(fam?.data) || fam.data.length === 0) return widget('text', { content: 'No orbits returned.' });

// 2. Optional: convert reference Julian Day to a calendar date
const epoch = fam?.epoch_jd;
let calDate = null;
if (epoch) {
  const cal = await call('jpl_jd_cal', { jd: String(epoch) }).catch(() => null);
  calDate = cal?.cd ?? null;
}

// 3. Didactic text
await widget('text', {
  title: 'Earth-Moon L2 halo orbits',
  body: 'Halo orbits are 3-D periodic trajectories around collinear libration points. Earth-Moon L2 halo orbits underpin the Lunar Gateway design. Stability index < 1 means linearly stable; values >> 1 require frequent station-keeping.'
});

// 4. Family chart (period vs Jacobi constant, colour by stability)
await widget('chart-rich', {
  type: 'scatter',
  series: [{
    name: 'Halo L2 N',
    data: orbits.map(o => ({
      x: +(o?.period ?? 0),
      y: +(o?.jacobi ?? 0),
      label: o?.id || `orbit-${o?.idx ?? '?'}`,
      color: +(o?.stability ?? 99) < 1.5 ? '#16a34a' : (+(o?.stability ?? 99) < 5 ? '#f59e0b' : '#dc2626')
    }))
  }],
  xLabel: 'Period (TU)', yLabel: 'Jacobi constant',
  legend: ['stable', 'mild', 'unstable']
});

// 5. Sortable table
const tableRows = orbits.slice(0, 30).map((o, i) => [i + 1, o?.period ?? '—', o?.jacobi ?? '—', o?.stability ?? '—', o?.amplitude ?? '—']);
const allDash = tableRows.every(r => r.slice(1).every(v => v === '—'));
if (allDash) {
  await widget('text', { content: 'The API returned orbit records but no numeric fields (period/jacobi/stability/amplitude). Check that the correct field names are used for this family.' });
} else {
  await widget('data-table', {
    columns: ['#', 'Period', 'Jacobi C', 'Stability', 'Amplitude'],
    rows: tableRows
  });
}

// 6. kv with epoch helpers
await widget('kv', {
  items: [
    { label: 'System', value: 'Earth-Moon' },
    { label: 'Family', value: 'Halo (L2, N)' },
    { label: 'Orbits', value: orbits.length },
    { label: 'Reference epoch (JD)', value: epoch ?? 'n/a' },
    { label: 'Reference epoch (cal)', value: calDate ?? 'n/a' }
  ]
});
```

## Examples

### Sun-Earth L1 Lyapunov
```js
const fam = await call('jpl_periodic_orbits', { sys: 'sun-earth', family: 'lyapunov', libr: 1 }).catch(() => null);
await widget('text', { title: 'Sun-Earth L1 Lyapunov', body: 'Planar periodic orbits used for solar observatories like SOHO and DSCOVR.' });
const lyapunovRows = (fam?.data ?? []).slice(0, 20).map(o => [o?.period ?? '—', o?.jacobi ?? '—']);
if (!Array.isArray(fam?.data) || fam.data.length === 0) {
  await widget('text', { content: 'No Lyapunov orbit data returned for Sun-Earth L1. The API may require different field names for this family.' });
} else {
  await widget('data-table', { columns: ['Period', 'Jacobi'], rows: lyapunovRows });
}
```

### Distant Retrograde Orbits (Artemis)
```js
const fam = await call('jpl_periodic_orbits', { sys: 'earth-moon', family: 'dro' }).catch(() => null);
const cal = await call('jpl_jd_cal', { jd: String(fam?.epoch_jd ?? 2460676.5) }).catch(() => null);
const kvItems = [{ label: 'Family', value: 'Earth-Moon DRO' }, { label: 'Epoch', value: cal?.cd ?? '—' }].filter(item => item.value !== undefined && item.value !== null);
if (kvItems.length > 0) {
  await widget('kv', { items: kvItems });
} else {
  await widget('text', { content: 'DRO family loaded but no displayable metadata.' });
}
```

## Common mistakes

- Forgetting `libr` for collinear families — halo, Lyapunov, axial all require an explicit libration index (1-3)
- Forgetting `branch` for halo — north (N) and south (S) families are separate
- Mixing units of period — the API returns dimensionless time units (TU); convert with `periodunits: 'd'` if you need days
- Treating high stability as "good" — values >> 1 indicate unstable orbits requiring constant correction
- Hardcoding the Jacobi constant — it varies smoothly along the family, plot it instead of stating one value
