---
id: nasa-horizons-ephemeris
name: Observer ephemeris for a solar-system body (JPL Horizons)
description: RA/Dec, magnitude and distance for a planet, comet or asteroid over a window
when: the user asks where a body will be, "where is Mars tonight?", or wants observation tips
servers: [nasa]
tools_used: [jpl_horizons]
data_type: observer ephemeris
components_used: [chart, kv, text, table]
layout:
  type: stack
  arrangement: kv mission descriptor, sky-track chart, daily table, observation tips text
---

## When to use

The user wants to know where to point a telescope:
- "Where will Mars be next week?"
- "Comet C/2023 A3 ephemeris"
- "Position of Jupiter tonight"
- "Saturn observability for May"

Horizons returns a text block with one line per step. The recipe parses it into a usable structure.

## How to use

```js
// 1. Fetch ephemeris for Mars, geocentric, daily for 7 days
const r = await call('jpl_horizons', {
  COMMAND: '499',
  EPHEM_TYPE: 'OBSERVER',
  CENTER: '500@399',
  START_TIME: '2026-04-29',
  STOP_TIME:  '2026-05-06',
  STEP_SIZE: '1d',
  QUANTITIES: '1,9,20,23',  // RA/Dec, V mag, dist, alt/az
  format: 'json'
}).catch(() => null);
if (!r) return widget('text', { content: 'Horizons request failed.' });

// 2. Parse the $$SOE...$$EOE block
const text = r?.result || r?.data || '';
const block = text.split('$$SOE')[1]?.split('$$EOE')[0] ?? '';
const rows = block.trim() ? block.trim().split('\n').map(line => line.trim().split(/\s+/)) : [];
if (rows.length === 0) return widget('text', { content: 'No ephemeris data parsed.' });

// 3. Mission descriptor
await widget('kv', {
  items: [
    { label: 'Target', value: 'Mars (499)' },
    { label: 'Center', value: 'Geocentric (Earth)' },
    { label: 'Window', value: '2026-04-29 → 2026-05-06' },
    { label: 'Step', value: '1 day' }
  ]
});

// 4. Sky-track chart (RA vs Dec)
await widget('chart', {
  type: 'line',
  data: rows.filter(c => Number.isFinite(parseFloat(c?.[2])) && Number.isFinite(parseFloat(c?.[3]))).map(c => ({
    x: parseFloat(c[2]),  // RA hours (or degrees)
    y: parseFloat(c[3]),  // Dec degrees
    label: c?.[0] ?? '—'
  })),
  xLabel: 'RA', yLabel: 'Dec'
});

// 5. Daily table
await widget('data-table', {
  columns: ['Date', 'RA', 'Dec', 'V mag', 'Distance (au)'],
  rows: rows.slice(0, 14).map(c => [c?.[0] ?? '—', (c?.[2] ?? '—') + ' ' + (c?.[3] ?? ''), c?.[4] ?? '—', c?.[5] ?? '—', c?.[6] ?? '—'])
});

// 6. Observation tips
await widget('text', {
  title: 'Observation tips',
  body: 'Mars rises east-southeast around local midnight. With V mag ~0.5 it is visible to the naked eye. A small telescope reveals the polar ice cap at high magnification. Best viewed when more than 30° above the horizon to minimise atmospheric extinction.'
});
```

## Examples

### Comet NEOWISE (historical)
```js
const r = await call('jpl_horizons', {
  COMMAND: 'C/2020 F3',
  EPHEM_TYPE: 'OBSERVER',
  CENTER: '500@399',
  START_TIME: '2020-07-10', STOP_TIME: '2020-07-25', STEP_SIZE: '1d',
  format: 'json'
}).catch(() => null);
await widget('kv', { items: [{ label: 'Target', value: 'C/2020 F3 (NEOWISE)' }] });
```

### Jupiter for the upcoming week from a city
```js
const r = await call('jpl_horizons', {
  COMMAND: '599',
  EPHEM_TYPE: 'OBSERVER',
  CENTER: 'coord@399',
  START_TIME: '2026-05-01', STOP_TIME: '2026-05-08', STEP_SIZE: '12h'
}).catch(() => null);
await widget('text', { title: 'Jupiter visibility', body: 'Rises after midnight, magnitude -2, easy naked-eye target.' });
```

## Common mistakes

- Using ID `4` instead of `499` for Mars — Horizons distinguishes barycentre (`4`) from the planet (`499`)
- Forgetting `CENTER` — defaults to geocentric, but observers want their topocentric site (`coord@399` with site lat/lon)
- Parsing without `$$SOE`/`$$EOE` markers — the text block must be sliced from those guards
- Asking `STEP_SIZE: '1m'` for a year — that's a million points; use coarser steps for long windows
- Mixing OBSERVER and VECTORS quantities — they don't share columns
