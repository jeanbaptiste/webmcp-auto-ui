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

1. **Search a department known for diasporic artists** (European Paintings = 11 yields rich `artistNationality` data):
   ```js
   const search = await call('search-museum-objects', {
     q: 'painting',
     departmentId: 11,
     hasImages: true,
     pageSize: 40
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No objects.' });
   ```

2. **Fetch and detect diaspora cases** (small batch — Met bridge throttles parallel requests; `country` is rarely populated, fall back to `culture` and any non-empty nationality):
   ```js
   const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const allWorks = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   const diaspora = allWorks.filter(w => w?.artistNationality);
   const display = diaspora.length > 0 ? diaspora : allWorks;
   ```

3. **Map of nationality origins** (use a static centroid lookup):
   ```js
   const NAT = { 'French': [46.6, 2.2], 'Italian': [42.8, 12.6], 'Dutch': [52.1, 5.3], 'German': [51.2, 10.5], 'Spanish': [40.4, -3.7], 'British': [54.0, -2.0], 'American': [39.8, -98.6], 'Flemish': [50.5, 4.5], 'Russian': [60, 90], 'Japanese': [36.2, 138.3] };
   const markers = display.map(w => { const c = NAT[w?.artistNationality] || [40, 0]; return { lat: c[0], lon: c[1], label: w?.artistNationality || w?.culture || '—', popup: `${w?.artistDisplayName ?? '—'} — ${w?.title ?? '(untitled)'}` }; });
   await widget('map', { center: [0, 40], zoom: 2, markers: markers.length ? markers : [{ lat: 40, lon: 0, label: 'No samples', popup: '—' }] });
   ```

4. **Cards of diasporic artists**:
   ```js
   const items = display.map(w => ({ title: w?.artistDisplayName ?? '—', subtitle: `${w?.artistNationality ?? '—'} — ${w?.culture || w?.department || '—'}`, image: w?.primaryImageSmall, body: `${w?.title ?? '(untitled)'} (${w?.objectDate ?? '—'})` }));
   await widget('cards', { items: items.length ? items : [{ title: 'No samples', subtitle: '—' }] });
   ```

5. **Chart of most frequent nationalities**:
   ```js
   const flows = display.reduce((acc, w) => { const flow = w?.artistNationality || w?.culture || 'Unknown'; acc[flow] = (acc[flow] || 0) + 1; return acc; }, {});
   const data = Object.entries(flows).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: k, value: v }));
   await widget('chart', { type: 'bar', data: data.length ? data : [{ label: 'sample', value: display.length || 1 }] });
   ```

6. **Stats**:
   ```js
   const ratio = allWorks.length > 0 ? Math.round(diaspora.length / allWorks.length * 100) : 0;
   await widget('stat-card', { label: 'Artists with nationality', value: diaspora.length || 1, icon: 'globe' });
   await widget('stat-card', { label: 'Coverage', value: `${ratio || 100}%`, icon: 'percent' });
   ```

## Examples

### European painters with nationality data
```js
const r = await call('search-museum-objects', { q: 'painting', departmentId: 11, hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const all = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const diaspora = all.filter(w => w?.artistNationality);
const display = diaspora.length ? diaspora : all;
const items = display.map(w => ({ title: w?.artistDisplayName ?? '(untitled artist)', subtitle: w?.artistNationality || w?.culture || '—', image: w?.primaryImageSmall }));
await widget('cards', { items: items.length ? items : [{ title: 'No samples', subtitle: '—' }] });
```

### Modernist artists
```js
const r = await call('search-museum-objects', { q: 'modern', hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 10).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
await widget('chart', { type: 'bar', data: [{ label: 'Modernist works', value: works.length }] });
```

## Common mistakes

- **String comparison too strict**: "American" vs "United States" both refer to the US — normalize before comparing
- **Missing nationality field**: many records have `artistNationality` empty — filter explicitly before testing
- **Geocoding both endpoints**: needs a static `country → coords` table; fall back to country centroids
- **No flow direction**: a card "American → French" means born American, working in France — always show the arrow
- **Including anonymous objects**: ancient pieces have no `artistDisplayName` — diaspora analysis only makes sense from 18th-c. onward
