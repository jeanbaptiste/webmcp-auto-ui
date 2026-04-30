---
id: met-recent-acquisitions
name: Recent acquisitions of a Met department
description: Cards of new arrivals + gallery + acquisition timeline + stats over the last 5 years
when: the user asks what's new at the Met or about recent acquisitions
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: actualité musée
components_used: [cards, gallery, timeline, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stats at top, full-width timeline, cards + gallery at the bottom
---

## When to use

- "What did the Met just acquire?"
- "New 2024 works at the museum"
- "Recent acquisitions in the American department"
- "Latest additions to the collection"

## How to use

1. **Search a department broadly**:
   ```js
   const search = await call('search-museum-objects', {
     q: '*',
     departmentId: 11,
     hasImages: true,
     pageSize: 50
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No objects found.' });
   ```

2. **Fetch and filter on `accessionYear`** (last 5 years):
   ```js
   const cutoff = new Date().getFullYear() - 5;
   const objs = await Promise.all(ids.slice(0, 30).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const all = objs.filter(o => o?.object).map(o => o.object);
   const recent = all.filter(w => Number(w?.accessionYear) >= cutoff && w?.primaryImageSmall);
   ```

3. **Stats**:
   ```js
   await widget('stat-card', { label: 'New since ' + cutoff, value: recent.length, icon: 'plus' });
   await widget('stat-card', { label: 'Sample size', value: all.length, icon: 'archive' });
   ```

4. **Acquisition timeline**:
   ```js
   await widget('timeline', {
     items: [...recent].sort((a, b) => Number(a?.accessionYear || 0) - Number(b?.accessionYear || 0)).map(w => ({
       date: w?.accessionYear ?? '—', title: w?.title ?? '(untitled)', image: w?.primaryImageSmall, description: w?.creditLine ?? '—'
     }))
   });
   ```

5. **Cards of new arrivals**:
   ```js
   await widget('cards', {
     items: recent.map(w => ({
       title: w?.title ?? '(untitled)', subtitle: `Acquired ${w?.accessionYear ?? '—'}`,
       image: w?.primaryImageSmall, body: w?.creditLine ?? '—'
     }))
   });
   ```

6. **Gallery**:
   ```js
   await widget('gallery', { images: recent.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: `Acquired ${w?.accessionYear ?? '—'}` })) });
   ```

## Examples

### American department, last 5 years
```js
const r = await call('search-museum-objects', { q: '*', departmentId: 11, hasImages: true, pageSize: 40 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 25).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const recent = objs.filter(o => o?.object).map(o => o.object).filter(w => Number(w?.accessionYear) >= 2020);
await widget('cards', { items: recent.map(w => ({ title: w?.title ?? '(untitled)', subtitle: `Acquired ${w?.accessionYear ?? '—'}`, image: w?.primaryImageSmall })) });
```

### Brand-new highlights
```js
const r = await call('search-museum-objects', { q: '*', isHighlight: true, hasImages: true, pageSize: 40 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 20).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const recent = objs.filter(o => o?.object).map(o => o.object).filter(w => Number(w?.accessionYear) >= 2022);
await widget('timeline', { items: recent.map(w => ({ date: w?.accessionYear ?? '—', title: w?.title ?? '(untitled)' })) });
```

## Common mistakes

- **`accessionYear` is a string**: coerce with `Number()` before comparing
- **Missing accession year**: ancient records sometimes lack it — filter `(w => w.accessionYear)` first
- **Cutoff too aggressive**: many small departments have nothing acquired in the last 2 years — bump to 5 or 10
- **Confusing accession with creation date**: `accessionYear` is when the Met acquired, not when the work was made
- **Tiny samples**: most objects in a department weren't acquired in the last 5 years — sample at least 30 records
