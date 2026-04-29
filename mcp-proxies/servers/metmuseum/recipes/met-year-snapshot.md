---
id: met-year-snapshot
name: Planetary snapshot of a single pivotal year
description: Cross-cultural gallery + timeline + cards by continent + contextual KV + stats for a single year
when: the user asks what was created in a specific year (1492, 1789, 1968)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: année pivot
components_used: [gallery, timeline, cards, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stats + kv at top, full-width gallery, timeline + cards at the bottom
---

## When to use

- "Works created in 1789"
- "The Met in 1492"
- "What about 1968 in the collection?"
- "Snapshot of art in 1900"

## How to use

1. **Pin a single year** (`dateBegin == dateEnd`):
   ```js
   const year = 1789;
   const search = await call('search-museum-objects', {
     q: '*',
     dateBegin: year, dateEnd: year,
     hasImages: true,
     pageSize: 40
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) return widget('text', { content: `No objects in ${year}.` });
   ```

2. **Fetch a sample**:
   ```js
   const objs = await Promise.all(ids.slice(0, 20).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   ```

3. **Stats**:
   ```js
   const continents = [...new Set(works.map(w => w?.country).filter(Boolean))];
   await widget('stat-card', { label: `Met objects from ${year}`, value: search?.total ?? works.length, icon: 'calendar' });
   await widget('stat-card', { label: 'Countries represented', value: continents.length, icon: 'globe' });
   ```

4. **Contextual KV** (year significance):
   ```js
   await widget('kv', {
     pairs: [
       ['Year', `${year}`],
       ['Hint', 'French Revolution begins; US Constitution ratified'],
       ['Sample size', works.length],
       ['First object', works[0]?.title ?? '—']
     ]
   });
   ```

5. **Cross-cultural gallery**:
   ```js
   await widget('gallery', {
     images: works.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: `${w?.country || w?.culture || '—'} — ${w?.medium ?? '—'}` }))
   });
   ```

6. **Timeline + cards by continent**:
   ```js
   await widget('timeline', { items: works.map(w => ({ date: w?.objectDate ?? '—', title: w?.title ?? '(untitled)', image: w?.primaryImageSmall })) });
   const byCountry = works.reduce((acc, w) => { const k = w?.country || 'Unknown'; (acc[k] = acc[k] || []).push(w); return acc; }, {});
   await widget('cards', {
     items: Object.entries(byCountry).flatMap(([c, ws]) => ws.slice(0, 1).map(w => ({
       title: c, subtitle: w?.title ?? '(untitled)', image: w?.primaryImageSmall, body: w?.artistDisplayName || w?.culture || '—'
     })))
   });
   ```

## Examples

### Snapshot of 1789
```js
const r = await call('search-museum-objects', { q: '*', dateBegin: 1789, dateEnd: 1789, hasImages: true, pageSize: 30 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 12).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
await widget('gallery', { images: works.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.country ?? '—' })) });
```

### 1968 across cultures
```js
const r = await call('search-museum-objects', { q: '*', dateBegin: 1968, dateEnd: 1968, hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 10).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
await widget('timeline', { items: works.map(w => ({ date: w?.objectDate ?? '—', title: w?.title ?? '(untitled)' })) });
```

## Common mistakes

- **Forgetting to set both `dateBegin` and `dateEnd` to the same year**: single-year filter requires both
- **Too few results**: `total` may be small for very specific years — set `pageSize: 40` and don't expect 100s
- **Negative years**: BCE years work too (`-1500` for 1500 BCE)
- **No country grouping**: a planetary snapshot is meaningless without showing the geography
- **Missing year context**: surface a one-line "what happened that year" KV — that's why the user asks
