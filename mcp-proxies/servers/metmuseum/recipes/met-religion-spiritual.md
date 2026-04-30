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
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No matches.' });
   ```

2. **Fetch a wide sample**:
   ```js
   const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   ```

3. **Iconic gallery** (visual catechism):
   ```js
   const images = works.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: `${w?.culture || w?.country || '—'} — ${w?.objectDate ?? '—'}` }));
   await widget('gallery', { images: images.length ? images : [{ src: '', alt: 'No samples', caption: '—' }] });
   ```

4. **Cards per school/tradition** (grouped by culture):
   ```js
   const bySchool = works.reduce((acc, w) => { const k = w?.culture || w?.department || '—'; (acc[k] = acc[k] || []).push(w); return acc; }, {});
   const items = Object.entries(bySchool).flatMap(([school, ws]) => ws.slice(0, 2).map(w => ({ title: w?.title ?? '(untitled)', subtitle: school, image: w?.primaryImageSmall, body: w?.medium ?? '—' })));
   await widget('cards', { items: items.length ? items : [{ title: 'No samples', subtitle: '—' }] });
   ```

5. **Map of production centers** (the Met API rarely populates `country` — geocode by `culture` instead):
   ```js
   const CULTURE_COORDS = { 'China': [39.9, 116.4], 'Japan': [35.7, 139.7], 'India': [28.6, 77.2], 'Tibet': [29.65, 91.13], 'Cambodia': [11.55, 104.92], 'Thailand': [13.75, 100.5], 'Korea': [37.57, 126.97] };
   const places = works.map(w => {
     const key = Object.keys(CULTURE_COORDS).find(k => (w?.culture || '').includes(k) || (w?.country || '').includes(k));
     const c = key ? CULTURE_COORDS[key] : [25, 80];
     return { lat: c[0], lon: c[1], label: w?.culture || w?.country || '—', popup: `${w?.title ?? '(untitled)'} (${w?.culture ?? '—'})` };
   });
   await widget('map', { center: [25, 80], zoom: 3, markers: places.length ? places : [{ lat: 25, lon: 80, label: 'No samples', popup: '—' }] });
   ```

6. **KV of recurring symbols** (from tags):
   ```js
   const tags = {};
   for (const w of works) for (const t of (w?.tags ?? [])) { const tg = t?.term; if (tg) tags[tg] = (tags[tg] || 0) + 1; }
   const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 6);
   await widget('kv', { pairs: top.map(([t, n]) => [t, `${n} occurrences`]) });
   ```

## Examples

### Buddhist art
```js
const r = await call('search-museum-objects', { q: 'Buddha', departmentId: 6, hasImages: true, pageSize: 20 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const images = works.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.culture ?? '—' }));
await widget('gallery', { images: images.length ? images : [{ src: '', alt: 'No samples', caption: '—' }] });
```

### Islamic sacred art
```js
const r = await call('search-museum-objects', { q: 'calligraphy', departmentId: 14, hasImages: true, pageSize: 20 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const items = works.map(w => ({ title: w?.title ?? '(untitled)', subtitle: w?.culture ?? '—', image: w?.primaryImageSmall }));
await widget('cards', { items: items.length ? items : [{ title: 'No samples', subtitle: '—' }] });
```

## Common mistakes

- **Restricting to one department**: religions cross-cut Asian/Medieval/Islamic — never set `departmentId` unless intentional
- **Too generic `q`**: "religion" matches everything — use specific deities or terms ("Buddha", "Christ", "Krishna", "Quran")
- **Map without geocoding**: keep a static `country → coords` table; don't pretend to geocode dynamically
- **Symbol noise**: religious tags include generic "Animals" — filter for spiritually meaningful terms
- **Missing tags**: not all religious objects have AAT tags — fall back to culture/department for grouping
