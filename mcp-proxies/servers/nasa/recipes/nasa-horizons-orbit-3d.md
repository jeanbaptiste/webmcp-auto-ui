---
id: nasa-horizons-orbit-3d
name: Plot a heliocentric orbit (state vectors via Horizons)
description: Cartesian state vectors transformed into an orbit projection chart with annotations
when: the user asks for an orbit plot, state vectors, trajectory of a probe or asteroid in 3D
servers: [nasa]
tools_used: [jpl_horizons, jpl_horizons_file]
data_type: cartesian state vectors
components_used: [chart, chart-rich, kv, text]
layout:
  type: stack
  arrangement: kv parameters, rich orbit chart, distance chart, didactic text
---

## When to use

The user wants the *shape* of an orbit, not just an ephemeris row:
- "Plot Ceres' orbit"
- "Trajectory of Voyager 1"
- "Asteroid 2024 YR4 orbit in 3D"
- "State vectors of comet Hale-Bopp"

Two tools cover this: `jpl_horizons` (URL-driven) and `jpl_horizons_file` (large queries via file payload).

## How to use

```js
// 1. Heliocentric state vectors of Ceres over 5 years, every 30 days
const r = await call('jpl_horizons', {
  COMMAND: '1',          // Ceres
  EPHEM_TYPE: 'VECTORS',
  CENTER: '@10',         // Sun
  START_TIME: '2026-01-01',
  STOP_TIME:  '2031-01-01',
  STEP_SIZE: '30d',
  OUT_UNITS: 'AU-D',
  format: 'json'
}).catch(() => null);
if (!r) return widget('text', { content: 'Horizons request failed.' });

// 2. Parse vectors block
const block = (r?.result ?? '').split('$$SOE')[1]?.split('$$EOE')[0] ?? '';
const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
const points = [];
for (let i = 0; i < lines.length; i += 4) {
  // Each ephemeris point spans 4 lines: header, X/Y/Z, VX/VY/VZ, LT/RG/RR
  const xyz = (lines[i + 1] ?? '').match(/-?\d+\.\d+E[+-]\d+/g);
  if (xyz && xyz.length >= 3) {
    points.push({ x: +xyz[0], y: +xyz[1], z: +xyz[2] });
  }
}
console.log('points:', points.length);
if (points.length === 0) return widget('text', { content: 'No vector data parsed.' });

// 3. Parameter kv
console.log('--- kv ---');
await widget('kv', {
  rows: [
    ['Target', '1 Ceres'],
    ['Center', 'Heliocentric (@10)'],
    ['Window', '2026-01-01 → 2031-01-01'],
    ['Step', '30 days'],
    ['Units', 'AU']
  ]
});

// 4. Orbit projection chart (X vs Y, ecliptic plane)
// chart-rich line mode: labels = X positions (au), one series per body
console.log('--- chart-rich ---');
// Sample every 5th point to keep the label array manageable
const sampled = points.filter((_, i) => i % 5 === 0);
await widget('chart-rich', {
  title: 'Ceres orbit — ecliptic projection (X vs Y, au)',
  type: 'line',
  labels: sampled.map(p => p.x.toFixed(2)),
  data: [
    { label: 'Y (au)', values: sampled.map(p => +p.y.toFixed(4)) }
  ]
});

// 5. Distance vs time — bars: [[label, value], ...]
console.log('--- chart ---');
const distBars = points
  .filter((_, i) => i % 3 === 0)
  .map((p, i) => [
    String(i * 90) + 'd',
    +Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z).toFixed(3)
  ]);
await widget('chart', {
  title: 'Heliocentric distance over time (au)',
  bars: distBars
});

// 6. Didactic text
console.log('--- text ---');
await widget('text', {
  content: 'The X-Y projection shows the orbit on the ecliptic plane. Distance from the Sun oscillates between perihelion and aphelion every ~4.6 years for Ceres. Tilt of the inclination is hidden in the Z component (not plotted here).'
});
```

## Examples

### Voyager 1 escape trajectory
```js
const r = await call('jpl_horizons', { COMMAND: '-31', EPHEM_TYPE: 'VECTORS', CENTER: '@10', START_TIME: '1977-09-05', STOP_TIME: '2026-01-01', STEP_SIZE: '180d', OUT_UNITS: 'AU-D' }).catch(() => null);
await widget('kv', { rows: [['Spacecraft', 'Voyager 1'], ['Window', '1977-2026']] });
```

### Long-period comet via file payload
```js
const r = await call('jpl_horizons_file', { COMMAND: 'C/1995 O1', EPHEM_TYPE: 'VECTORS', CENTER: '@10', START_TIME: '1995-01-01', STOP_TIME: '2030-01-01', STEP_SIZE: '30d' }).catch(() => null);
await widget('text', { content: 'Hale-Bopp — Highly eccentric orbit: perihelion 0.91 au, aphelion ~370 au.' });
```

## Common mistakes

- Using `CENTER: '500@399'` (Earth) for an orbit plot — you want heliocentric `@10`, not topocentric
- Treating Horizons output as JSON — even with `format: 'json'` the ephemeris payload is text inside `result`
- Wrong column count — VECTORS span multiple lines per epoch, not one
- Missing `OUT_UNITS` — defaults vary, set `AU-D` for orbits or `KM-S` for spacecraft missions
- Plotting only x vs y for highly inclined orbits — note the Z extent or warn the user
