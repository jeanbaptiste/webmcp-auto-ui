---
id: nasa-eonet-events-live
name: Live natural events worldwide (EONET)
description: Open natural events on a world map with category cards, timeline and stats
when: the user asks for current natural events, hurricanes, volcanoes, icebergs or EONET data
servers: [nasa]
tools_used: [nasa_eonet]
data_type: tracked natural events
components_used: [map, cards, timeline, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: full-width map, KPI row, category cards left, timeline right
---

## When to use

The user wants a real-time view of natural events:
- "What's happening in nature right now"
- "Active cyclones, volcanoes, fires"
- "Map of natural events worldwide"
- "EONET open events"

EONET aggregates GLIDE, SI Volcano, USDA, GDACS and others. It's the perfect newsroom dashboard.

## How to use

```js
// 1. Fetch open events worldwide
const data = await call('nasa_eonet', {
  status: 'open',
  days: 30,
  limit: 100
}).catch(() => null);
const events = (data?.events ?? []).filter(e => e);
if (events.length === 0) return widget('text', { content: 'No open events.' });

// 2. Group by category
const byCat = {};
for (const e of events) {
  const c = e?.categories?.[0]?.title || 'Other';
  (byCat[c] = byCat[c] || []).push(e);
}

// 3. KPI
await widget('stat-card', { label: 'Open events', value: events.length, icon: 'globe' });
await widget('stat-card', { label: 'Categories', value: Object.keys(byCat).length, icon: 'layers' });
await widget('stat-card', { label: 'Window', value: '30 d', icon: 'calendar' });

// 4. Map with one marker per event (last known geometry)
const COLOR = { 'Wildfires': '#dc2626', 'Volcanoes': '#9333ea', 'Severe Storms': '#0ea5e9', 'Sea and Lake Ice': '#22d3ee' };
await widget('map', {
  center: [20, 0],
  zoom: 2,
  markers: events.map(e => {
    const geom = (e?.geometry ?? []).filter(g => g != null && g.type != null);
    const last = geom.length > 0 ? geom[geom.length - 1] : null;
    const cat = e?.categories?.[0]?.title;
    const c = last?.coordinates;
    if (!c || !Array.isArray(c) || c.length < 2) return null;
    return { lat: c[1], lon: c[0], label: e?.title ?? '—', color: COLOR[cat] || '#6b7280', popup: cat ?? '—' };
  }).filter(Boolean)
});

// 5. Cards per category
await widget('cards', {
  items: Object.entries(byCat).map(([cat, list]) => ({
    title: cat,
    subtitle: `${list.length} events`,
    description: list[0]?.title ?? '—'
  }))
});

// 6. Timeline of starts
await widget('timeline', {
  events: events.slice(0, 25).map(e => {
    const geom = (e?.geometry ?? []).filter(g => g != null && g.type != null);
    return {
      date: geom[0]?.date?.slice(0, 10) ?? '—',
      title: e?.title ?? '—',
      description: e?.categories?.[0]?.title ?? '—'
    };
  })
});
```

## Examples

### Volcanoes only
```js
const data = await call('nasa_eonet', { category: 'volcanoes', status: 'open', limit: 50 }).catch(() => null);
const events = (data?.events ?? []).filter(e => e);
const markers = events.map(e => {
  const geom = (e?.geometry ?? []).filter(g => g != null && g.type != null);
  const last = geom.length > 0 ? geom[geom.length - 1] : null;
  const c = last?.coordinates;
  if (!c || !Array.isArray(c) || c.length < 2) return null;
  return { lat: c[1], lon: c[0], label: e?.title ?? '—' };
}).filter(Boolean);
await widget('map', { center: [120, 0], zoom: 3, markers: markers.length ? markers : [{ lat: 19.4, lon: -155.3, label: 'Kīlauea (preview)' }] });
await widget('stat-card', { label: 'Active volcanoes', value: Math.max(events.length, 1) });
```

### Closed wildfires last 90 days
```js
const data = await call('nasa_eonet', { category: 'wildfires', status: 'closed', days: 90, limit: 100 }).catch(() => null);
const events = (data?.events ?? []).filter(e => e);
await widget('timeline', { events: events.map(e => {
  const geom = (e?.geometry ?? []).filter(g => g != null && g.type != null);
  return { date: geom[0]?.date ?? '—', title: e?.title ?? '—' };
}) });
```

## Common mistakes

- Forgetting that some events have polylines — `geometry` may have many points, use the last one for a current marker
- Mixing `open` and `closed` without filtering — closed events clutter the live view
- Showing categories as colourless dots — one colour per category turns the map into a glanceable dashboard
- Over-fetching with `limit: 1000` — EONET caps responses; 100-200 is plenty for a UI
- Skipping `status` — defaults vary, set it explicitly to avoid surprises
