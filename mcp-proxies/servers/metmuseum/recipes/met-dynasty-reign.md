---
id: met-dynasty-reign
name: Explore objects under a specific dynasty or reign
description: Timeline + dated gallery + KV of adjacent dynasties + medium chart for a political-historical period
when: the user asks for art under a dynasty (Ming, Edo, Tang, Qajar, Tudor) or a monarch's reign
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: dynastique
components_used: [timeline, gallery, kv, chart]
layout:
  type: grid
  columns: 2
  arrangement: timeline at top, gallery on a row, kv + chart at the bottom
---

## When to use

- "Art during the Ming dynasty"
- "Works from Akhenaten's reign"
- "Tudor period at the Met"
- "Edo dynasty objects"

## How to use

1. **Search with the dynasty's date range** (`dynasty` is text-only, not a search filter):
   ```js
   const search = await call('search-museum-objects', {
     q: 'porcelain',
     dateBegin: 1368,
     dateEnd: 1644,
     hasImages: true,
     pageSize: 40
   });
   ```

2. **Fetch and post-filter on `dynasty`**:
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 20).map(id => call('get-museum-object', { objectId: id })));
   const works = objs.map(o => o.object).filter(w => (w.dynasty || '').includes('Ming'));
   ```

3. **Timeline within the dynasty**:
   ```js
   await widget('timeline', {
     items: works.sort((a, b) => (a.objectBeginDate || 0) - (b.objectBeginDate || 0)).map(w => ({
       date: w.objectDate, title: w.title, image: w.primaryImageSmall, description: w.medium
     }))
   });
   ```

4. **Gallery**:
   ```js
   await widget('gallery', { images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: w.reign || w.dynasty })) });
   ```

5. **KV of adjacent dynasties** (context):
   ```js
   await widget('kv', {
     pairs: [
       ['Previous', 'Yuan (1271-1368)'],
       ['Current', 'Ming (1368-1644)'],
       ['Next', 'Qing (1644-1912)'],
       ['Objects sampled', works.length]
     ]
   });
   ```

6. **Chart of media under the dynasty**:
   ```js
   const byMedium = works.reduce((acc, w) => { acc[w.medium] = (acc[w.medium] || 0) + 1; return acc; }, {});
   await widget('chart', { type: 'bar', data: Object.entries(byMedium).map(([k, v]) => ({ label: k, value: v })) });
   ```

## Examples

### Ming porcelain
```js
const r = await call('search-museum-objects', { q: 'porcelain', dateBegin: 1368, dateEnd: 1644, hasImages: true, pageSize: 40 });
const objs = await Promise.all(r.objectIDs.slice(0, 15).map(id => call('get-museum-object', { objectId: id })));
const ming = objs.map(o => o.object).filter(w => (w.dynasty || '').includes('Ming'));
await widget('timeline', { items: ming.map(w => ({ date: w.objectDate, title: w.title, image: w.primaryImageSmall })) });
```

### Reign of Akhenaten
```js
const r = await call('search-museum-objects', { q: 'Akhenaten', dateBegin: -1353, dateEnd: -1336, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 8).map(id => call('get-museum-object', { objectId: id })));
const works = objs.map(o => o.object).filter(w => (w.reign || '').includes('Akhenaten'));
await widget('gallery', { images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: w.reign })) });
```

## Common mistakes

- **Using `q: "Ming"` alone**: matches anything mentioning Ming in the title or text, not the dynasty field — pair with a date range
- **Forgetting post-filter**: a date range over 1368-1644 returns Korean and European objects too — filter `dynasty.includes(name)` after the fetch
- **Trusting `reign` to be filled**: only Egyptian/Asian objects systematically have `reign` — fall back to `dynasty` when missing
- **Tiny sample**: dynasties cover 200+ years — sample at least 20 objects to find dynasty-tagged ones
- **Mixing dynasty and reign**: a reign is shorter than a dynasty — pick one axis and stay on it for the timeline
