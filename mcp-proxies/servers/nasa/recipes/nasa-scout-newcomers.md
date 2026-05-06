---
id: nasa-scout-newcomers
name: Newly detected NEO candidates (Scout / NEOCP)
description: Recently spotted candidates Scout is tracking before official confirmation
when: the user asks about newly discovered asteroids, NEOCP candidates, or unconfirmed objects
servers: [nasa]
tools_used: [jpl_scout]
data_type: pre-confirmation candidates
components_used: [stat-card, cards, table, kv]
layout:
  type: stack
  arrangement: KPI stat-cards on top, candidate cards, ephemeris table, kv detail
---

## When to use

The user wonders what is fresh:
- "Newly detected asteroids"
- "NEOCP candidates today"
- "Unconfirmed near-earth objects"
- "What objects is Scout tracking right now?"

Scout follows the Minor Planet Center's NEO Confirmation Page in real time, computing preliminary orbits and very-short-term impact risk. Most candidates either become confirmed asteroids or vanish within 48-72h.

## How to use

```js
// 1. Get the current Scout list
const list = await call('jpl_scout', { limit: 30, summary: true }).catch(() => null);
const objects = (list?.data ?? []).filter(o => o);
if (objects.length === 0) return widget('text', { content: 'No active Scout candidates.' });

// 2. KPI stat-cards
const risky = objects.filter(o => +(o?.ip ?? 0) > 0).length;
const newest = objects[0];
await widget('stat-card', { label: 'Active candidates', value: objects.length, icon: 'sparkles' });
await widget('stat-card', { label: 'With non-zero IP', value: risky, icon: 'alert' });
await widget('stat-card', { label: 'Latest', value: newest?.tdes ?? '—', icon: 'clock' });

// 3. Candidate cards
await widget('cards', {
  items: objects.slice(0, 8).map(o => ({
    title: o?.tdes ?? '—',
    subtitle: `H ≈ ${o?.h ?? '—'} · rate ${o?.rate ?? '—'} arcsec/min`,
    description: `${o?.nobs ?? '?'} observations · IP ${o?.ip ?? 0}`
  }))
});

// 4. Detail call for the most observed candidate (ephemerides)
const detail = newest?.tdes ? await call('jpl_scout', { tdes: newest.tdes, file: 'summary' }).catch(() => null) : null;

await widget('data-table', {
  columns: ['UT date', 'RA', 'Dec', 'V mag', 'Rate'],
  rows: (detail?.eph ?? []).slice(0, 10).map(e => [e?.utc ?? '—', e?.ra ?? '—', e?.dec ?? '—', e?.vmag ?? '—', e?.rate ?? '—'])
});

// 5. Selection criteria + caveats
await widget('kv', {
  items: [
    { label: 'Source', value: 'Minor Planet Center NEOCP' },
    { label: 'Confirmation horizon', value: '48-72h typical' },
    { label: 'Caveat', value: 'Orbits are preliminary' }
  ]
});
```

## Examples

### Active list
```js
const list = await call('jpl_scout', { limit: 20, summary: true }).catch(() => null);
const data = (list?.data ?? []).filter(o => o);
const items = data.slice(0, 5).map(o => ({ title: o?.tdes ?? '—', subtitle: 'H ' + (o?.h ?? '—') }));
await widget('stat-card', { label: 'Candidates', value: Math.max(data.length, 1) });
await widget('cards', { items: items.length ? items : [{ title: 'Scout candidate (preview)', subtitle: 'Run live for the active list' }] });
```

### Drill into one candidate
```js
const det = await call('jpl_scout', { tdes: 'P21Eolo', file: 'all' }).catch(() => null);
const eph = (det?.eph ?? []).filter(e => e);
const rows = eph.slice(0, 12).map(e => [e?.utc ?? '—', e?.ra ?? '—', e?.dec ?? '—', e?.vmag ?? '—']);
await widget('data-table', { columns: ['UT', 'RA', 'Dec', 'V'], rows: rows.length ? rows : [['—', '—', '—', '—']] });
await widget('kv', { items: [{ label: 'Object', value: 'P21Eolo' }, { label: 'Observations', value: det?.nobs ?? '—' }] });
```

## Common mistakes

- Treating Scout candidates as confirmed — they are *temporary* designations, most disappear within days
- Using `ip` from Scout interchangeably with Sentry IP — Scout estimates short-term (days), Sentry covers a century
- Forgetting to set `summary: true` — without it the response can be huge with full ephemerides for every object
- Caching the result — Scout updates every few minutes; refresh on each user interaction
- Asking for `tdes` of an object that has been confirmed and removed — the call 404s, fall back to `jpl_sbdb`
