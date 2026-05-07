---
id: nasa-asteroid-profile
name: Full asteroid profile (orbit, close approaches, impact risk)
description: Composite profile combining SBDB orbit, JPL CAD approaches and Sentry risk
when: the user asks for everything on an asteroid like Bennu, Apophis, Eros or 433
servers: [nasa]
tools_used: [jpl_sbdb, jpl_cad, jpl_sentry]
data_type: monographic asteroid dossier
components_used: [profile, kv, chart, table, text]
layout:
  type: stack
  arrangement: profile header, kv orbital elements + chart, table of close approaches, text Sentry summary
---

## When to use

The user asks for the full file on a specific asteroid:
- "Tell me everything about Apophis"
- "Bennu profile"
- "433 Eros — orbit, approaches, risk"
- "Is asteroid 2024 YR4 dangerous?"

The recipe blends three JPL endpoints: SBDB (orbital + physical), CAD (close approaches), Sentry (impact risk if any).

## How to use

```js
const target = 'Apophis';

// 1. Orbital + physical data, with embedded close-approach summary
const sbdb = await call('jpl_sbdb', { sstr: target, cad: true }).catch(() => null);
if (!sbdb) return widget('text', { content: `Asteroid "${target}" not found.` });
const des  = sbdb?.object?.des;          // designation, e.g. "99942"
const orb  = sbdb?.orbit?.elements ?? [];
const phys = sbdb?.phys_par ?? [];
const get  = (arr, name) => (arr ?? []).find(e => e?.name === name)?.value;

// 2. Detailed upcoming close approaches
const cad = des ? await call('jpl_cad', {
  des,
  date_min: 'now',
  date_max: '2100-01-01',
  dist_max: '0.2',
  sort: 'date'
}).catch(() => null) : null;

// 3. Sentry impact risk (may be empty for safe objects)
const sentry = des ? await call('jpl_sentry', { des }).catch(() => null) : null;

// 4. Profile header
await widget('profile', {
  name: sbdb?.object?.fullname || target,
  fields: [
    { label: 'Class', value: `${sbdb?.object?.orbit_class?.name ?? ''} — ${sbdb?.object?.kind ?? 'asteroid'}` },
    { label: 'Flags', value: [sbdb?.object?.neo ? 'NEO' : null, sbdb?.object?.pha ? 'PHA' : null, sentry ? 'Sentry-monitored' : null].filter(Boolean).join(', ') || 'none' }
  ]
});

// 5. Orbital + physical kv
await widget('kv', {
  rows: [
    ['Semi-major axis (au)', String(get(orb, 'a') ?? '—')],
    ['Eccentricity',         String(get(orb, 'e') ?? '—')],
    ['Inclination (deg)',    String(get(orb, 'i') ?? '—')],
    ['Period (yr)',          String(get(orb, 'per_y') || get(orb, 'per') || '—')],
    ['Diameter (km)',        String(get(phys, 'diameter') ?? '—')],
    ['Albedo',               String(get(phys, 'albedo') ?? '—')]
  ]
});

// 6. Orbit chart — semi-major axis (au) per body as bar chart
const ax = +(get(orb, 'a') ?? NaN);
if (Number.isFinite(ax)) {
  await widget('chart', {
    bars: [
      ['Mercury', 0.387],
      ['Earth',   1.0],
      ['Mars',    1.524],
      [target,    ax]
    ]
  });
}

// 7. Close approaches table
const cadData = cad?.data ?? [];
const rows = cadData.slice(0, 20).map(d => [d?.[3] ?? '—', d?.[4] ?? '—', d?.[7] ?? '—', d?.[10] ?? '—']);
await widget('data-table', {
  columns: ['Body', 'Date (TDB)', 'Distance (au)', 'V-rel (km/s)'],
  rows: rows.length ? rows : [['Earth', '—', '—', '—']]
});

// 8. Sentry summary as prose
const sentryData = sentry?.data ?? [];
if (sentryData.length > 0) {
  const top = sentryData[0];
  await widget('text', {
    content: `Sentry impact risk — Cumulative impact probability: ${top?.ip ?? '—'}. Palermo Scale: ${top?.ps_cum ?? '—'}. Torino Scale: ${top?.ts_max ?? 0}. ${top?.n_imp ?? 0} virtual impactors monitored.`
  });
} else {
  await widget('text', { content: 'Sentry impact risk — Not currently in the Sentry monitoring list — no credible impact threat over the next century.' });
}
```

## Examples

### Bennu (OSIRIS-REx target)
```js
const sbdb = await call('jpl_sbdb', { sstr: 'Bennu', cad: true }).catch(() => null);
const cad  = await call('jpl_cad',  { des: '101955', date_max: '2200-01-01', dist_max: '0.2' }).catch(() => null);
const sentry = await call('jpl_sentry', { des: '101955' }).catch(() => null);
await widget('profile', { name: 'Bennu (101955)', fields: [{ label: 'Flags', value: 'NEO, PHA, Sentry-monitored' }] });
const rows = (cad?.data ?? []).slice(0, 10).map(r => [r?.[3] ?? '—', r?.[4] ?? '—']);
await widget('data-table', { columns: ['Date', 'Dist (au)'], rows });
```

### Eros (no impact risk)
```js
const sbdb = await call('jpl_sbdb', { sstr: '433' }).catch(() => null);
if (!sbdb) return widget('text', { content: 'Eros not found.' });
await widget('profile', { name: '433 Eros' });
const a = (sbdb?.orbit?.elements ?? []).find(e => e?.name === 'a')?.value ?? '—';
await widget('kv', { rows: [['a (au)', String(a)]] });
await widget('text', { content: 'Sentry — Eros is not Earth-crossing on relevant timescales.' });
```

## Common mistakes

- Calling `jpl_sentry` for every asteroid — most aren't in the list, wrap in try/catch
- Reading `sbdb.elements` directly — they are in `sbdb.orbit.elements` as `{ name, value }` pairs
- Showing the full CAD response (thousands of rows for old objects) — slice to next 20-50
- Using designation strings like "99942 Apophis" with `des` — SBDB accepts the name in `sstr`, but `des` for CAD/Sentry expects the bare number/designation (`99942` or `2004 MN4`)
- Mixing SPK-IDs and designations — pick one and reuse the value SBDB returns in `object.des`
