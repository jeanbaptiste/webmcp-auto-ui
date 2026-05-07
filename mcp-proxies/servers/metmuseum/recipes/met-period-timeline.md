---
id: met-period-timeline
name: Build a chronological timeline of artworks for a given period
description: Timeline + chart of objects by century + illustrated gallery for an art-historical period
when: the user asks about an art-historical period (Egyptian New Kingdom, Italian Renaissance, Tang dynasty)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: chronologique
components_used: [timeline, gallery, chart, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: timeline at top, chart + stats on a row, full-width gallery at the bottom
---

## When to use

- "Egyptian art from the New Kingdom"
- "Italian Renaissance at the Met"
- "Tang dynasty objects"
- "Art from 1500 to 1600 in Europe"
- "Edo period prints"

## How to use

1. **Search with a date range** (`dateBegin`/`dateEnd` are required together) plus a department for relevance:
   ```js
   const search = await call('search-museum-objects', {
     q: 'painting',
     departmentId: 11,
     dateBegin: 1400,
     dateEnd: 1700,
     hasImages: true,
     pageSize: 40
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No objects in this period.' });
   ```

2. **Fetch a representative sample** (small batch — Met bridge throttles parallel requests):
   ```js
   const sampled = ids.slice(0, 8);
   const details = await Promise.all(sampled.map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = details.filter(d => d?.object).map(d => d.object).filter(o => o?.primaryImageSmall);
   ```

3. **Timeline** sorted by `objectBeginDate`:
   ```js
   const timelineEvents = [...works].sort((a, b) => (a?.objectBeginDate || 0) - (b?.objectBeginDate || 0)).map(w => ({ date: w?.objectDate ?? '—', title: w?.title ?? '(untitled)', description: w?.medium ?? '—' }));
   await widget('timeline', { events: timelineEvents.length ? timelineEvents : [{ date: '—', title: 'No samples returned', description: '—' }] });
   ```

4. **Distribution by century** in a chart:
   ```js
   const buckets = {};
   for (const w of works) { const century = Math.floor((w?.objectBeginDate || 0) / 100) * 100; buckets[century] = (buckets[century] || 0) + 1; }
   const chartBars = Object.entries(buckets).map(([k, v]) => [String(k), Number(v)]);
   await widget('chart', { bars: chartBars.length ? chartBars : [['sampled', Number(works.length) || 1]] });
   ```

5. **Stats** (span covered, cultures represented):
   ```js
   const cultures = [...new Set(works.map(w => w?.culture).filter(Boolean))];
   await widget('stat-card', { label: 'Objects sampled', value: Math.max(works.length, 1), icon: 'archive' });
   await widget('stat-card', { label: 'Cultures', value: Math.max(cultures.length, 1), icon: 'globe' });
   ```

6. **Illustrated gallery**:
   ```js
   await widget('gallery', {
     images: works.length ? works.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.objectDate ?? '—' })) : [{ src: '', alt: 'No samples', caption: '—' }]
   });
   ```

## Examples

### Italian Renaissance (1400-1600)
```js
const r = await call('search-museum-objects', { q: 'Italy', departmentId: 11, dateBegin: 1400, dateEnd: 1600, hasImages: true, pageSize: 40 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const events = works.map(w => ({ date: w?.objectDate ?? '—', title: w?.title ?? '(untitled)' }));
await widget('timeline', { events: events.length ? events : [{ date: '—', title: 'No samples' }] });
```

### Tang dynasty
```js
const r = await call('search-museum-objects', { q: 'Tang dynasty', departmentId: 6, hasImages: true, pageSize: 40 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const images = works.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.objectDate ?? '—' }));
await widget('gallery', { images: images.length ? images : [{ src: '', alt: 'No samples', caption: '—' }] });
```

## Common mistakes

- **`dateBegin` without `dateEnd`** (or vice-versa): the API silently ignores the filter — always pass both
- **Negative dates for BCE**: BCE years are negative integers — `dateBegin: -1550` for 1550 BCE
- **Skipping `departmentId`**: a date-only query mixes Greek pottery with European paintings — always pair the period with a department
- **Sorting on `objectDate` (string)**: dates like "ca. 1550" don't sort numerically — always use `objectBeginDate`
- **Tiny sample on a wide range**: 5 works over 500 years is meaningless — bump `pageSize` and detail at least 10-12
