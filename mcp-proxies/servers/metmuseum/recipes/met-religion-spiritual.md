---
id: met-religion-spiritual
name: Cross-departmental view of a religion or spiritual tradition
description: Iconic gallery + per-school cards + map of production centers + KV of recurring symbols
when: the user asks for art related to a religion or spiritual tradition (Buddhism, Christianity, Islam, Hinduism)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: religieux
components_used: [gallery, cards, map, kv]
layout:
  type: grid
  columns: 2
  arrangement: full-width gallery at top, map on a row, cards + kv at the bottom
---

## When to use

- "Buddhist art at the Met"
- "Medieval Christian iconography"
- "Sacred Islamic art"
- "Hindu sculptures"

## How to use

1. **Search the religion across departments**:
   ```js
   const search = await call('search-museum-objects', {
     q: 'Buddha',
     hasImages: true,
     pageSize: 30
   });
   ```

2. **Fetch a wide sample**:
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 18).map(id => call('get-museum-object', { objectId: id })));
   const works = objs.map(o => o.object).filter(w => w.primaryImageSmall);
   ```

3. **Iconic gallery** (visual catechism):
   ```js
   await widget('gallery', {
     images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: `${w.culture || w.country} — ${w.objectDate}` }))
   });
   ```

4. **Cards per school/tradition** (grouped by culture):
   ```js
   const bySchool = works.reduce((acc, w) => { (acc[w.culture || w.department] = acc[w.culture || w.department] || []).push(w); return acc; }, {});
   await widget('cards', {
     items: Object.entries(bySchool).flatMap(([school, ws]) => ws.slice(0, 2).map(w => ({
       title: w.title, subtitle: school, image: w.primaryImageSmall, body: w.medium
     })))
   });
   ```

5. **Map of production centers**:
   ```js
   const places = works.filter(w => w.country).map(w => ({
     lat: 0, lon: 0,
     label: w.city || w.country,
     popup: `${w.title} (${w.culture})`
   }));
   await widget('map', { center: [25, 80], zoom: 3, markers: places });
   ```

6. **KV of recurring symbols** (from tags):
   ```js
   const tags = {};
   for (const w of works) for (const t of (w.tags || [])) tags[t.term] = (tags[t.term] || 0) + 1;
   const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 6);
   await widget('kv', { pairs: top.map(([t, n]) => [t, `${n} occurrences`]) });
   ```

## Examples

### Buddhist art
```js
const r = await call('search-museum-objects', { q: 'Buddha', departmentId: 6, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 12).map(id => call('get-museum-object', { objectId: id })));
const works = objs.map(o => o.object);
await widget('gallery', { images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: w.culture })) });
```

### Islamic sacred art
```js
const r = await call('search-museum-objects', { q: 'Quran calligraphy', departmentId: 14, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 10).map(id => call('get-museum-object', { objectId: id })));
await widget('cards', { items: objs.map(o => ({ title: o.object.title, subtitle: o.object.culture, image: o.object.primaryImageSmall })) });
```

## Common mistakes

- **Restricting to one department**: religions cross-cut Asian/Medieval/Islamic — never set `departmentId` unless intentional
- **Too generic `q`**: "religion" matches everything — use specific deities or terms ("Buddha", "Christ", "Krishna", "Quran")
- **Map without geocoding**: keep a static `country → coords` table; don't pretend to geocode dynamically
- **Symbol noise**: religious tags include generic "Animals" — filter for spiritually meaningful terms
- **Missing tags**: not all religious objects have AAT tags — fall back to culture/department for grouping
