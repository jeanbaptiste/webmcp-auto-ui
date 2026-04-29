---
id: met-diaspora-atlas
name: Atlas of artistic diaspora — when nationality differs from creation place
description: Two-layer map (origin vs creation) + diaspora artist cards + flow chart + stats
when: the user asks about artists who worked far from their birthplace (immigrants, exiles, expats)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: diaspora
components_used: [map, cards, chart, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: full-width map at top, cards on a row, chart + stats at the bottom
---

## When to use

- "Immigrant artists at the Met"
- "Works by African-American artists"
- "Modernists who fled Europe"
- "Diaspora artists in the modern department"

## How to use

1. **Search a department known for diasporic artists** (e.g. Modern = 21):
   ```js
   const search = await call('search-museum-objects', {
     q: 'modernism',
     departmentId: 21,
     hasImages: true,
     pageSize: 40
   });
   ```

2. **Fetch and detect diaspora cases** (`artistNationality` ≠ `country`):
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 25).map(id => call('get-museum-object', { objectId: id })));
   const diaspora = objs.map(o => o.object).filter(w =>
     w.artistNationality && w.country &&
     !w.country.toLowerCase().includes(w.artistNationality.toLowerCase().slice(0, 5))
   );
   ```

3. **Two-layer map** (origin and creation point per work):
   ```js
   await widget('map', {
     center: [40, 0], zoom: 2,
     markers: diaspora.flatMap(w => [
       { lat: 0, lon: 0, label: `Origin: ${w.artistNationality}`, popup: w.artistDisplayName },
       { lat: 0, lon: 0, label: `Made in: ${w.country}`, popup: w.title }
     ])
   });
   ```

4. **Cards of diasporic artists**:
   ```js
   await widget('cards', {
     items: diaspora.map(w => ({
       title: w.artistDisplayName,
       subtitle: `${w.artistNationality} → ${w.country}`,
       image: w.primaryImageSmall,
       body: `${w.title} (${w.objectDate})`
     }))
   });
   ```

5. **Chart of most frequent flows**:
   ```js
   const flows = diaspora.reduce((acc, w) => {
     const k = `${w.artistNationality} → ${w.country}`;
     acc[k] = (acc[k] || 0) + 1; return acc;
   }, {});
   await widget('chart', {
     type: 'bar',
     data: Object.entries(flows).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: k, value: v }))
   });
   ```

6. **Stats**:
   ```js
   const ratio = Math.round(diaspora.length / objs.length * 100);
   await widget('stat-card', { label: 'Diaspora cases', value: diaspora.length, icon: 'globe' });
   await widget('stat-card', { label: 'Diaspora ratio', value: `${ratio}%`, icon: 'percent' });
   ```

## Examples

### European modernists in the US
```js
const r = await call('search-museum-objects', { q: 'modernism', departmentId: 21, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 20).map(id => call('get-museum-object', { objectId: id })));
const diaspora = objs.map(o => o.object).filter(w => w.artistNationality !== w.country);
await widget('cards', { items: diaspora.map(w => ({ title: w.artistDisplayName, subtitle: `${w.artistNationality} → ${w.country}` })) });
```

### African-American artists
```js
const r = await call('search-museum-objects', { q: 'African-American', tags: true, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 10).map(id => call('get-museum-object', { objectId: id })));
await widget('chart', { type: 'bar', data: [{ label: 'American (African descent)', value: objs.length }] });
```

## Common mistakes

- **String comparison too strict**: "American" vs "United States" both refer to the US — normalize before comparing
- **Missing nationality field**: many records have `artistNationality` empty — filter explicitly before testing
- **Geocoding both endpoints**: needs a static `country → coords` table; fall back to country centroids
- **No flow direction**: a card "American → French" means born American, working in France — always show the arrow
- **Including anonymous objects**: ancient pieces have no `artistDisplayName` — diaspora analysis only makes sense from 18th-c. onward
