---
id: met-cultural-origins-map
name: Map the geographic origins of objects in a Met department
description: World map of creation places + gallery + recap table + stats for a department or theme
when: the user asks where objects come from geographically (African masks, pre-Columbian pottery, Chinese bronzes)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: géographique
components_used: [map, gallery, table, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: full-width map at top, gallery + table below, stats on a row
---

## When to use

- "Where do the African objects at the Met come from?"
- "Map of pre-Columbian pottery origins"
- "Geographic origins of Chinese bronzes"
- "Where were Met Islamic-art objects made?"

## How to use

1. **Search a department** that lends itself to geography:
   ```js
   const search = await call('search-museum-objects', { q: 'mask', departmentId: 5, hasImages: true, pageSize: 40 }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No objects found.' });
   ```

2. **Fetch details** to access `country`, `region`, `city`:
   ```js
   const details = await Promise.all(
     ids.slice(0, 15).map(id => call('get-museum-object', { objectId: id }).catch(() => null))
   );
   const works = details.filter(d => d?.object).map(d => d.object).filter(o => o?.country || o?.region);
   ```

3. **Geocode** country/city pairs (use a static lookup or the `geoLocation` field):
   ```js
   const COUNTRY_COORDS = {
     'Nigeria': { lat: 9.07, lon: 7.48 }, 'Mali': { lat: 12.65, lon: -8.0 },
     'Egypt': { lat: 30.04, lon: 31.24 }, 'China': { lat: 39.9, lon: 116.4 },
     'Japan': { lat: 35.68, lon: 139.69 }, 'India': { lat: 28.61, lon: 77.21 },
     'Iran': { lat: 35.69, lon: 51.39 }, 'Turkey': { lat: 39.93, lon: 32.86 },
     'Italy': { lat: 41.9, lon: 12.5 }, 'France': { lat: 48.85, lon: 2.35 },
     'Greece': { lat: 37.98, lon: 23.73 }, 'Mexico': { lat: 19.43, lon: -99.13 },
     'Peru': { lat: -12.05, lon: -77.04 }
   };
   const lookupCoords = (country) => COUNTRY_COORDS[country] || null;
   const geocoded = works.map(w => ({
     ...w,
     coords: lookupCoords(w?.country)
   })).filter(w => w?.coords);
   ```

4. **Map of origins**:
   ```js
   await widget('map', {
     center: [0, 20],
     zoom: 2,
     markers: geocoded.map(w => ({
       lat: w?.coords?.lat,
       lon: w?.coords?.lon,
       label: w?.title ?? '(untitled)',
       popup: `${w?.title ?? '(untitled)'} — ${w?.culture || w?.country || '—'}`
     }))
   });
   ```

5. **Gallery + summary table**:
   ```js
   await widget('gallery', { images: works.filter(w => w?.primaryImageSmall).map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.country ?? '—' })) });
   await widget('table', {
     columns: ['Title', 'Country', 'Culture', 'Medium'],
     rows: works.map(w => [w?.title ?? '(untitled)', w?.country || '—', w?.culture || '—', w?.medium ?? '—'])
   });
   ```

6. **Stats**:
   ```js
   const countries = [...new Set(works.map(w => w?.country).filter(Boolean))];
   await widget('stat-card', { label: 'Objects mapped', value: geocoded.length, icon: 'map-pin' });
   await widget('stat-card', { label: 'Countries', value: countries.length, icon: 'globe' });
   ```

## Examples

### African masks
```js
const r = await call('search-museum-objects', { q: 'mask', departmentId: 5, hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 12).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
await widget('map', { zoom: 3, center: [0, 20], markers: works.filter(w => w?.country).map(w => ({ lat: 0, lon: 20, label: w?.title ?? '(untitled)' })) });
```

### Pre-Columbian pottery
```js
const r = await call('search-museum-objects', { q: 'pottery', departmentId: 5, geoLocation: 'Mexico', hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 10).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
await widget('table', { columns: ['Title', 'Region', 'Culture'], rows: works.map(w => [w?.title ?? '(untitled)', w?.region ?? '—', w?.culture ?? '—']) });
```

## Common mistakes

- **No fallback geocoding**: the API returns text fields, not coordinates — keep a static `country → lat/lon` table on hand
- **Missing geographic data**: not every object carries `country`/`region` — filter `(o => o.country || o.region)` after fetching
- **Conflating `geographyType`**: "Made in" vs "From" can differ (provenance vs creation) — show the type next to the country
- **One marker per object on dense maps**: cluster or group by country when over 30 markers
- **Forgetting the culture column**: country alone hides the people who made the object — always show `culture` too
