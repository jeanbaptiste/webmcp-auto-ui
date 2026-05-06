---
id: nasa-donki-space-weather
name: Space weather timeline (DONKI)
description: Solar flares and CMEs in chronology, intensity chart and event cards
when: the user asks about solar flares, CMEs, geomagnetic storms or space weather
servers: [nasa]
tools_used: [nasa_donki]
data_type: heliospheric events
components_used: [timeline, cards, chart, stat-card]
layout:
  type: stack
  arrangement: KPI stat-cards, intensity chart, timeline, event cards
---

## When to use

The user is interested in the Sun's activity:
- "Solar flares this week"
- "Recent coronal mass ejections"
- "Geomagnetic storm warning"
- "Space weather April 2026"

DONKI categorises events as FLR, CME, IPS, GST, MPC, RBE, SEP — each with start time and intensity.

## How to use

```js
// 1. Fetch flares for a recent window (other types: CME, GST, SEP, IPS)
const raw = await call('nasa_donki', {
  type: 'FLR',
  startDate: '2026-04-01',
  endDate:   '2026-04-29'
}).catch(() => null);
const events = (Array.isArray(raw) ? raw : (raw?.items ?? raw?.results ?? raw?.events ?? Object.values(raw ?? {})[0] ?? [])).filter(e => e);
if (events.length === 0) return widget('text', { content: 'No DONKI events in this window.' });

// 2. KPI
const xClass = events.filter(e => (e?.classType ?? '').startsWith('X')).length;
const mClass = events.filter(e => (e?.classType ?? '').startsWith('M')).length;
await widget('stat-card', { label: 'Flares', value: events.length, icon: 'sun' });
await widget('stat-card', { label: 'X-class', value: xClass, icon: 'zap' });
await widget('stat-card', { label: 'M-class', value: mClass, icon: 'flash' });

// 3. Intensity ranking (sorted by class, displayed as cards — chart/scatter not available in this CE)
const score = c => {
  if (!c) return 0;
  const m = c.match(/([ABCMX])([\d.]+)/);
  if (!m) return 0;
  const base = { A: 0, B: 1, C: 2, M: 3, X: 4 }[m[1]] || 0;
  return base + (parseFloat(m[2]) || 0) / 10;
};
const ranked = [...events.filter(e => e?.classType)].sort((a, b) => score(b.classType) - score(a.classType)).slice(0, 5);
await widget('cards', {
  items: ranked.map(e => ({
    title: e.classType,
    subtitle: (e?.peakTime || e?.beginTime || '').slice(0, 16),
    description: `AR${e?.activeRegionNum ?? '?'} — ${e?.sourceLocation ?? '?'}`
  }))
});

// 4. Timeline
await widget('timeline', {
  events: events.map(e => ({
    date: (e?.peakTime || e?.beginTime || '').slice(0, 16),
    title: `${e?.classType || 'Flare'} — ${e?.sourceLocation || 'Sun'}`,
    description: e?.activeRegionNum ? `Active region AR${e.activeRegionNum}` : ''
  }))
});

// 5. Cards for the strongest flares
const strongest = [...events].sort((a, b) => score(b?.classType) - score(a?.classType)).slice(0, 5);
await widget('cards', {
  items: strongest.map(e => ({
    title: e?.classType || 'Flare',
    subtitle: (e?.peakTime || e?.beginTime || '').slice(0, 16),
    description: e?.note || `Source ${e?.sourceLocation ?? '?'}, AR${e?.activeRegionNum ?? '?'}`
  }))
});
```

## Examples

### Recent CMEs
```js
const raw = await call('nasa_donki', { type: 'CME', startDate: '2024-04-01', endDate: '2024-04-30' }).catch(() => null);
const cmes = (Array.isArray(raw) ? raw : (raw?.body ?? raw?.items ?? raw?.results ?? Object.values(raw ?? {})[0] ?? [])).filter(c => c);
const events = cmes.map(c => ({ date: c?.startTime?.slice(0, 16) ?? '—', title: 'CME', description: c?.sourceLocation ?? '—' }));
await widget('stat-card', { label: 'CMEs', value: cmes.length });
await widget('timeline', { events: events.length ? events : [{ date: '—', title: 'CME (preview)', description: 'Run live for events' }] });
```

### Geomagnetic storms last quarter
```js
const raw = await call('nasa_donki', { type: 'GST', startDate: '2024-01-01', endDate: '2024-03-31' }).catch(() => null);
const gst = (Array.isArray(raw) ? raw : []).filter(g => g);
const items = gst.map(g => ({ title: 'GST', subtitle: g?.startTime?.slice(0, 16) ?? '—', description: 'Kp ' + (g?.allKpIndex?.[0]?.kpIndex ?? '?') }));
await widget('cards', { items: items.length ? items : [{ title: 'GST (preview)', subtitle: '—', description: 'Run live to see Kp index' }] });
```

## Common mistakes

- Asking `type: 'all'` — DONKI requires a specific type, loop over types if you need everything
- Mishandling missing classType — many flares have no class assigned, skip them in the intensity chart
- Date formats — startDate/endDate are `YYYY-MM-DD`, *not* ISO timestamps
- Calling without dates — DONKI defaults to the past 30 days, which can surprise users
- Comparing X-class numbers linearly — the scale is logarithmic, encode it before charting
