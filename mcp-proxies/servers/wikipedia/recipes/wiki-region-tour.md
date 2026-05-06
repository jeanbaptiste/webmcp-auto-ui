---
id: wiki-region-tour
name: Wikipedia region tour
description: Tour géographique d'une région — recherche thématique géolocalisée + carte + résumés.
when: the user asks for places to visit in an area, landmarks in a region, or a touristic encyclopedic tour
servers: [wikipedia]
tools_used: [search_wikipedia, get_coordinates, get_summary]
data_type: geo
components_used: [map, gallery, cards, table]
layout:
  type: grid
  columns: 2
  arrangement: full-width map at top, cards + table below
---

## When to use

The user wants a mini guide of an area, encyclopedia-style:
- "Lieux remarquables à Kyoto"
- "Sites historiques en Toscane"
- "Famous landmarks in Rome"
- "Châteaux de la Loire"

## How to use

1. **Search the theme**:
   ```js
   const res = await call('search_wikipedia', { query: 'temple Kyoto', limit: 12 }).catch(() => null);
   const hits = (res?.results ?? []).slice(0, 8);
   if (hits.length === 0) return widget('text', { content: 'No matches found.' });
   ```

2. **Fetch coordinates for each hit** in parallel (some have none):
   ```js
   const enriched = await Promise.all(hits.map(async h => {
     if (!h?.title) return null;
     const [c, s] = await Promise.all([
       call('get_coordinates', { title: h.title }).catch(() => null),
       call('get_summary', { title: h.title }).catch(() => null)
     ]);
     const coords = c?.coordinates ?? [];
     const p = coords.find(x => x?.primary) || coords[0];
     return (p && Number.isFinite(p?.latitude)) ? { title: h.title, lat: p.latitude, lon: p.longitude, summary: s?.summary ?? '' } : null;
   }));
   const places = enriched.filter(Boolean);
   if (places.length === 0) return widget('text', { content: 'No geolocated places.' });
   ```

3. **Compute map center** (mean of coords):
   ```js
   const cLat = places.reduce((s, p) => s + p.lat, 0) / places.length;
   const cLon = places.reduce((s, p) => s + p.lon, 0) / places.length;
   ```

4. **Render map + cards + table**:
   ```js
   await widget('map', {
     center: [cLon, cLat],
     zoom: 12,
     markers: places.map(p => ({ lat: p.lat, lon: p.lon, label: p.title, popup: (p.summary || '').slice(0, 120) }))
   });
   await widget('cards', {
     items: places.map(p => ({ title: p.title, body: (p.summary || '').slice(0, 160) }))
   });
   await widget('data-table', {
     columns: ['Place', 'Lat', 'Lon'],
     rows: places.map(p => [p.title, p.lat.toFixed(3), p.lon.toFixed(3)])
   });
   ```

## Examples

### Temples of Kyoto
```js
const res = await call('search_wikipedia', { query: 'temple Kyoto', limit: 10 }).catch(() => null);
const hits = (res?.results ?? []).slice(0, 6);
const places = (await Promise.all(hits.map(async h => {
  if (!h?.title) return null;
  const c = await call('get_coordinates', { title: h.title }).catch(() => null);
  const s = await call('get_summary', { title: h.title }).catch(() => null);
  const p = (c?.coordinates ?? [])[0];
  return (p && Number.isFinite(p?.latitude)) ? { title: h.title, lat: p.latitude, lon: p.longitude, summary: s?.summary ?? '' } : null;
}))).filter(Boolean);
if (places.length === 0) return widget('text', { content: 'No geolocated temples.' });
await widget('map', {
  center: [places[0].lon, places[0].lat], zoom: 12,
  markers: places.map(p => ({ lat: p.lat, lon: p.lon, label: p.title }))
});
await widget('cards', { items: places.map(p => ({ title: p.title, body: (p.summary || '').slice(0, 160) })) });
```

### Châteaux de la Loire
```js
const res = await call('search_wikipedia', { query: 'château Loire France', limit: 10 }).catch(() => null);
const hits = (res?.results ?? []);
await widget('cards', { items: hits.map(h => ({ title: h?.title ?? '—', body: (h?.snippet ?? '').replace(/<[^>]+>/g, '') })) });
```

## Common mistakes

- **Not filtering null coords**: many search hits don't have geolocation — `.filter(Boolean)` is mandatory
- **Searching too narrowly**: "Kinkaku-ji" returns 1 result ; "temple Kyoto" returns 12 — use thematic queries
- **Map center hardcoded**: compute mean of returned coords or you'll show an empty area
- **Calling `get_coordinates` and `get_summary` sequentially per hit**: parallelize per-hit, then `Promise.all` across hits
- **Using zoom 16** for a region: tours need zoom 11-13 to fit multiple markers
- **Limit too high (>15)**: too many markers clutter the map ; cap at 8-10
