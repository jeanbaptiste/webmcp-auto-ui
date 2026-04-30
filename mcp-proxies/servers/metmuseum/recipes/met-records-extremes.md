---
id: met-records-extremes
name: Records and extremes of the Met collection
description: Top-5 cards (largest, smallest, oldest, newest, heaviest) + KV + distribution chart + global stats
when: the user asks about superlatives (biggest, oldest, heaviest object at the Met)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: records / superlatifs
components_used: [cards, kv, chart, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stats at top, cards on a row, chart + kv at the bottom
---

## When to use

- "Biggest object at the Met"
- "Oldest piece in the collection"
- "Heaviest sculpture"
- "Met's superlatives"

## How to use

1. **Search a relevant universe** (e.g. sculptures with measurements):
   ```js
   const search = await call('search-museum-objects', {
     q: 'sculpture',
     departmentId: 13,
     hasImages: true,
     pageSize: 60
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No objects.' });
   ```

2. **Fetch a wide sample** (you need numbers):
   ```js
   const objs = await Promise.all(ids.slice(0, 25).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.measurements && w?.primaryImageSmall);
   if (works.length === 0) await widget('text', { content: 'No measurements available.' });
   ```

3. **Compute extremes** from `measurements[].elementMeasurements`:
   ```js
   const sizeOf = w => { const elt = w?.measurements?.[0]?.elementMeasurements; if (!elt) return 0; const nums = Object.values(elt).filter(Number.isFinite); return nums.length > 0 ? Math.max(...nums) : 0; };
   const records = {
     largest: [...works].sort((a, b) => sizeOf(b) - sizeOf(a))[0],
     smallest: [...works].sort((a, b) => sizeOf(a) - sizeOf(b))[0],
     oldest: [...works].sort((a, b) => (a?.objectBeginDate || 0) - (b?.objectBeginDate || 0))[0],
     newest: [...works].sort((a, b) => (b?.objectBeginDate || 0) - (a?.objectBeginDate || 0))[0]
   };
   ```

4. **Top-5 cards**:
   ```js
   await widget('cards', {
     items: Object.entries(records).filter(([_, w]) => w).map(([label, w]) => ({
       title: label.toUpperCase(), subtitle: w?.title ?? '(untitled)', image: w?.primaryImageSmall, body: w?.dimensions ?? '—'
     }))
   });
   ```

5. **KV of precise figures**:
   ```js
   await widget('kv', {
     pairs: [
       ['Largest', `${records.largest?.title ?? '—'} — ${records.largest?.dimensions ?? '—'}`],
       ['Smallest', `${records.smallest?.title ?? '—'} — ${records.smallest?.dimensions ?? '—'}`],
       ['Oldest', `${records.oldest?.title ?? '—'} — ${records.oldest?.objectDate ?? '—'}`],
       ['Newest', `${records.newest?.title ?? '—'} — ${records.newest?.objectDate ?? '—'}`]
     ]
   });
   ```

6. **Distribution chart** (size in cm):
   ```js
   await widget('chart', {
     type: 'bar',
     data: works.slice(0, 10).map(w => ({ label: (w?.title ?? '').slice(0, 20), value: sizeOf(w) }))
   });
   await widget('stat-card', { label: 'Sample size', value: works.length, icon: 'archive' });
   ```

## Examples

### Biggest sculptures
```js
const r = await call('search-museum-objects', { q: 'sculpture', departmentId: 13, hasImages: true, pageSize: 40 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 20).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.measurements);
if (works.length === 0) await widget('text', { content: 'No measurements available.' });
const big = [...works].sort((a, b) => (b?.measurements?.[0]?.elementMeasurements?.Height || 0) - (a?.measurements?.[0]?.elementMeasurements?.Height || 0))[0];
await widget('cards', { items: [{ title: 'TALLEST', subtitle: big?.title ?? '(untitled)', image: big?.primaryImageSmall, body: big?.dimensions ?? '—' }] });
```

### Oldest object
```js
const r = await call('search-museum-objects', { q: '*', departmentId: 10, hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 20).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
if (works.length === 0) await widget('text', { content: 'No objects.' });
const oldest = [...works].sort((a, b) => (a?.objectBeginDate || 0) - (b?.objectBeginDate || 0))[0];
await widget('kv', { pairs: [['Oldest', `${oldest?.title ?? '—'} (${oldest?.objectDate ?? '—'})`]] });
```

## Examples — common mistakes

## Common mistakes

- **`measurements` can be null**: many records lack it — always check before calling `Object.values`
- **Multiple measurement elements**: pick the right `elementName` (Height/Width/Diameter/Weight) instead of the first one
- **String vs number**: `objectBeginDate` is numeric, `accessionYear` is a string — handle both
- **Tiny extremes**: with 10 records the "biggest" isn't really meaningful — sample 25+
- **Mixing units**: dimensions are in cm but weights in kg — never compare directly
