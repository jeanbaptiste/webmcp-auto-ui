---
id: met-gallery-walk
name: Physical walking itinerary through Met galleries
description: Table sorted by gallery number + cards per stop + KV of itinerary + stats
when: the user wants a walking path inside the museum (which gallery for Rembrandt, European tour, etc.)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: parcours IRL
components_used: [table, cards, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stats at top, table on a row, cards + kv at the bottom
---

## When to use

- "Walking tour of the European department"
- "Which gallery has Rembrandt?"
- "Itinerary inside the Met"
- "I'm visiting the Met tomorrow — give me a path"

## How to use

1. **Search on-view objects in a department**:
   ```js
   const search = await call('search-museum-objects', {
     q: 'rembrandt',
     isOnView: true,
     departmentId: 11,
     hasImages: true,
     pageSize: 30
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) return widget('text', { content: 'No on-view objects.' });
   ```

2. **Fetch and keep entries with a `GalleryNumber`**:
   ```js
   const objs = await Promise.all(ids.slice(0, 15).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const stops = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.GalleryNumber).sort((a, b) => Number(a?.GalleryNumber || 0) - Number(b?.GalleryNumber || 0));
   if (stops.length === 0) return widget('text', { content: 'No gallery numbers available.' });
   ```

3. **Stats**:
   ```js
   const galleries = [...new Set(stops.map(s => s?.GalleryNumber).filter(Boolean))];
   await widget('stat-card', { label: 'On-view stops', value: stops.length, icon: 'foot' });
   await widget('stat-card', { label: 'Galleries to visit', value: galleries.length, icon: 'map' });
   await widget('stat-card', { label: 'Estimated time', value: `${galleries.length * 5} min`, icon: 'clock' });
   ```

4. **Itinerary table** (in walking order):
   ```js
   await widget('table', {
     columns: ['Gallery', 'Title', 'Artist', 'Date'],
     rows: stops.map(s => [s?.GalleryNumber ?? '—', s?.title ?? '(untitled)', s?.artistDisplayName || '—', s?.objectDate ?? '—'])
   });
   ```

5. **Cards per stop**:
   ```js
   await widget('cards', {
     items: stops.map(s => ({
       title: `Gallery ${s?.GalleryNumber ?? '—'}`,
       subtitle: s?.title ?? '(untitled)',
       image: s?.primaryImageSmall,
       body: `${s?.artistDisplayName ?? '—'} — ${s?.medium ?? '—'}`
     }))
   });
   ```

6. **KV summary**:
   ```js
   await widget('kv', {
     pairs: [
       ['Department', stops[0]?.department ?? '—'],
       ['Floor', '2 (mostly)'],
       ['Number of stops', stops.length],
       ['First gallery', stops[0]?.GalleryNumber ?? '—'],
       ['Last gallery', stops[stops.length - 1]?.GalleryNumber ?? '—']
     ]
   });
   ```

## Examples

### Rembrandt on view
```js
const r = await call('search-museum-objects', { q: 'rembrandt', isOnView: true, departmentId: 11, hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 10).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const stops = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.GalleryNumber);
await widget('table', { columns: ['Gallery', 'Title'], rows: stops.map(s => [s?.GalleryNumber ?? '—', s?.title ?? '(untitled)']) });
```

### European masterpieces tour
```js
const r = await call('search-museum-objects', { q: 'masterpiece', departmentId: 11, isOnView: true, isHighlight: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 10).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
await widget('cards', { items: works.map(w => ({ title: `Gallery ${w?.GalleryNumber ?? '—'}`, subtitle: w?.title ?? '(untitled)', image: w?.primaryImageSmall })) });
```

## Common mistakes

- **Forgetting `isOnView`**: an itinerary that includes pieces in storage is useless
- **Sorting `GalleryNumber` as string**: "10" comes before "2" alphabetically — always coerce to `Number`
- **Letting null gallery numbers through**: many on-view records still have an empty `GalleryNumber` — filter them out
- **Mixing departments on different floors**: a 2nd-floor + 1st-floor tour is messy — restrict to one department
- **No time estimate**: visitors care about "how long" — surface a rough estimate in the stats (5 min × number of galleries)
