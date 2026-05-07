---
id: wiki-place-map
name: Wikipedia place map
description: Carte d'un lieu géographique avec résumé encyclopédique et faits clés.
when: the user asks where a place is, to locate a landmark, or for a geographic article with map context
servers: [wikipedia]
tools_used: [get_coordinates, get_summary, extract_key_facts]
data_type: geo
components_used: [map, text, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: full-width map at top, summary text + kv metadata below, stat-cards row
---

## When to use

The user wants to locate and contextualize a geographic entity:
- "Où se trouve Petra ?"
- "Localise le château de Chambord"
- "Localise les pyramides de Gizeh"
- "Show me the Mont Saint-Michel on a map"

Combines coordinates with encyclopedic content in a single view.

## How to use

```js
// 1. Get coordinates (may return multiple — primary first)
const c = await call('get_coordinates', { title: 'Petra' }).catch(() => null);
const coords = c?.coordinates ?? [];
const primary = coords.find(x => x?.primary) || coords[0];
if (!primary || !Number.isFinite(primary?.latitude)) return widget('text', { content: 'Place not geolocated.' });

// 2. Get summary and key facts in parallel
const [sum, facts] = await Promise.all([
  call('get_summary', { title: 'Petra' }).catch(() => null),
  call('extract_key_facts', { title: 'Petra', count: 5 }).catch(() => null)
]);

// 3. Render the map
await widget('map', {
  center: [primary.longitude, primary.latitude],
  zoom: 13,
  markers: [{ lat: primary.latitude, lon: primary.longitude, label: c?.title ?? '—', popup: (sum?.summary ?? '').slice(0, 140) }]
});

// 4. Render summary + metadata + facts
await widget('text', { content: sum?.summary ?? '(no summary)' });
await widget('kv', {
  rows: [
    ['Country', primary?.country ?? '—'],
    ['Region', primary?.region ?? '—'],
    ['Type', primary?.type ?? '—'],
    ['Lat / Lon', `${primary.latitude.toFixed(4)}, ${primary.longitude.toFixed(4)}`]
  ]
});
await widget('stat-card', { label: 'Key facts', value: (facts?.facts ?? []).length, icon: 'star' });
```

## Examples

### Locate the Pyramids of Giza
```js
const c = await call('get_coordinates', { title: 'Giza pyramid complex' }).catch(() => null);
const sum = await call('get_summary', { title: 'Giza pyramid complex' }).catch(() => null);
const p = (c?.coordinates ?? [])[0];
if (!p) return widget('text', { content: 'Not geolocated.' });
await widget('map', {
  center: [p?.longitude, p?.latitude],
  zoom: 14,
  markers: [{ lat: p?.latitude, lon: p?.longitude, label: c?.title ?? '—' }]
});
await widget('text', { content: sum?.summary ?? '(no summary)' });
await widget('kv', { rows: [['Country', p?.country ?? '—'], ['Lat', p?.latitude ?? '—'], ['Lon', p?.longitude ?? '—']] });
```

### Locate Chambord with key facts
```js
const [c, sum, facts] = await Promise.all([
  call('get_coordinates', { title: 'Château de Chambord' }).catch(() => null),
  call('get_summary', { title: 'Château de Chambord' }).catch(() => null),
  call('extract_key_facts', { title: 'Château de Chambord', count: 6 }).catch(() => null)
]);
const coords = c?.coordinates ?? [];
const p = coords.find(x => x?.primary) || coords[0];
if (!p) return widget('text', { content: 'Not geolocated.' });
await widget('map', { center: [p?.longitude, p?.latitude], zoom: 14, markers: [{ lat: p?.latitude, lon: p?.longitude, label: c?.title ?? '—' }] });
await widget('text', { content: sum?.summary ?? '(no summary)' });
await widget('kv', { rows: (facts?.facts ?? []).map((f, i) => [`Fact ${i + 1}`, f]) });
```

## Common mistakes

- **Assuming `coordinates` is a single object**: it's an array — pick `primary === true` first, fallback to `[0]`
- **Forgetting that some articles have no coords**: `get_coordinates` may return `coordinates: []` (e.g. abstract concepts) — guard with a fallback
- **Using zoom 18 for a country**: pick zoom by entity type (city: 12, building: 17, region: 8)
- **Ignoring `globe`**: Wikipedia includes lunar/Mars coordinates ; check `globe === 'earth'` before plotting
- **Rendering raw `latitude`/`longitude` floats with 12 decimals** in kv — round to 4 for display
- **Calling the 3 tools sequentially**: parallelize with `Promise.all`
