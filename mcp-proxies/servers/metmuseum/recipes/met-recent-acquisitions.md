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

2. **Fetch and sort by most recent `accessionYear`** (small batch — the Met bridge throttles parallel requests; sort instead of cutoff-filter, then take the top N):
   ```js
   const objs = await Promise.all(ids.slice(0, 12).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const all = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   const withYear = all.filter(w => Number(w?.accessionYear) > 0);
   const recent = [...(withYear.length ? withYear : all)].sort((a, b) => Number(b?.accessionYear || 0) - Number(a?.accessionYear || 0)).slice(0, 12);
   ```

3. **Stats**:
   ```js
   const newest = recent[0]?.accessionYear;
   await widget('stat-card', { label: 'Most recent acquisition', value: Number(newest) || recent.length || 1, icon: 'plus' });
   await widget('stat-card', { label: 'Sample size', value: Math.max(all.length, 1), icon: 'archive' });
   ```

4. **Acquisition timeline**:
   ```js
   const tlItems = [...recent].sort((a, b) => Number(a?.accessionYear || 0) - Number(b?.accessionYear || 0)).map(w => ({ date: w?.accessionYear ?? '—', title: w?.title ?? '(untitled)', image: w?.primaryImageSmall, description: w?.creditLine ?? '—' }));
   await widget('timeline', { items: tlItems.length ? tlItems : [{ date: '—', title: 'No samples returned' }] });
   ```

5. **Cards of new arrivals**:
   ```js
   const cardItems = recent.map(w => ({ title: w?.title ?? '(untitled)', subtitle: `Acquired ${w?.accessionYear ?? '—'}`, image: w?.primaryImageSmall, body: w?.creditLine ?? '—' }));
   await widget('cards', { items: cardItems.length ? cardItems : [{ title: 'No samples', subtitle: '—' }] });
   ```

6. **Gallery**:
   ```js
   const gImages = recent.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: `Acquired ${w?.accessionYear ?? '—'}` }));
   await widget('gallery', { images: gImages.length ? gImages : [{ src: '', alt: 'No samples', caption: '—' }] });
   ```

## Examples

### European Paintings — newest first
```js
const r = await call('search-museum-objects', { q: '*', departmentId: 11, hasImages: true, pageSize: 20 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const all = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const withYear = all.filter(w => Number(w?.accessionYear));
const recent = [...(withYear.length ? withYear : all)].sort((a, b) => Number(b.accessionYear || 0) - Number(a.accessionYear || 0)).slice(0, 10);
const items7 = recent.map(w => ({ title: w?.title ?? '(untitled)', subtitle: `Acquired ${w?.accessionYear ?? '—'}`, image: w?.primaryImageSmall }));
await widget('cards', { items: items7.length ? items7 : [{ title: 'No samples', subtitle: '—' }] });
```

### Highlights — newest first
```js
const r = await call('search-museum-objects', { q: '*', isHighlight: true, hasImages: true, pageSize: 20 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const all = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const withYear = all.filter(w => Number(w?.accessionYear));
const recent = [...(withYear.length ? withYear : all)].sort((a, b) => Number(b.accessionYear || 0) - Number(a.accessionYear || 0)).slice(0, 8);
const items = recent.map(w => ({ date: w?.accessionYear ?? '—', title: w?.title ?? '(untitled)' }));
await widget('timeline', { items: items.length ? items : [{ date: '—', title: 'No samples' }] });
```

## Common mistakes

- **`accessionYear` is a string**: coerce with `Number()` before comparing
- **Missing accession year**: ancient records sometimes lack it — filter `(w => w.accessionYear)` first
- **Cutoff too aggressive**: many small departments have nothing acquired in the last 2 years — bump to 5 or 10
- **Confusing accession with creation date**: `accessionYear` is when the Met acquired, not when the work was made
- **Tiny samples**: most objects in a department weren't acquired in the last 5 years — sample at least 30 records
